import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const WORLD_HYPOTHESIS_CLOSURE_DOSSIER_CONTRACT = 'SFI-WORLD-HYPOTHESIS-CLOSURE-DOSSIER-1.0' as const;

type Row = Record<string, unknown>;

export type WorldHypothesisClosureRow = {
  id: string;
  phenomenonKey: string;
  statement: string;
  status: string;
  cutoffAt: string | null;
  validationStartsAt: string | null;
  validationEndsAt: string | null;
  initialConfidence: number | null;
  currentConfidence: number | null;
  methodologyVersion: string | null;
  outcome: {
    classification: string;
    observedOutcome: string | null;
    directionalAccuracy: number | null;
    temporalAccuracy: number | null;
    actorAccuracy: number | null;
    mechanismAccuracy: number | null;
    sourceCoverage: number | null;
    evidenceIds: string[];
    evaluatorVersion: string | null;
    evaluatedAt: string | null;
  } | null;
  learning: {
    retainedAssumptions: string[];
    rejectedAssumptions: string[];
    missingVariables: string[];
    confidenceBefore: number | null;
    confidenceAfter: number | null;
    createdAt: string | null;
  } | null;
};

export type WorldHypothesisClosureDossier = {
  contract: typeof WORLD_HYPOTHESIS_CLOSURE_DOSSIER_CONTRACT;
  generatedAt: string;
  scope: {
    from: string | null;
    to: string | null;
    statuses: string[];
    total: number;
  };
  counts: {
    byClassification: Record<string, number>;
    withOutcome: number;
    withLearning: number;
    withLinkedReturnEvidence: number;
    withoutLinkedReturnEvidence: number;
  };
  calibration: {
    meanInitialConfidence: number | null;
    meanCurrentConfidence: number | null;
    meanConfidenceDelta: number | null;
    meanSourceCoverage: number | null;
  };
  hypotheses: WorldHypothesisClosureRow[];
  synthesis: {
    strongestObservedPattern: string;
    principalLimitation: string;
    nextMethodGate: string;
  };
  boundaries: string[];
};

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function iso(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  const date = new Date(candidate);
  return Number.isFinite(date.getTime()) ? date.toISOString() : candidate;
}
function num(value: unknown): number | null {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))]
    : [];
}
function mean(values: Array<number | null>) {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}
function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function normalize(raw: Row): WorldHypothesisClosureRow {
  const outcome = row(raw.outcome);
  const learning = row(raw.learning);
  const outcomeId = text(outcome.id);
  const learningId = text(learning.id);
  return {
    id: text(raw.id),
    phenomenonKey: text(raw.phenomenon_key, 'UNKNOWN'),
    statement: text(raw.statement, 'MISSING · hypothesis statement unavailable'),
    status: text(raw.status, 'UNKNOWN'),
    cutoffAt: iso(raw.cutoff_at),
    validationStartsAt: iso(raw.validation_starts_at),
    validationEndsAt: iso(raw.validation_ends_at),
    initialConfidence: num(raw.initial_confidence),
    currentConfidence: num(raw.current_confidence),
    methodologyVersion: text(raw.methodology_version) || null,
    outcome: outcomeId ? {
      classification: text(outcome.classification, text(raw.status, 'UNKNOWN')),
      observedOutcome: text(outcome.observed_outcome) || null,
      directionalAccuracy: num(outcome.directional_accuracy),
      temporalAccuracy: num(outcome.temporal_accuracy),
      actorAccuracy: num(outcome.actor_accuracy),
      mechanismAccuracy: num(outcome.mechanism_accuracy),
      sourceCoverage: num(outcome.source_coverage),
      evidenceIds: strings(outcome.evidence_ids),
      evaluatorVersion: text(outcome.evaluator_version) || null,
      evaluatedAt: iso(outcome.evaluated_at),
    } : null,
    learning: learningId ? {
      retainedAssumptions: strings(learning.retained_assumptions),
      rejectedAssumptions: strings(learning.rejected_assumptions),
      missingVariables: strings(learning.missing_variables),
      confidenceBefore: num(learning.confidence_before),
      confidenceAfter: num(learning.confidence_after),
      createdAt: iso(learning.created_at),
    } : null,
  };
}

