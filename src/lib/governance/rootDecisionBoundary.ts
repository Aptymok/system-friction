export const SFI_ROOT_DECISION_CLASSES = [
  'INSTITUTIONAL_CHANGE',
  'CAPABILITY_IMPLEMENTATION',
  'LEARNING_PROMOTION',
] as const;

export type SfiRootDecisionClass = (typeof SFI_ROOT_DECISION_CLASSES)[number];
export type SfiDecisionBoundaryClass = SfiRootDecisionClass | 'OPERATIONAL_WORK';

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalized(value: unknown) {
  return text(value)?.toUpperCase().replaceAll('-', '_').replaceAll(' ', '_') ?? null;
}

export function isRootDecisionClass(value: unknown): value is SfiRootDecisionClass {
  const candidate = normalized(value);
  return Boolean(candidate && (SFI_ROOT_DECISION_CLASSES as readonly string[]).includes(candidate));
}

export function explicitRootDecisionClass(value: Row): SfiRootDecisionClass | null {
  const expected = row(value.expected_field_delta);
  const payload = row(expected.payload);
  const requested = row(payload.requested_action ?? payload.requestedAction);
  const proportionality = row(value.proportionality_check);
  const candidates = [
    value.root_decision_class,
    value.decision_class,
    expected.rootDecisionClass,
    expected.decisionClass,
    payload.rootDecisionClass,
    payload.root_decision_class,
    payload.decisionClass,
    payload.decision_class,
    requested.rootDecisionClass,
    requested.decisionClass,
    proportionality.rootDecisionClass,
    proportionality.decisionClass,
  ];
  for (const candidate of candidates) {
    if (isRootDecisionClass(candidate)) return normalized(candidate) as SfiRootDecisionClass;
  }
  return null;
}

export function classifyProposalDecisionBoundary(value: Row): SfiDecisionBoundaryClass {
  const explicit = explicitRootDecisionClass(value);
  if (explicit) return explicit;

  const expected = row(value.expected_field_delta);
  const payload = row(expected.payload);
  const proportionality = row(value.proportionality_check);
  const proposalType = normalized(
    value.proposal_type
      ?? expected.proposalType
      ?? expected.proposal_type
      ?? payload.proposalType
      ?? payload.proposal_type
      ?? proportionality.proposalType
      ?? proportionality.proposal_type,
  );

  // Only old proposal types whose semantics are intrinsically institutional
  // retain an implicit ROOT classification. Generic external/twin/evidence/
  // defect/report/work objects never become sovereign work by free-text inference.
  if (proposalType === 'MUTATION') return 'INSTITUTIONAL_CHANGE';
  if (proposalType === 'CAPABILITY_IMPLEMENTATION' || proposalType === 'CAPABILITY_ADD' || proposalType === 'CAPABILITY_CHANGE') {
    return 'CAPABILITY_IMPLEMENTATION';
  }
  if (proposalType === 'LEARNING_PROMOTION' || proposalType === 'INSTITUTIONAL_LEARNING_PROMOTION') {
    return 'LEARNING_PROMOTION';
  }
  return 'OPERATIONAL_WORK';
}

export function rootDecisionRequired(value: Row) {
  return classifyProposalDecisionBoundary(value) !== 'OPERATIONAL_WORK';
}

export const SFI_ROOT_DECISION_BOUNDARY = {
  contract: 'SFI-ROOT-DECISION-BOUNDARY-2.0',
  rootDecisionClasses: SFI_ROOT_DECISION_CLASSES,
  operationalNonDecisions: [
    'CASE_OR_CYCLE_CLOSE',
    'REPORT_GENERATION_OR_USE',
    'EVIDENCE_ACQUISITION_OR_CLASSIFICATION',
    'OBSERVATION_RECONSTRUCTION_ANALYSIS',
    'HYPOTHESIS_RIVAL_COUNTERFACTUAL_SIMULATION',
    'EXPERIMENT_WITHIN_EXISTING_AUTHORITY',
    'BOUNDED_REPAIR_AND_REGRESSION',
    'EXECUTION_WITHIN_EXISTING_AUTHORITY',
    'NOTIFICATION_INCIDENT_DEFECT_DEGRADATION',
    'RETURN_AND_REALITY_CALIBRATION',
    'LEARNING_CANDIDATE_CAPTURE',
  ],
  rule: 'ROOT decides only institutional change, material capability implementation/change, and learning promotion. Operational work proceeds under existing authority and remains observable.',
} as const;
