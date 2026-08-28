import { randomUUID } from 'node:crypto';
import { runLlmTask } from '@/lib/ai/providerRouter';
import { appendEpistemicEvent } from '@/lib/events/eventStore';

export const SFI_UNIVERSAL_AI_SYNTHESIS_CONTRACT = 'SFI-UNIVERSAL-AI-SYNTHESIS-1.0' as const;

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

export type SfiUniversalAiPrediction = {
  id: string;
  description: string;
  confidence: number;
  expectedSignals: string[];
  contradictionSignals: string[];
  observationWindow: string | null;
};

export type SfiUniversalAiSynthesis = {
  contract: typeof SFI_UNIVERSAL_AI_SYNTHESIS_CONTRACT;
  status: 'COMPLETE' | 'DEGRADED';
  summary: string | null;
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

function parseSynthesis(value: string) {
  try {
    const parsed = row(JSON.parse(stripFence(value)));
    const primaryHypothesis = text(parsed.primaryHypothesis);
    const rivals = strings(parsed.rivalHypotheses, 5);
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
      primaryHypothesis,
      rivalHypotheses: rivals,
      predictions,
      missingEvidence: strings(parsed.missingEvidence, 10),
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
}) : Promise<SfiUniversalAiSynthesis> {
  const system = [
    'You are the System Friction Institute synthesis layer after deterministic observation and governed cognitive agents.',
    'Evidence before inference. Never invent measurements, rows, sources, causal relations, interventions, returns, dates or lineage.',
    'Use only the supplied observed/derived material. Treat web snippets as SOURCE_CLAIMS, not verified facts.',
    'Your output is INFERENCE only and cannot authorize action or promote itself to canonical truth.',
    'Generate one falsifiable primary hypothesis and at least one materially distinct rival when evidence permits.',
    'Predictions must discriminate between hypotheses. Each prediction needs expectedSignals, contradictionSignals and an observationWindow when possible.',
    'If the available material cannot support a hypothesis or prediction, leave it null/empty and name the missing evidence instead of guessing.',
    'Return ONLY JSON with this exact shape: {"summary":string|null,"primaryHypothesis":string|null,"rivalHypotheses":string[],"predictions":[{"description":string,"confidence":number,"expectedSignals":string[],"contradictionSignals":string[],"observationWindow":string|null}],"missingEvidence":string[],"confidence":number|null}.',
  ].join('\n');

  const prompt = JSON.stringify(compact({
    question: input.question ?? null,
    objective: input.objective ?? null,
    caseClass: input.caseClass ?? null,
    signal: input.signal,
    deterministicOutputs: input.deterministicOutputs,
    runtimeMetadata: input.runtimeMetadata,
  })).slice(0, 16_000);

  const result = await runLlmTask({
    task: 'graph_interpretation',
    system,
    prompt,
    fallbackResult: '{"summary":null,"primaryHypothesis":null,"rivalHypotheses":[],"predictions":[],"missingEvidence":["LLM_PROVIDER_UNAVAILABLE_OR_INSUFFICIENT_STRUCTURED_OBSERVATION"],"confidence":null}',
    requirements: { reasoning: true, structuredOutput: true, priority: 'quality' },
    maxTokens: 1100,
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
        primaryHypothesis: null,
        rivalHypotheses: [],
        predictions: [],
        missingEvidence: ['AI_SYNTHESIS_SCHEMA_INVALID'],
        confidence: null,
        provider: result.ok ? result.provider : null,
        model: result.ok ? result.model : null,
        warnings: [...result.warnings, 'AI_SYNTHESIS_SCHEMA_INVALID'],
      };

  const event = await appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED',
    epistemicClass: 'inferred',
    confidence: synthesis.confidence ?? 0.5,
    payload: {
      cycleId: input.cycleId,
      actorId: input.actorId,
      tenantId: input.tenantId,
      synthesis,
      epistemicBoundary: 'AI synthesis is an inference layer over observed/derived inputs. Primary/rival hypotheses and predictions remain contrastable propositions, not accepted evidence or canonical truth.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'universal_ai_synthesis', sourceType: 'llm_inference' },
    logbookId: `universal-cycle:${input.cycleId}`,
    lineage: [],
  });

  return { ...synthesis, eventId: event.ok ? String(event.data.event_id ?? '') : null };
}