export function buildWorldHypothesisClosureDossier(
  hypotheses: readonly WorldHypothesisClosureRow[],
): WorldHypothesisClosureDossier {
  const ordered = [...hypotheses].sort((a, b) =>
    Date.parse(b.cutoffAt ?? '') - Date.parse(a.cutoffAt ?? '')
  );
  const byClassification: Record<string, number> = {};
  ordered.forEach((item) => {
    const key = item.outcome?.classification || item.status || 'UNKNOWN';
    byClassification[key] = (byClassification[key] ?? 0) + 1;
  });

  const withOutcome = ordered.filter((item) => item.outcome).length;
  const withLearning = ordered.filter((item) => item.learning).length;
  const withLinkedReturnEvidence = ordered.filter((item) => (item.outcome?.evidenceIds.length ?? 0) > 0).length;
  const withoutLinkedReturnEvidence = withOutcome - withLinkedReturnEvidence;
  const meanInitialConfidence = mean(ordered.map((item) => item.initialConfidence));
  const meanCurrentConfidence = mean(ordered.map((item) => item.currentConfidence));
  const meanConfidenceDelta = mean(ordered.map((item) =>
    item.initialConfidence !== null && item.currentConfidence !== null
      ? item.currentConfidence - item.initialConfidence
      : null
  ));
  const meanSourceCoverage = mean(ordered.map((item) => item.outcome?.sourceCoverage ?? null));

  const decisive = (byClassification.VALIDATED ?? 0) + (byClassification.CONTRADICTED ?? 0);
  const partial = byClassification.PARTIALLY_VALIDATED ?? 0;
  const inconclusive = byClassification.INCONCLUSIVE ?? 0;

  const strongestObservedPattern = decisive
    ? `${decisive} hypotheses reached a decisive VALIDATED/CONTRADICTED classification under the persisted calibration owner.`
    : partial
      ? `${partial} hypotheses reached PARTIALLY_VALIDATED; the dominant observed closure state is partial support rather than decisive validation.`
      : `No decisive or partially validated closure is present in this dossier; ${inconclusive} hypotheses are INCONCLUSIVE.`;

  const principalLimitation = withoutLinkedReturnEvidence > 0
    ? `${withoutLinkedReturnEvidence} closed outcomes have no linked RETURN evidence ids. Classification remains a record of the evaluator result, not independent evidentiary support.`
    : 'Every outcome in scope carries at least one linked RETURN evidence id.';

  const nextMethodGate = inconclusive > 0
    ? 'Future hypotheses should enter validation with a preregistered test contract, measurable criteria, source-family requirements and explicit contradiction thresholds before T0 closes.'
    : 'Preserve preregistered criteria and continue measuring calibration error, source coverage and confidence movement across future cohorts.';

  return {
    contract: WORLD_HYPOTHESIS_CLOSURE_DOSSIER_CONTRACT,
    generatedAt: new Date().toISOString(),
    scope: {
      from: ordered.at(-1)?.cutoffAt ?? null,
      to: ordered[0]?.cutoffAt ?? null,
      statuses: [...new Set(ordered.map((item) => item.status))].sort(),
      total: ordered.length,
    },
    counts: {
      byClassification,
      withOutcome,
      withLearning,
      withLinkedReturnEvidence,
      withoutLinkedReturnEvidence,
    },
    calibration: {
      meanInitialConfidence,
      meanCurrentConfidence,
      meanConfidenceDelta,
      meanSourceCoverage,
    },
    hypotheses: ordered,
    synthesis: {
      strongestObservedPattern,
      principalLimitation,
      nextMethodGate,
    },
    boundaries: [
      'Outcome classification is owned by the World calibration cycle; this dossier does not reclassify hypotheses.',
      'PARTIALLY_VALIDATED is not VALIDATED.',
      'INCONCLUSIVE is not evidence for or against the hypothesis.',
      'A persisted outcome without linked evidence ids is reconstructible as a record but is not promoted to independent evidence.',
      'Learning is reported only when a persisted world_learning_event exists.',
      'Publication or report generation does not create RETURN.',
    ],
  };
}

