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
export type ProposalDecisionAuthority = 'root' | 'controller';

export function normalizeProposalState(value: unknown): GovernedProposalState | 'unknown' {
  const raw = stringValue(value)?.toLowerCase() ?? '';
  if (raw === 'approved') return 'design_approved'; // read-only legacy compatibility
  if ((GOVERNED_PROPOSAL_STATES as readonly string[]).includes(raw)) return raw as GovernedProposalState;
  return 'unknown';
}

export function proposalStateMeaning(state: GovernedProposalState | 'unknown') {
  switch (state) {
    case 'draft': return 'Not submitted to governance.';
    case 'proposed': return 'Awaiting authorized governance review.';
    case 'waiting_evidence': return 'Decision withheld until required evidence or verification exists.';
    case 'design_approved': return 'Design approved only; execution is not authorized.';
    case 'queued': return 'Authorized for an executor/RETURN cycle; it is not canon.';
    case 'accepted': return 'Governance accepted the bounded realization/adoption after RETURN; this is not canonical promotion by itself.';
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

function proposalTypeOf(row: Record<string, unknown>) {
  const expected = recordValue(row.expected_field_delta);
  const proportionality = recordValue(row.proportionality_check);
  return stringValue(row.proposal_type)
    ?? stringValue(expected.proposalType)
    ?? stringValue(expected.proposal_type)
    ?? stringValue(proportionality.proposalType)
    ?? stringValue(proportionality.proposal_type)
    ?? 'twin_proposal';
}

export function isReadyForInstitutionalAdoption(row: Record<string, unknown>) {
  if (proposalTypeOf(row) !== 'institutional_mutation_candidate') return false;
  if (normalizeProposalState(row.status) !== 'proposed') return false;
  const outcome = recordValue(row.outcome);
  const patch = recordValue(outcome.payloadPatch);
  if (stringValue(patch.developmentStage) === 'READY_FOR_ADOPTION') {
    const returnEventId = stringValue(patch.returnEventId);
    const evidenceRefs = Array.isArray(patch.evidenceRefs)
      ? patch.evidenceRefs.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];
    return Boolean(returnEventId && evidenceRefs.length > 0 && patch.returnRequiredBeforeAdoption === true);
  }
  return false;
}

export async function decideActionProposal(input: {
  proposalId: string;
  actorId: string;
  actorLabel?: string | null;
  decision: RootProposalDecision;
  decisionAuthority?: ProposalDecisionAuthority;
  note?: string | null;
  currentRow: Record<string, unknown>;
}) {
  const current = normalizeProposalState(input.currentRow.status);
  const authority = input.decisionAuthority ?? 'root';
  const readyForAdoption = isReadyForInstitutionalAdoption(input.currentRow);
  if (readyForAdoption && input.decision === 'accept' && authority !== 'root') {
    return { ok: false as const, error: 'root_adoption_authority_required' };
  }
  const next = readyForAdoption && input.decision === 'accept' ? 'accepted' : nextStateForRootDecision(current, input.decision);
  if (!next) return { ok: false as const, error: 'invalid_governance_transition', details: { current, decision: input.decision } };

  const expectedStatuses = current === 'design_approved' && stringValue(input.currentRow.status)?.toLowerCase() === 'approved'
    ? ['approved']
    : current === 'unknown' ? [] : [stringValue(input.currentRow.status)?.toLowerCase() ?? current];
  if (!expectedStatuses.length) return { ok: false as const, error: 'unknown_proposal_status' };

  const priorOutcome = recordValue(input.currentRow.outcome);
  const priorPatch = recordValue(priorOutcome.payloadPatch);
  const event = await appendOperationalEvent({
    eventName: readyForAdoption && next === 'accepted' ? 'acp.proposal.institutional_adoption_accepted' : `acp.proposal.${next}`,
    actorId: input.actorId,
    confidence: 1,
    payload: {
      proposal_id: input.proposalId,
      previous_status: current,
      next_status: next,
      governance_decision: input.decision,
      decision_actor_id: input.actorId,
      decision_actor_label: input.actorLabel ?? null,
      decision_authority: authority,
      founder_decision: authority === 'root' ? input.decision : null,
      approval_only: next === 'design_approved',
      institutional_adoption: readyForAdoption && next === 'accepted',
      return_event_id: readyForAdoption ? stringValue(priorPatch.returnEventId) : null,
      execution_allowed: false,
      // Canon is a distinct ROOT-only decision after RETURN/evaluation. Merely
      // being ROOT does not grant a proposal a standing promotion permission.
      canonical_promotion_allowed: false,
      note: input.note ?? null,
    },
    lineage: [input.proposalId, ...(readyForAdoption && stringValue(priorPatch.returnEventId) ? [stringValue(priorPatch.returnEventId)!] : [])],
  });
  if (!event.ok) return event;

  const expected = expectedStatuses as Parameters<typeof updateActionProposalStatus>[0]['expectedStatuses'];
  return updateActionProposalStatus({
    proposalId: input.proposalId,
    status: next,
    actorId: input.actorId,
    // This flag only bypasses proposal ownership after the caller has passed
    // institutional governance authorization. Canonical promotion remains a
    // separate ROOT-only endpoint.
    isRoot: true,
    proposalType: proposalTypeOf(input.currentRow),
    expectedStatuses: expected,
    eventId: event.data.id,
    payloadPatch: {
      ...priorPatch,
      governanceDecision: input.decision,
      decisionActorId: input.actorId,
      decisionActorLabel: input.actorLabel ?? null,
      decisionAuthority: authority,
      institutionalAdoptionRecorded: readyForAdoption && next === 'accepted',
      institutionalAdoptionState: readyForAdoption && next === 'accepted' ? 'ADOPTED_FOR_INSTITUTIONAL_USE' : priorPatch.institutionalAdoptionState ?? null,
      adoptedAt: readyForAdoption && next === 'accepted' ? new Date().toISOString() : priorPatch.adoptedAt ?? null,
      adoptedBy: readyForAdoption && next === 'accepted' ? input.actorId : priorPatch.adoptedBy ?? null,
      canonicalPromotionAllowed: false,
      previousStatus: current,
      nextStatus: next,
      executionAllowed: false,
      note: input.note ?? priorPatch.note ?? null,
    },
  });
}
