import { randomUUID } from 'node:crypto';
import { runLlmTask } from '@/lib/ai/providerRouter';
import { appendEpistemicEvent } from '@/lib/events/eventStore';

export const SFI_UNIVERSAL_AI_SYNTHESIS_CONTRACT = 'SFI-UNIVERSAL-AI-SYNTHESIS-1.2' as const;

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function strings(value: unknown, max = 8) {
  return Array.isArray(value)
    ? value.map((item) => typeof item === 'string' ? item.trim() : '').filter(Boolean).slice(0, max)
    : [];
}
function clamp01(value: unknown, fallback = 0.5) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed)) : fallback;
}
function stripFence(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}
function compact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length > 1200 ? `${value.slice(0, 1200)}…[truncated]` : value;
  if (depth >= 4) return '[depth_limit]';
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => compact(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Row).slice(0, 30).map(([key, item]) => [key, compact(item, depth + 1)]));
  }
  return String(value).slice(0, 200);
}

function materialCapsule(signalValue: unknown) {
  const signal = row(signalValue);
  const extracted = row(signal.extracted);
  const measurements = row(extracted.measurements);
  const epistemicPartition = row(extracted.epistemicPartition);
  const provenance = row(signal.provenance);
  const fallbackMeasurements = {
    schema: extracted.schema ?? extracted.fields ?? extracted.columns ?? extracted.headers ?? null,
    rowCount: extracted.rowCount ?? extracted.recordCount ?? extracted.totalRows ?? null,
    analyzableRowCount: extracted.analyzableRowCount ?? null,
    malformedRows: extracted.malformedRows ?? null,
    sheetCount: extracted.sheetCount ?? null,
  };
  return {
    identity: {
      kind: signal.kind ?? null,
      name: signal.name ?? null,
      mimeType: signal.mimeType ?? null,
      objectHash: signal.objectHash ?? signal.contentHash ?? signal.fingerprint ?? null,
      assetRef: signal.assetRef ?? null,
      sourceUrl: signal.sourceUrl ?? null,
    },
    provenance: {
      hydratedFromEventId: provenance.hydratedFromEventId ?? null,
      hydratedFromCycleId: provenance.hydratedFromCycleId ?? null,
      observationRef: provenance.observationRef ?? null,
      caseId: provenance.caseId ?? null,
    },
    measurements: Object.keys(measurements).length ? measurements : fallbackMeasurements,
    epistemicPartition: Object.keys(epistemicPartition).length ? epistemicPartition : null,
    unresolved: extracted.unresolved ?? null,
    materialLimitations: extracted.measurementLimitations ?? measurements.measurementLimitations ?? null,
  };
}

export type SfiUniversalAiPrediction = {
  id: string;
  description: string;
  confidence: number;
  expectedSignals: string[];
  contradictionSignals: string[];
  observationWindow: string | null;
};

export type SfiUniversalEvidenceAssessment = {
  declared: string[];
  observed: string[];
  derived: string[];
  externalSourceClaims: string[];
  unresolved: string[];
};

export type SfiUniversalFrictionFinding = {
  dimension: string;
  finding: string;
  basis: string[];
  evidenceRefs: string[];
  confidence: number;
};

export type SfiUniversalAiSynthesis = {
  contract: typeof SFI_UNIVERSAL_AI_SYNTHESIS_CONTRACT;
  status: 'COMPLETE' | 'DEGRADED';
  summary: string | null;
  evidenceAssessment: SfiUniversalEvidenceAssessment;
  frictionAnalysis: SfiUniversalFrictionFinding[];
  primaryHypothesis: string | null;
  rivalHypotheses: string[];
  predictions: SfiUniversalAiPrediction[];
  missingEvidence: string[];
  confidence: number | null;
  provider: string | null;
  model: string | null;
  warnings: string[];
  eventId: string | null;
};

