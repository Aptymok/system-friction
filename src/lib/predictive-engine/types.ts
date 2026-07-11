export type PredictiveTargetKind = 'binary' | 'continuous';
export type PredictiveReturnWindow = '72h' | '7d' | '30d' | '90d';
export type PredictiveCalibrationStatus =
  | 'BOOTSTRAP_UNCALIBRATED'
  | 'LEARNING'
  | 'CALIBRATED'
  | 'DRIFT_WARNING'
  | 'FROZEN';

export type PredictiveFeatureInput = {
  key: string;
  value: number | null;
  confidence?: number | null;
  source?: string | null;
  evidenceIds?: string[];
  observedAt?: string | null;
};

export type PredictiveEvidenceInput = {
  id?: string;
  key: string;
  source: string;
  trust: 'VERIFIED' | 'OBSERVED' | 'DECLARED' | 'INFERRED' | 'UNKNOWN';
  value?: unknown;
  observedAt?: string | null;
};

export type PredictiveVerificationRule = {
  observable: string;
  comparator: 'gte' | 'lte' | 'equals' | 'contains' | 'changes_by';
  threshold: number | string | boolean;
  returnWindow: PredictiveReturnWindow;
  sourcePriority: string[];
  trueCondition: string;
  falseCondition: string;
  partialCondition?: string | null;
  unverifiableCondition: string;
};

export type PredictiveRequest = {
  scope: string;
  subjectType: string;
  subjectId: string;
  modelKey?: string | null;
  targetKey?: string | null;
  targetKind?: PredictiveTargetKind;
  returnWindow?: PredictiveReturnWindow;
  features: PredictiveFeatureInput[];
  evidence?: PredictiveEvidenceInput[];
  context?: Record<string, unknown>;
  verificationRule?: PredictiveVerificationRule | null;
  persist?: boolean;
  ownerId?: string | null;
  createdBy?: string | null;
};

export type PredictiveFeatureContribution = {
  key: string;
  rawValue: number;
  normalizedValue: number;
  weight: number;
  contribution: number;
  confidence: number;
  source: string | null;
  evidenceIds: string[];
};

export type PredictiveEvidenceRequest = {
  evidenceKey: string;
  description: string;
  reason: string;
  sourceCandidates: string[];
  autoCollectible: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
};

export type PredictiveInterpretation = {
  headline: string;
  reading: string;
  drivers: string[];
  contradictions: string[];
  evidenceNeeded: string[];
  nextAction: string;
  nonClaims: string[];
  provider: string;
  model: string;
  generatedByAi: boolean;
  warnings: string[];
};

export type AmvPredictiveAssessment = {
  state: 'OBSERVE' | 'REQUEST_EVIDENCE' | 'TEST' | 'HOLD' | 'ESCALATE';
  uncertainty: number;
  impact: number;
  driftRisk: number;
  epistemicRisk: number;
  reason: string;
  evidenceRequests: PredictiveEvidenceRequest[];
  learningAllowed: boolean;
  learningBlockers: string[];
};

export type PredictiveRunResult = {
  id: string | null;
  scope: string;
  subjectType: string;
  subjectId: string;
  model: {
    id: string;
    key: string;
    version: number;
    targetKey: string;
    targetKind: PredictiveTargetKind;
    sampleCount: number;
    verifiedSampleCount: number;
    calibrationStatus: PredictiveCalibrationStatus;
  };
  prediction: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  featureContributions: PredictiveFeatureContribution[];
  missingEvidence: PredictiveEvidenceRequest[];
  interpretation: PredictiveInterpretation;
  amv: AmvPredictiveAssessment;
  verificationRule: PredictiveVerificationRule;
  returnWindow: PredictiveReturnWindow;
  dueAt: string;
  status: 'OPEN' | 'WAITING_EVIDENCE';
  calibrationNotice: string;
  createdAt: string;
};

export type PredictiveOutcomeInput = {
  runId: string;
  returnWindow: PredictiveReturnWindow;
  actualValue?: number | null;
  outcomePayload?: Record<string, unknown>;
  sourceType: string;
  sourceRef?: string | null;
  sourceQuality: 'VERIFIED' | 'OBSERVED' | 'DECLARED' | 'INFERRED' | 'UNVERIFIABLE';
  interventionFidelity?: number | null;
  observedAt?: string | null;
  createdBy?: string | null;
};

export type PredictiveLearningResult = {
  runId: string;
  outcomeId: string;
  learningEventId: string;
  learningState: 'APPLIED' | 'REJECTED_LOW_QUALITY' | 'REJECTED_UNVERIFIABLE' | 'REVIEW_REQUIRED';
  error: {
    residual: number | null;
    absoluteError: number | null;
    squaredError: number | null;
    class: string;
  };
  modelBefore: Record<string, unknown>;
  parameterDelta: Record<string, unknown>;
  modelAfter: Record<string, unknown>;
  amvReflection: PredictiveInterpretation;
  qualityWeight: number;
  blockers: string[];
};

export type PredictiveEngineHealth = {
  ok: boolean;
  models: number;
  activeModels: number;
  runs: number;
  openRuns: number;
  dueRuns: number;
  evaluatedRuns: number;
  verifiedOutcomes: number;
  appliedLearningEvents: number;
  calibration: Array<{
    scope: string;
    modelKey: string;
    version: number;
    sampleCount: number;
    verifiedSampleCount: number;
    status: PredictiveCalibrationStatus;
    metrics: Record<string, unknown>;
  }>;
  warnings: string[];
};
