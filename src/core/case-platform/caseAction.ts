export const SFI_CASE_ACTION_CONTRACT = 'SFI-CASE-ACTION-1.0' as const;

export const SFI_CASE_ACTION_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'EXECUTED',
  'RETURN_RECORDED',
] as const;

export type SfiCaseActionStatus = (typeof SFI_CASE_ACTION_STATUSES)[number];
export type SfiCaseActionDecision = 'APPROVE' | 'REJECT';
export type SfiCaseActionRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SfiCaseActionReversibility = 'REVERSIBLE' | 'PARTIALLY_REVERSIBLE' | 'IRREVERSIBLE' | 'UNKNOWN';

const TRANSITIONS: Record<SfiCaseActionStatus, readonly SfiCaseActionStatus[]> = {
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['EXECUTED', 'CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
  EXECUTED: ['RETURN_RECORDED'],
  RETURN_RECORDED: [],
};

export function canSfiCaseActionTransition(from: SfiCaseActionStatus, to: SfiCaseActionStatus) {
  return from === to || (TRANSITIONS[from] as readonly string[]).includes(to);
}

export function assertSfiCaseActionTransition(from: SfiCaseActionStatus, to: SfiCaseActionStatus) {
  if (!canSfiCaseActionTransition(from, to)) {
    throw new Error(`SFI_CASE_ACTION_TRANSITION_FORBIDDEN:${from}:${to}`);
  }
}

export const SFI_CASE_ACTION_BOUNDARY = {
  contract: SFI_CASE_ACTION_CONTRACT,
  reportHasExecutionAuthority: false,
  recommendationHasExecutionAuthority: false,
  automaticExternalExecution: false,
  humanTenantAuthorityRequired: true,
  approvalRoles: ['OWNER', 'ADMIN'] as const,
  operatorMayRecordApprovedIntervention: true,
  clientAddressesRoot: false,
  caseDecisionEqualsInstitutionalGovernance: false,
  returnRequiredForLongitudinalClosure: true,
} as const;
