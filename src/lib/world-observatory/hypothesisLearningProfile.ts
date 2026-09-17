import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

export type WorldHypothesisLearningProfile = {
  sampleSize: number;
  classificationCounts: Record<string, number>;
  partialValidationRate: number;
  decisiveRate: number;
  inconclusiveRate: number;
  tightenDiscrimination: boolean;
  topMissingVariables: string[];
  generationGuidance: string[];
  methodThresholds: {
    minimumSample: number;
    partialValidationRate: number;
    maximumDecisiveRate: number;
  };
  boundaries: {
    historicalOutcomesAreMethodFeedback: true;
    doesNotChangeAttractors: true;
    doesNotPromoteTruth: true;
    doesNotCreateEvidence: true;
    rootPromotionStillRequired: true;
  };
  warnings: string[];
};

const METHOD_THRESHOLDS = Object.freeze({
  minimumSample: 20,
  partialValidationRate: 0.6,
  maximumDecisiveRate: 0.2,
});

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim())
    : [];
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function topValues(values: string[], limit = 8) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

function emptyProfile(warnings: string[]): WorldHypothesisLearningProfile {
  return {
    sampleSize: 0,
    classificationCounts: {},
    partialValidationRate: 0,
    decisiveRate: 0,
    inconclusiveRate: 0,
    tightenDiscrimination: false,
    topMissingVariables: [],
    generationGuidance: [
      'Maintain the strict preregistered test contract. Prefer NO_HYPOTHESIS when a measurable discriminator cannot be stated before RETURN.',
    ],
    methodThresholds: METHOD_THRESHOLDS,
    boundaries: {
      historicalOutcomesAreMethodFeedback: true,
      doesNotChangeAttractors: true,
      doesNotPromoteTruth: true,
      doesNotCreateEvidence: true,
      rootPromotionStillRequired: true,
    },
    warnings,
  };
}

export async function readWorldHypothesisLearningProfile(): Promise<WorldHypothesisLearningProfile> {
  let db;
  try {
    db = createServiceSupabaseClient();
  } catch (error) {
    return emptyProfile([error instanceof Error ? error.message : 'world_hypothesis_learning_store_unavailable']);
  }

  const [outcomeRead, learningRead] = await Promise.all([
    db.from('world_hypothesis_outcomes')
      .select('classification,evaluated_at')
      .order('evaluated_at', { ascending: false })
      .limit(120),
    db.from('world_learning_events')
      .select('missing_variables,rejected_assumptions,created_at')
      .order('created_at', { ascending: false })
      .limit(120),
  ]);

  const warnings = [
    outcomeRead.error ? `world_hypothesis_outcomes:${outcomeRead.error.message}` : null,
    learningRead.error ? `world_learning_events:${learningRead.error.message}` : null,
  ].filter((value): value is string => Boolean(value));

  if (outcomeRead.error) return emptyProfile(warnings);

  const outcomes = rows(outcomeRead.data);
  const counts: Record<string, number> = {};
  for (const outcome of outcomes) {
    const classification = typeof outcome.classification === 'string' ? outcome.classification.toUpperCase() : 'UNKNOWN';
    counts[classification] = (counts[classification] ?? 0) + 1;
  }

  const sampleSize = outcomes.length;
  const partialValidationRate = ratio(counts.PARTIALLY_VALIDATED ?? 0, sampleSize);
  const decisiveCount = (counts.VALIDATED ?? 0) + (counts.CONTRADICTED ?? 0);
  const decisiveRate = ratio(decisiveCount, sampleSize);
  const inconclusiveRate = ratio(counts.INCONCLUSIVE ?? 0, sampleSize);
  const tightenDiscrimination = sampleSize >= METHOD_THRESHOLDS.minimumSample
    && partialValidationRate >= METHOD_THRESHOLDS.partialValidationRate
    && decisiveRate <= METHOD_THRESHOLDS.maximumDecisiveRate;

  const learningRows = rows(learningRead.data);
  const topMissingVariables = topValues(learningRows.flatMap((event) => strings(event.missing_variables)));

  const generationGuidance = tightenDiscrimination
    ? [
        'Observed outcome distribution indicates weak discrimination: generate fewer hypotheses and prefer NO_HYPOTHESIS over vague partially testable claims.',
        'Require sharper expected-versus-contradiction separation, measurable thresholds and sufficient source-family diversity before PROPOSE.',
        'Use recurrent missing variables as method feedback when defining future observables; they are not evidence that any hypothesis is true.',
      ]
    : [
        'Maintain the strict preregistered test contract and current discrimination requirements.',
        'Prefer NO_HYPOTHESIS whenever the available observations cannot support measurable expected and contradiction criteria before RETURN.',
      ];

  return {
    sampleSize,
    classificationCounts: counts,
    partialValidationRate,
    decisiveRate,
    inconclusiveRate,
    tightenDiscrimination,
    topMissingVariables,
    generationGuidance,
    methodThresholds: METHOD_THRESHOLDS,
    boundaries: {
      historicalOutcomesAreMethodFeedback: true,
      doesNotChangeAttractors: true,
      doesNotPromoteTruth: true,
      doesNotCreateEvidence: true,
      rootPromotionStillRequired: true,
    },
    warnings,
  };
}
