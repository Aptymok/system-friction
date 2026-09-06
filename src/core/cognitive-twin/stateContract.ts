export const COGNITIVE_TWIN_STATE_CONTRACT_VERSION = 'SFI-COGNITIVE-TWIN-STATE-1.0' as const;

export type CognitiveTwinEpistemicClass =
  | 'OBSERVED'
  | 'DECLARED'
  | 'DERIVED'
  | 'INFERRED'
  | 'SIMULATED'
  | 'PREDICTED'
  | 'MISSING';

export type CognitiveTwinEvidenceRef = {
  ref: string;
  epistemicClass: CognitiveTwinEpistemicClass;
  observedAt: string | null;
};

export type CognitiveTwinT0State = {
  at: string;
  state: Record<string, unknown>;
  availableEvidence: CognitiveTwinEvidenceRef[];
  attentionConfiguration: Record<string, unknown>;
  decision: Record<string, unknown> | null;
  prediction: Record<string, unknown> | null;
  worldVector: Record<string, unknown> | null;
  methodConfiguration: Record<string, unknown>;
};

export type CognitiveTwinT1State = {
  at: string;
  outcome: Record<string, unknown> | null;
  outcomeEvidenceRefs: string[];
  error: Record<string, unknown> | null;
  contradiction: Record<string, unknown> | null;
  deltaCognition: Record<string, unknown>;
  state: Record<string, unknown>;
};

export type CognitiveTwinStateTransition = {
  contractVersion: typeof COGNITIVE_TWIN_STATE_CONTRACT_VERSION;
  transitionId: string;
  subjectRef: string;
  t0: CognitiveTwinT0State;
  t1: CognitiveTwinT1State | null;
  lineageRefs: string[];
  createdAt: string;
  boundary: 'MODEL_CONTEXT_IS_NOT_TWIN_MEMORY';
};

function requireIsoTimestamp(value: string, field: string) {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error(`COGNITIVE_TWIN_STATE_INVALID_${field.toUpperCase()}`);
}

function uniqueNonEmpty(values: string[]) {
  const normalized = values.map((value) => value.trim()).filter(Boolean);
  return normalized.length === new Set(normalized).size && normalized.length === values.length;
}

export function assertCognitiveTwinStateTransition(value: CognitiveTwinStateTransition) {
  if (value.contractVersion !== COGNITIVE_TWIN_STATE_CONTRACT_VERSION) throw new Error('COGNITIVE_TWIN_STATE_CONTRACT_VERSION_INVALID');
  if (!value.transitionId.trim() || !value.subjectRef.trim()) throw new Error('COGNITIVE_TWIN_STATE_IDENTITY_INCOMPLETE');
  if (value.boundary !== 'MODEL_CONTEXT_IS_NOT_TWIN_MEMORY') throw new Error('COGNITIVE_TWIN_STATE_BOUNDARY_INVALID');
  requireIsoTimestamp(value.t0.at, 't0');
  requireIsoTimestamp(value.createdAt, 'created_at');
  if (!uniqueNonEmpty(value.lineageRefs)) throw new Error('COGNITIVE_TWIN_STATE_LINEAGE_INVALID');

  const t0EvidenceRefs = value.t0.availableEvidence.map((item) => item.ref);
  if (!uniqueNonEmpty(t0EvidenceRefs)) throw new Error('COGNITIVE_TWIN_STATE_T0_EVIDENCE_INVALID');
  for (const evidence of value.t0.availableEvidence) {
    if (evidence.observedAt) requireIsoTimestamp(evidence.observedAt, 'evidence_observed_at');
  }

  if (value.t1) {
    requireIsoTimestamp(value.t1.at, 't1');
    if (Date.parse(value.t1.at) < Date.parse(value.t0.at)) throw new Error('COGNITIVE_TWIN_STATE_T1_PRECEDES_T0');
    if (!uniqueNonEmpty(value.t1.outcomeEvidenceRefs)) throw new Error('COGNITIVE_TWIN_STATE_OUTCOME_EVIDENCE_INVALID');
    if (value.t1.outcome && value.t1.outcomeEvidenceRefs.length === 0) throw new Error('COGNITIVE_TWIN_STATE_OUTCOME_REQUIRES_EVIDENCE');
  }

  return value;
}

export function createCognitiveTwinStateTransition(
  input: Omit<CognitiveTwinStateTransition, 'contractVersion' | 'boundary'>
): CognitiveTwinStateTransition {
  return assertCognitiveTwinStateTransition({
    ...input,
    contractVersion: COGNITIVE_TWIN_STATE_CONTRACT_VERSION,
    boundary: 'MODEL_CONTEXT_IS_NOT_TWIN_MEMORY',
  });
}
