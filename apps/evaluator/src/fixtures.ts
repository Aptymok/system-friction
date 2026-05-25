import type {
  AssetMetricSet,
  EvaluationAsset,
  FieldContext,
  InterventionPlan,
  MutualObservationReport,
  Projection,
} from './contracts';

export const evaluatorFixtureNotice = 'fixture-only:not-live-data';

export const fixtureAsset: EvaluationAsset = {
  assetId: 'fixture-asset-001',
  assetType: 'document',
  sourceState: 'fixture',
  metadata: {
    fixture: true,
    notice: evaluatorFixtureNotice,
  },
};

export const fixtureMetrics: AssetMetricSet = {
  confidence: 0.42,
  metrics: {
    coherence: 0.61,
    degradationGradient: 0.28,
    semanticDensity: 0.73,
  },
};

export const fixtureFieldContext: FieldContext = {
  nodeId: 'fixture-node-001',
  regime: 'unknown',
  confidence: 0.3,
};

export const fixtureReport: MutualObservationReport = {
  reportId: 'fixture-report-001',
  generatedAt: '2026-05-22T00:00:00.000Z',
  summary: 'Fixture report for read-only evaluator scaffold. Not live analysis.',
};

export const fixtureProjection: Projection = {
  projectionId: 'fixture-projection-001',
  horizon: 'fixture-horizon',
  confidence: 0.25,
};

export const fixtureIntervention: InterventionPlan = {
  interventionId: 'fixture-intervention-001',
  actions: ['review fixture boundaries', 'keep evaluator blocked until runtime approval'],
  requiresHumanReview: true,
};
