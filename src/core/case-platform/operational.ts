import type {
  SfiCanonicalRef,
  SfiCaseStatus,
  SfiEpistemicClass,
} from '../contracts/sfi';

export const SFI_CASE_OBJECT_KINDS = [
  'SOURCE',
  'RECORD',
  'EVIDENCE',
  'SYSTEM_MODEL',
  'OBSERVATION',
  'FRICTION',
  'PERTURBATION',
  'TRAJECTORY',
  'ATTRACTOR',
  'EPISTEMIC_ASSESSMENT',
  'HYPOTHESIS',
  'INSTRUMENT_RUN',
  'ANALYSIS',
  'RECOMMENDATION',
  'INTERVENTION',
  'RETURN',
  'REPORT',
  'GOVERNANCE_DECISION',
  'UNRESOLVED_QUESTION',
  'CONTRADICTION',
] as const;

export type SfiCaseObjectKind = (typeof SFI_CASE_OBJECT_KINDS)[number];

export type SfiCaseObjectDraft = {
  kind: SfiCaseObjectKind;
  epistemicRole: SfiEpistemicClass;
  canonicalRef: SfiCanonicalRef;
  sourceRefs?: SfiCanonicalRef[];
  recordRefs?: SfiCanonicalRef[];
  evidenceRefs?: SfiCanonicalRef[];
};

const TRANSITIONS: Record<SfiCaseStatus, readonly SfiCaseStatus[]> = {
  DRAFT: ['OPEN', 'REJECTED'],
  OPEN: ['OBSERVING', 'ANALYZING', 'REJECTED'],
  OBSERVING: ['ANALYZING', 'AWAITING_GOVERNANCE', 'AWAITING_USER_CLOSE', 'REJECTED'],
  ANALYZING: ['OBSERVING', 'AWAITING_GOVERNANCE', 'AWAITING_USER_CLOSE', 'REJECTED'],
  AWAITING_GOVERNANCE: ['ANALYZING', 'INTERVENING', 'AWAITING_USER_CLOSE', 'REJECTED'],
  INTERVENING: ['AWAITING_RETURN', 'ANALYZING'],
  AWAITING_RETURN: ['ANALYZING', 'OBSERVING', 'AWAITING_USER_CLOSE'],
  AWAITING_USER_CLOSE: ['ANALYZING', 'CLOSED'],
  CLOSED: [],
  REJECTED: [],
};

function includes<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

export function canSfiCaseTransition(from: SfiCaseStatus, to: SfiCaseStatus) {
  return from === to || includes(TRANSITIONS[from], to);
}

export function assertSfiCaseTransition(from: SfiCaseStatus, to: SfiCaseStatus) {
  if (!canSfiCaseTransition(from, to)) {
    throw new Error(`SFI_CASE_TRANSITION_FORBIDDEN:${from}:${to}`);
  }
}

const exactRole: Partial<Record<SfiCaseObjectKind, SfiEpistemicClass>> = {
  SOURCE: 'SOURCE',
  RECORD: 'RECORD',
  EVIDENCE: 'EVIDENCE',
  OBSERVATION: 'RECORD',
  EPISTEMIC_ASSESSMENT: 'EPISTEMIC_ASSESSMENT',
  HYPOTHESIS: 'INFERENCE',
  SYSTEM_MODEL: 'INFERENCE',
  ATTRACTOR: 'INFERENCE',
  INTERVENTION: 'RECORD',
  RETURN: 'RECORD',
  REPORT: 'RECORD',
  GOVERNANCE_DECISION: 'GOVERNANCE_DECISION',
  UNRESOLVED_QUESTION: 'EPISTEMIC_ASSESSMENT',
  CONTRADICTION: 'EPISTEMIC_ASSESSMENT',
};

const derivedKinds = new Set<SfiCaseObjectKind>([
  'SYSTEM_MODEL',
  'FRICTION',
  'TRAJECTORY',
  'ATTRACTOR',
  'HYPOTHESIS',
  'INSTRUMENT_RUN',
  'ANALYSIS',
  'RECOMMENDATION',
]);

const forbiddenDerivedAuthority = new Set<SfiEpistemicClass>([
  'SOURCE',
  'EVIDENCE',
  'GOVERNANCE_DECISION',
  'TRUTH_CLAIM',
]);

export function validateSfiCaseObjectDraft(draft: SfiCaseObjectDraft): string[] {
  const violations: string[] = [];
  if (!draft.canonicalRef.id.trim()) violations.push('CASE_OBJECT_REF_REQUIRED');

  const requiredRole = exactRole[draft.kind];
  if (requiredRole && draft.epistemicRole !== requiredRole) {
    violations.push(`CASE_OBJECT_ROLE_MISMATCH:${draft.kind}:${requiredRole}`);
  }

  if (derivedKinds.has(draft.kind) && forbiddenDerivedAuthority.has(draft.epistemicRole)) {
    violations.push(`CASE_DERIVED_OBJECT_AUTHORITY_FORBIDDEN:${draft.kind}:${draft.epistemicRole}`);
  }

  if (draft.kind === 'EVIDENCE') {
    const lineageCount = (draft.sourceRefs?.length ?? 0) + (draft.recordRefs?.length ?? 0);
    if (lineageCount === 0) violations.push('CASE_EVIDENCE_REQUIRES_SOURCE_OR_RECORD_LINEAGE');
  }

  if (draft.kind === 'INSTRUMENT_RUN' && !includes(
    ['COGNITIVE_EXECUTION', 'SIMULATION', 'INFERENCE', 'PROJECTION'] as const,
    draft.epistemicRole,
  )) {
    violations.push('CASE_INSTRUMENT_OUTPUT_ROLE_INVALID');
  }

  if (draft.kind === 'ANALYSIS' && !includes(
    ['EPISTEMIC_ASSESSMENT', 'INFERENCE', 'SIMULATION', 'PROJECTION'] as const,
    draft.epistemicRole,
  )) {
    violations.push('CASE_ANALYSIS_ROLE_INVALID');
  }

  return violations;
}

export const SFI_CASE_OPERATIONAL_INVARIANTS = {
  clientCanAddressRoot: false,
  caseWritesInstitutionalMemoryDirectly: false,
  instrumentOutputBecomesEvidenceByInheritance: false,
  reportHasExecutionAuthority: false,
  tenantIsolationRequired: true,
  destructiveClientDelete: false,
  projectAggregatesCasesWithoutPromotingTruth: true,
  closedRequiresAwaitingUserClose: true,
  finalClosureRequiresExplicitUserDecision: true,
} as const;
