export type EvaluationAsset = {
  assetId: string;
  assetType: string;
  sourceState: string;
  metadata?: Record<string, unknown>;
};

export type AssetMetricSet = {
  confidence: number;
  metrics?: Record<string, number>;
};

export type FieldContext = {
  nodeId: string;
  regime: string;
  confidence: number;
};

export type MutualObservationReport = {
  reportId: string;
  generatedAt: string;
  summary: string;
};

export type Projection = {
  projectionId: string;
  horizon: string;
  confidence: number;
};

export type InterventionPlan = {
  interventionId: string;
  actions: string[];
  requiresHumanReview: boolean;
};
