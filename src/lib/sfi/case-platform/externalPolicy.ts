import type { SfiCaseStatus } from '@/core/contracts/sfi';

export const SFI_EXTERNAL_CASE_TRANSITIONS = [
  'DRAFT',
  'OPEN',
  'OBSERVING',
  'ANALYZING',
  'AWAITING_GOVERNANCE',
  'CLOSED',
  'REJECTED',
] as const satisfies readonly SfiCaseStatus[];

export const SFI_EXTERNAL_CASE_TRANSITION_SET = new Set<SfiCaseStatus>(SFI_EXTERNAL_CASE_TRANSITIONS);

export const SFI_EXTERNAL_CASE_RESERVED_TRANSITIONS = [
  'INTERVENING',
  'AWAITING_RETURN',
] as const satisfies readonly SfiCaseStatus[];
