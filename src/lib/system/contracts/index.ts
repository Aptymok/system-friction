export type MetricStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'OBSERVED'
  | 'DERIVED'
  | 'DEGRADED'
  | 'MISSING'
  | 'FAILED'
  | 'COMPLETE'
  | 'LEARNING'
  | 'VERIFIED'
  | 'RETRACTED';

export type VerificationWindow = '72h' | '7d' | '30d';
export type EvidenceVisibility = 'private' | 'founder' | 'public';

export type MetricValue = {
  key: string;
  label: string;
  value: number | string | null;
  unit: string | null;
  status: MetricStatus;
  source: string | null;
  evidenceIds: string[];
  confidence: number | null;
  observedAt: string | null;
  formulaVersion: string | null;
  warnings: string[];
  explanation: string;
};

export type EvidenceRef = {
  id: string;
  ownerId: string | null;
  caseId: string | null;
  type: string;
  source: string;
  label: string;
  observedAt: string | null;
  reliability: number | null;
  uri: string | null;
  visibility: EvidenceVisibility;
};

export type FieldCase = {
  id: string;
  ownerId: string;
  title: string;
  domain: string;
  declaredAttractor: string;
  baseline: string;
  status: MetricStatus;
  verificationWindow: VerificationWindow;
  createdAt: string;
  updatedAt: string;
};

export type MophRun = {
  id: string;
  caseId: string;
  ownerId: string;
  status: MetricStatus;
  input: unknown;
  output: unknown;
  evidenceIds: string[];
  createdAt: string;
  completedAt: string | null;
};

export type MihmReading = {
  id: string;
  caseId: string;
  ownerId: string;
  metrics: MetricValue[];
  tensions: unknown[];
  status: MetricStatus;
  formulaVersion: string | null;
  createdAt: string;
};

export type Hypothesis = {
  id: string;
  caseId: string;
  ownerId: string;
  statement: string;
  target: string;
  evidenceIds: string[];
  expectedSignal: string;
  verificationWindow: VerificationWindow;
  confidence: number | null;
  status: MetricStatus;
};

export type Intervention = {
  id: string;
  caseId: string;
  ownerId: string;
  hypothesisId: string;
  minimumChange: string;
  prohibitedEffects: string[];
  status: MetricStatus;
  startedAt: string | null;
  completedAt: string | null;
};

export type ReturnRecord = {
  id: string;
  caseId: string;
  ownerId: string;
  interventionId: string | null;
  window: VerificationWindow;
  expectedAt: string;
  returnedAt: string | null;
  evidenceIds: string[];
  status: MetricStatus;
};

export type Outcome = {
  id: string;
  caseId: string;
  ownerId: string;
  interventionId: string;
  expected: string;
  actual: string;
  delta: number | null;
  verified: boolean | null;
  learned: string | null;
  recordedAt: string;
};

export type Lesson = {
  id: string;
  caseId: string;
  ownerId: string;
  outcomeId: string;
  statement: string;
  evidenceIds: string[];
  createdAt: string;
};

export type PublicationStatus =
  | 'DRAFT'
  | 'REVIEWED'
  | 'APPROVED_FOR_PUBLICATION'
  | 'PUBLISHED'
  | 'SUPERSEDED'
  | 'RETRACTED';

export type Publication = {
  id: string;
  sourceType: string;
  sourceId: string;
  approvedBy: string | null;
  publicFields: string[];
  publicPayload: unknown;
  status: PublicationStatus;
  publishedAt: string | null;
};

export type AuditEvent = {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  before: unknown;
  after: unknown;
  createdAt: string;
};
