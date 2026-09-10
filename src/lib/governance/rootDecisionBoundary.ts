import { isMaterialExternalAction } from '@/lib/execution/governedExecutionClassification';

export const SFI_ROOT_DECISION_CLASSES = [
  'INSTITUTIONAL_CHANGE',
  'CAPABILITY_IMPLEMENTATION',
  'LEARNING_PROMOTION',
  'RESERVED_EXTERNAL_OPERATION',
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

function proposalActionType(value: Row) {
  const expected = row(value.expected_field_delta);
  const payload = row(expected.payload);
  const requested = row(payload.requested_action ?? payload.requestedAction);
  const proportionality = row(value.proportionality_check);
  return text(
    requested.type
      ?? requested.actionType
      ?? requested.action_type
      ?? payload.actionType
      ?? payload.action_type
      ?? payload.operation
      ?? expected.actionType
      ?? expected.action_type
      ?? proportionality.actionType
      ?? proportionality.action_type
      ?? value.proposal_type,
  );
}

function proposalDescription(value: Row) {
  const expected = row(value.expected_field_delta);
  const payload = row(expected.payload);
  const requested = row(payload.requested_action ?? payload.requestedAction);
  return [
    value.title,
    value.description,
    expected.objective,
    payload.objective,
    payload.action,
    payload.target,
    requested.description,
    requested.action,
  ].map((item) => text(item)).filter((item): item is string => Boolean(item)).join(' | ');
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

  // Intrinsically institutional changes remain sovereign even when their
  // implementation is technically reversible.
  if (proposalType === 'MUTATION') return 'INSTITUTIONAL_CHANGE';
  if (proposalType === 'CAPABILITY_IMPLEMENTATION' || proposalType === 'CAPABILITY_ADD' || proposalType === 'CAPABILITY_CHANGE') {
    return 'CAPABILITY_IMPLEMENTATION';
  }
  if (proposalType === 'LEARNING_PROMOTION' || proposalType === 'INSTITUTIONAL_LEARNING_PROMOTION') {
    return 'LEARNING_PROMOTION';
  }

  // External material effects are also sovereign. This check intentionally
  // uses the same classifier as the execution router so a generic "action"
  // cannot bypass the human boundary merely because its proposal type is vague.
  if (isMaterialExternalAction(proposalActionType(value), proposalDescription(value))) {
    return 'RESERVED_EXTERNAL_OPERATION';
  }

  return 'OPERATIONAL_WORK';
}

export function rootDecisionRequired(value: Row) {
  return classifyProposalDecisionBoundary(value) !== 'OPERATIONAL_WORK';
}

export const SFI_ROOT_DECISION_BOUNDARY = {
  contract: 'SFI-ROOT-DECISION-BOUNDARY-2.1',
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
  rule: 'ROOT decides only institutional change, material capability implementation/change, institutional learning promotion, and reserved material external/irreversible operations. Ordinary case work proceeds under existing authority and remains observable.',
} as const;