function emptyEvidenceAssessment(): SfiUniversalEvidenceAssessment {
  return { declared: [], observed: [], derived: [], externalSourceClaims: [], unresolved: [] };
}

function parseSynthesis(value: string) {
  try {
    const parsed = row(JSON.parse(stripFence(value)));
    const primaryHypothesis = text(parsed.primaryHypothesis);
    const rivals = strings(parsed.rivalHypotheses, 5);
    const assessment = row(parsed.evidenceAssessment);
    const evidenceAssessment: SfiUniversalEvidenceAssessment = {
      declared: strings(assessment.declared, 10),
      observed: strings(assessment.observed, 12),
      derived: strings(assessment.derived, 12),
      externalSourceClaims: strings(assessment.externalSourceClaims, 10),
      unresolved: strings(assessment.unresolved, 12),
    };
    const frictionAnalysis: SfiUniversalFrictionFinding[] = Array.isArray(parsed.frictionAnalysis)
      ? parsed.frictionAnalysis.slice(0, 8).flatMap((item) => {
          const finding = row(item);
          const dimension = text(finding.dimension);
          const description = text(finding.finding);
          if (!dimension || !description) return [];
          return [{
            dimension,
            finding: description,
            basis: strings(finding.basis, 8),
            evidenceRefs: strings(finding.evidenceRefs, 8),
            confidence: clamp01(finding.confidence, 0.5),
          }];
        })
      : [];
    const predictions = Array.isArray(parsed.predictions)
      ? parsed.predictions.slice(0, 5).flatMap((item) => {
          const prediction = row(item);
          const description = text(prediction.description);
          if (!description) return [];
          return [{
            id: randomUUID(),
            description,
            confidence: clamp01(prediction.confidence, 0.5),
            expectedSignals: strings(prediction.expectedSignals, 6),
            contradictionSignals: strings(prediction.contradictionSignals, 6),
            observationWindow: text(prediction.observationWindow),
          }];
        })
      : [];
    return {
      summary: text(parsed.summary),
      evidenceAssessment,
      frictionAnalysis,
      primaryHypothesis,
      rivalHypotheses: rivals,
      predictions,
      missingEvidence: strings(parsed.missingEvidence, 12),
      confidence: parsed.confidence === null || parsed.confidence === undefined ? null : clamp01(parsed.confidence, 0.5),
    };
  } catch {
    return null;
  }
}

