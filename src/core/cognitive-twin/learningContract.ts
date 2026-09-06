export const COGNITIVE_TWIN_LEARNING_LINEAGE_CONTRACT_VERSION = 'SFI-COGNITIVE-TWIN-LEARNING-LINEAGE-1.0' as const;

export type CognitiveTwinLearningState = 'CANDIDATE' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED';

export type CognitiveTwinLearningCandidate = {
  contractVersion: typeof COGNITIVE_TWIN_LEARNING_LINEAGE_CONTRACT_VERSION;
  learningId: string;
  state: 'CANDIDATE';
  statement: string;
  evidenceRefs: string[];
  sourceRefs: string[];
  proposedBy: string | null;
  proposedAt: string;
};

export type CognitiveTwinLearningDecision = {
  contractVersion: typeof COGNITIVE_TWIN_LEARNING_LINEAGE_CONTRACT_VERSION;
  decisionId: string;
  learningId: string;
  decision: 'ACCEPTED' | 'REJECTED';
  authorityRef: string;
  rationale: string;
  evidenceRefs: string[];
  decidedBy: string | null;
  decidedAt: string;
  canonicalMutation: false;
};

export type CognitiveTwinLearningSupersession = {
  contractVersion: typeof COGNITIVE_TWIN_LEARNING_LINEAGE_CONTRACT_VERSION;
  relationId: string;
  relation: 'SUPERSEDED_BY';
  supersededLearningId: string;
  supersedingLearningId: string;
  authorityRef: string;
  rationale: string;
  evidenceRefs: string[];
  recordedBy: string | null;
  recordedAt: string;
  destructiveRewrite: false;
};

function assertIso(value: string, field: string) {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error(`COGNITIVE_TWIN_LEARNING_INVALID_${field.toUpperCase()}`);
}

function assertUniqueRefs(values: string[], field: string) {
  const normalized = values.map((value) => value.trim()).filter(Boolean);
  if (normalized.length !== values.length || new Set(normalized).size !== normalized.length) {
    throw new Error(`COGNITIVE_TWIN_LEARNING_INVALID_${field.toUpperCase()}`);
  }
}

export function assertCognitiveTwinLearningCandidate(value: CognitiveTwinLearningCandidate) {
  if (value.contractVersion !== COGNITIVE_TWIN_LEARNING_LINEAGE_CONTRACT_VERSION) throw new Error('COGNITIVE_TWIN_LEARNING_CONTRACT_VERSION_INVALID');
  if (value.state !== 'CANDIDATE') throw new Error('COGNITIVE_TWIN_LEARNING_CANDIDATE_STATE_INVALID');
  if (!value.learningId.trim() || !value.statement.trim()) throw new Error('COGNITIVE_TWIN_LEARNING_CANDIDATE_INCOMPLETE');
  assertUniqueRefs(value.evidenceRefs, 'candidate_evidence_refs');
  assertUniqueRefs(value.sourceRefs, 'candidate_source_refs');
  assertIso(value.proposedAt, 'proposed_at');
  return value;
}

export function assertCognitiveTwinLearningDecision(value: CognitiveTwinLearningDecision) {
  if (value.contractVersion !== COGNITIVE_TWIN_LEARNING_LINEAGE_CONTRACT_VERSION) throw new Error('COGNITIVE_TWIN_LEARNING_CONTRACT_VERSION_INVALID');
  if (!value.decisionId.trim() || !value.learningId.trim()) throw new Error('COGNITIVE_TWIN_LEARNING_DECISION_IDENTITY_INCOMPLETE');
  if (!['ACCEPTED', 'REJECTED'].includes(value.decision)) throw new Error('COGNITIVE_TWIN_LEARNING_DECISION_INVALID');
  if (!value.authorityRef.trim()) throw new Error('COGNITIVE_TWIN_LEARNING_AUTHORITY_REQUIRED');
  if (!value.rationale.trim()) throw new Error('COGNITIVE_TWIN_LEARNING_RATIONALE_REQUIRED');
  if (value.canonicalMutation !== false) throw new Error('COGNITIVE_TWIN_LEARNING_DECISION_CANNOT_MUTATE_CANON');
  assertUniqueRefs(value.evidenceRefs, 'decision_evidence_refs');
  assertIso(value.decidedAt, 'decided_at');
  return value;
}

export function assertCognitiveTwinLearningSupersession(value: CognitiveTwinLearningSupersession) {
  if (value.contractVersion !== COGNITIVE_TWIN_LEARNING_LINEAGE_CONTRACT_VERSION) throw new Error('COGNITIVE_TWIN_LEARNING_CONTRACT_VERSION_INVALID');
  if (value.relation !== 'SUPERSEDED_BY') throw new Error('COGNITIVE_TWIN_LEARNING_SUPERSESSION_RELATION_INVALID');
  if (!value.relationId.trim() || !value.supersededLearningId.trim() || !value.supersedingLearningId.trim()) {
    throw new Error('COGNITIVE_TWIN_LEARNING_SUPERSESSION_IDENTITY_INCOMPLETE');
  }
  if (value.supersededLearningId === value.supersedingLearningId) throw new Error('COGNITIVE_TWIN_LEARNING_CANNOT_SUPERSEDE_SELF');
  if (!value.authorityRef.trim()) throw new Error('COGNITIVE_TWIN_LEARNING_AUTHORITY_REQUIRED');
  if (!value.rationale.trim()) throw new Error('COGNITIVE_TWIN_LEARNING_RATIONALE_REQUIRED');
  if (value.destructiveRewrite !== false) throw new Error('COGNITIVE_TWIN_LEARNING_DESTRUCTIVE_REWRITE_FORBIDDEN');
  assertUniqueRefs(value.evidenceRefs, 'supersession_evidence_refs');
  assertIso(value.recordedAt, 'recorded_at');
  return value;
}