export async function readWorldHypothesisClosureDossier(input: {
  limit?: number;
  since?: string | null;
} = {}): Promise<WorldHypothesisClosureDossier> {
  const db = createServiceSupabaseClient();
  const limit = Math.max(1, Math.min(500, input.limit ?? 360));
  let query = db
    .from('world_hypotheses')
    .select(`
      id,phenomenon_key,statement,status,cutoff_at,validation_starts_at,validation_ends_at,
      initial_confidence,current_confidence,methodology_version,
      outcome:world_hypothesis_outcomes(
        id,classification,observed_outcome,directional_accuracy,temporal_accuracy,
        actor_accuracy,mechanism_accuracy,source_coverage,evidence_ids,evaluator_version,evaluated_at
      ),
      learning:world_learning_events(
        id,retained_assumptions,rejected_assumptions,missing_variables,
        confidence_before,confidence_after,created_at
      )
    `)
    .in('status', ['VALIDATED','PARTIALLY_VALIDATED','CONTRADICTED','INCONCLUSIVE'])
    .order('cutoff_at', { ascending: false })
    .limit(limit);

  if (input.since) query = query.gte('cutoff_at', input.since);
  const result = await query;
  if (result.error) throw new Error(`world_hypothesis_closure_dossier_read_failed:${result.error.message}`);

  const hypotheses = (result.data ?? []).map((item) => normalize(item as unknown as Row));
  return buildWorldHypothesisClosureDossier(hypotheses);
}

export function worldHypothesisClosureReportBody(dossier: WorldHypothesisClosureDossier) {
  const classificationLines = Object.entries(dossier.counts.byClassification)
    .sort((a,b)=>b[1]-a[1])
    .map(([classification,count])=>`- ${classification}: ${count}`);

  const sample = dossier.hypotheses.slice(0, 12).map((item) => [
    `- [${item.outcome?.classification ?? item.status}] ${item.statement}`,
    `  T0 ${item.cutoffAt ?? 'MISSING'} → close ${item.validationEndsAt ?? 'MISSING'}`,
    `  confidence ${item.initialConfidence ?? 'MISSING'} → ${item.currentConfidence ?? 'MISSING'}`,
    `  RETURN evidence: ${item.outcome?.evidenceIds.length ?? 0}; source coverage: ${item.outcome?.sourceCoverage ?? 'MISSING'}`,
    `  outcome: ${item.outcome?.observedOutcome ?? 'MISSING'}`,
  ].join('\n'));

  return [
    'SFI · WORLD HYPOTHESIS CLOSURE DOSSIER',
    `Contract: ${dossier.contract}`,
    `Generated: ${dossier.generatedAt}`,
    '',
    'EXECUTIVE READING',
    dossier.synthesis.strongestObservedPattern,
    dossier.synthesis.principalLimitation,
    dossier.synthesis.nextMethodGate,
    '',
    'COHORT',
    `Hypotheses: ${dossier.scope.total}`,
    `T0 range: ${dossier.scope.from ?? 'MISSING'} → ${dossier.scope.to ?? 'MISSING'}`,
    `With outcome: ${dossier.counts.withOutcome}`,
    `With learning event: ${dossier.counts.withLearning}`,
    `With linked RETURN evidence: ${dossier.counts.withLinkedReturnEvidence}`,
    `Without linked RETURN evidence: ${dossier.counts.withoutLinkedReturnEvidence}`,
    '',
    'CLASSIFICATION',
    ...classificationLines,
    '',
    'CALIBRATION',
    `Mean initial confidence: ${dossier.calibration.meanInitialConfidence ?? 'MISSING'}`,
    `Mean current confidence: ${dossier.calibration.meanCurrentConfidence ?? 'MISSING'}`,
    `Mean confidence delta: ${dossier.calibration.meanConfidenceDelta ?? 'MISSING'}`,
    `Mean source coverage: ${dossier.calibration.meanSourceCoverage ?? 'MISSING'}`,
    '',
    'RECENT CLOSURES',
    ...(sample.length ? sample : ['MISSING · no closed hypotheses in scope.']),
    '',
    'EPISTEMIC BOUNDARY',
    ...dossier.boundaries.map((item)=>`- ${item}`),
  ].join('\n');
}