export async function synthesizeUniversalCycleWithAi(input: {
  cycleId: string;
  actorId: string;
  tenantId: string;
  question?: string | null;
  objective?: string | null;
  caseClass?: string | null;
  signal: unknown;
  deterministicOutputs: unknown;
  runtimeMetadata?: unknown;
  lineageRefs?: string[];
}) : Promise<SfiUniversalAiSynthesis> {
  const system = [
    'You are the System Friction Institute synthesis layer after deterministic observation and governed cognitive agents.',
    'Evidence before inference. Never invent measurements, rows, sources, causal relations, interventions, returns, dates or lineage.',
    'Keep DECLARED, OBSERVED, DERIVED, SOURCE_CLAIM and INFERRED material separate. A user/operator declaration is not evidence merely because it was supplied.',
    'Directly fetched web material remains an imported SOURCE_CLAIM unless the supplied record explicitly says otherwise. Use it for corroboration/contradiction without upgrading it to accepted evidence.',
    'Friction findings must be grounded in supplied structured measurements or deterministic friction projections. Do not infer a friction merely because a word sounds negative.',
    'Distinguish measured friction from causal explanation: a recurring pattern or temporal anomaly can establish a friction candidate without establishing its cause.',
    'Your output is INFERENCE only and cannot authorize action or promote itself to canonical truth.',
    'Generate one falsifiable primary hypothesis and at least one materially distinct rival when evidence permits.',
    'Predictions must discriminate between hypotheses. Each prediction needs expectedSignals, contradictionSignals and an observationWindow when possible.',
    'If the available material cannot support a friction, hypothesis or prediction, omit it and name the missing evidence instead of guessing.',
    'Write in the language used by the question/objective when reasonably possible.',
    'Return ONLY JSON with this exact shape: {"summary":string|null,"evidenceAssessment":{"declared":string[],"observed":string[],"derived":string[],"externalSourceClaims":string[],"unresolved":string[]},"frictionAnalysis":[{"dimension":string,"finding":string,"basis":string[],"evidenceRefs":string[],"confidence":number}],"primaryHypothesis":string|null,"rivalHypotheses":string[],"predictions":[{"description":string,"confidence":number,"expectedSignals":string[],"contradictionSignals":string[],"observationWindow":string|null}],"missingEvidence":string[],"confidence":number|null}.',
  ].join('\n');

  const prompt = JSON.stringify(compact({
    question: input.question ?? null,
    objective: input.objective ?? null,
    caseClass: input.caseClass ?? null,
    material: materialCapsule(input.signal),
    deterministicOutputs: input.deterministicOutputs,
    runtimeMetadata: input.runtimeMetadata,
  })).slice(0, 18_000);

  const result = await runLlmTask({
    task: 'graph_interpretation',
    system,
    prompt,
    fallbackResult: '{"summary":null,"evidenceAssessment":{"declared":[],"observed":[],"derived":[],"externalSourceClaims":[],"unresolved":["LLM_PROVIDER_UNAVAILABLE_OR_INSUFFICIENT_STRUCTURED_OBSERVATION"]},"frictionAnalysis":[],"primaryHypothesis":null,"rivalHypotheses":[],"predictions":[],"missingEvidence":["LLM_PROVIDER_UNAVAILABLE_OR_INSUFFICIENT_STRUCTURED_OBSERVATION"],"confidence":null}',
    requirements: { reasoning: true, structuredOutput: true, priority: 'quality' },
    maxTokens: 1700,
  });
  const parsed = parseSynthesis(result.result);
  const synthesis: Omit<SfiUniversalAiSynthesis, 'eventId'> = parsed
    ? {
        contract: SFI_UNIVERSAL_AI_SYNTHESIS_CONTRACT,
        status: result.ok ? 'COMPLETE' : 'DEGRADED',
        ...parsed,
        provider: result.ok ? result.provider : null,
        model: result.ok ? result.model : null,
        warnings: result.warnings,
      }
    : {
        contract: SFI_UNIVERSAL_AI_SYNTHESIS_CONTRACT,
        status: 'DEGRADED',
        summary: null,
        evidenceAssessment: emptyEvidenceAssessment(),
        frictionAnalysis: [],
        primaryHypothesis: null,
        rivalHypotheses: [],
        predictions: [],
        missingEvidence: ['AI_SYNTHESIS_SCHEMA_INVALID'],
        confidence: null,
        provider: result.ok ? result.provider : null,
        model: result.ok ? result.model : null,
        warnings: [...result.warnings, 'AI_SYNTHESIS_SCHEMA_INVALID'],
      };

  const lineage = [...new Set((input.lineageRefs ?? []).map((item) => item.trim()).filter(Boolean))];
  const event = await appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED',
    epistemicClass: 'inferred',
    confidence: synthesis.confidence ?? 0.5,
    payload: {
      cycleId: input.cycleId,
      actorId: input.actorId,
      tenantId: input.tenantId,
      synthesis,
      lineageRefs: lineage,
      epistemicBoundary: 'AI synthesis is an inference layer over declared/observed/derived/imported inputs. Evidence assessment, friction findings, hypotheses and predictions do not upgrade their underlying epistemic classes.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'universal_ai_synthesis', sourceType: 'llm_inference' },
    logbookId: `universal-cycle:${input.cycleId}`,
    lineage,
  });

  return { ...synthesis, eventId: event.ok ? String(event.data.event_id ?? '') : null };
}
