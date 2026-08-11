import { appendOperationalEvent, recordValue, stringValue, updateActionProposalStatus } from '@/lib/operational/common';

export const GOVERNED_PROPOSAL_STATES = [
  'draft',
  'proposed',
  'waiting_evidence',
  'design_approved',
  'queued',
  'accepted',
  'rejected',
  'conflicted',
  'frozen',
  'superseded',
] as const;

export type GovernedProposalState = typeof GOVERNED_PROPOSAL_STATES[number];
export type RootProposalDecision = 'accept' | 'deny' | 'request_evidence' | 'freeze';

export function normalizeProposalState(value: unknown): GovernedProposalState | 'unknown' {
  const raw = stringValue(value)?.toLowerCase() ?? '';
  if (raw === 'approved') return 'design_approved'; // read-only legacy compatibility
  if ((GOVERNED_PROPOSAL_STATES as readonly string[]).includes(raw)) return raw as GovernedProposalState;
  return 'unknown';
}

export function proposalStateMeaning(state: GovernedProposalState | 'unknown') {
  switch (state) {
    case 'draft': return 'Not submitted to governance.';
    case 'proposed': return 'Awaiting ROOT/ACP review.';
    case 'waiting_evidence': return 'Decision withheld until required evidence or verification exists.';
    case 'design_approved': return 'Design approved only; execution is not authorized.';
    case 'queued': return 'Prepared for an explicitly authorized realization step.';
    case 'accepted': return 'Authorized internal realization was recorded; this is not canonical promotion by itself.';
    case 'rejected': return 'Governance rejected the proposal.';
    case 'conflicted': return 'A post-promotion or implementation conflict blocks further promotion until resolved.';
    case 'frozen': return 'Governance intentionally prevents further transition.';
    case 'superseded': return 'A newer governed version replaces this proposal without erasing lineage.';
    default: return 'Unrecognized legacy or invalid status; governance review required.';
  }
}

export function nextStateForRootDecision(current: GovernedProposalState | 'unknown', decision: RootProposalDecision) {
  if (current === 'conflicted' || current === 'frozen' || current === 'superseded') return null;
  if (decision === 'deny' && ['proposed', 'waiting_evidence'].includes(current)) return 'rejected' as const;
  if (decision === 'request_evidence' && ['proposed', 'waiting_evidence'].includes(current)) return 'waiting_evidence' as const;
  if (decision === 'accept' && ['proposed', 'waiting_evidence'].includes(current)) return 'design_approved' as const;
  if (decision === 'freeze' && current !== 'unknown') return 'frozen' as const;
  return null;
}

export async function decideActionProposal(input: {
  proposalId: string;
  actorId: string;
  decision: RootProposalDecision;
  note?: string | null;
  currentRow: Record<string, unknown>;
}) {
  const current = normalizeProposalState(input.currentRow.status);
  const next = nextStateForRootDecision(current, input.decision);
  if (!next) return { ok: false as const, error: 'invalid_governance_transition', details: { current, decision: input.decision } };

  const expectedStatuses = current === 'design_approved' && stringValue(input.currentRow.status)?.toLowerCase() === 'approved'
    ? ['approved']
    : current === 'unknown' ? [] : [stringValue(input.currentRow.status)?.toLowerCase() ?? current];
  if (!expectedStatuses.length) return { ok: false as const, error: 'unknown_proposal_status' };

  const event = await appendOperationalEvent({
    eventName: `acp.proposal.${next}`,
    actorId: input.actorId,
    confidence: 1,
    payload: {
      proposal_id: input.proposalId,
      previous_status: current,
      next_status: next,
      founder_decision: input.decision,
      approval_only: next === 'design_approved',
      execution_allowed: false,
      note: input.note ?? null,
    },
    lineage: [input.proposalId],
  });
  if (!event.ok) return event;

  const expected = expectedStatuses as Parameters<typeof updateActionProposalStatus>[0]['expectedStatuses'];
  return updateActionProposalStatus({
    proposalId: input.proposalId,
    status: next,
    actorId: input.actorId,
    isRoot: true,
    proposalType: stringValue(input.currentRow.proposal_type)
      ?? stringValue(recordValue(input.currentRow.expected_field_delta).proposalType)
      ?? stringValue(recordValue(input.currentRow.proportionality_check).proposalType)
      ?? 'twin_proposal',
    expectedStatuses: expected,
    eventId: event.data.id,
    payloadPatch: {
      governanceDecision: input.decision,
      previousStatus: current,
      nextStatus: next,
      executionAllowed: false,
      note: input.note ?? null,
    },
  });
}
