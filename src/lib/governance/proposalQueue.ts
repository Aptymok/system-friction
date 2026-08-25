import { appendOperationalEvent, recordValue, stringValue, updateActionProposalStatus } from '@/lib/operational/common';
import type { ProposalDecisionAuthority } from '@/lib/governance/proposalLifecycle';

function proposalTypeOf(input: Record<string, unknown>) {
  const expectedFieldDelta = recordValue(input.expected_field_delta);
  const proportionality = recordValue(input.proportionality_check);
  return stringValue(input.proposal_type)
    ?? stringValue(expectedFieldDelta.proposalType)
    ?? stringValue(expectedFieldDelta.proposal_type)
    ?? stringValue(proportionality.proposalType)
    ?? stringValue(proportionality.proposal_type)
    ?? 'unknown';
}

export function buildGovernedExecutionPlan(input: Record<string, unknown>) {
  const expectedFieldDelta = recordValue(input.expected_field_delta);
  const payload = recordValue(expectedFieldDelta.payload);
  const seedEvidence = recordValue(payload.seed_evidence);
  const catalogCounts = recordValue(seedEvidence.catalogCounts);
  return {
    mode: 'governed_execution_queue',
    sourceProposalId: input.id ?? null,
    proposalType: proposalTypeOf(input),
    authorization: 'proposal_scope_only',
    executionAuthorized: true,
    requiresExecutor: true,
    requiresObservedReturn: true,
    canonicalPromotionAllowed: false,
    externalExecutionAutomaticallyGranted: false,
    seedHash: payload.seed_hash ?? expectedFieldDelta.specHash ?? null,
    evidenceSummary: {
      nodes: Array.isArray(seedEvidence.nodes) ? seedEvidence.nodes.length : 0,
      patterns: Array.isArray(seedEvidence.patterns) ? seedEvidence.patterns.length : 0,
      documents: Array.isArray(seedEvidence.documents) ? seedEvidence.documents.length : 0,
      mihmSourceState: recordValue(seedEvidence.mihmRuntimeMatrix).sourceState ?? null,
      accessMode: seedEvidence.accessMode ?? null,
      catalogCounts,
    },
    next: ['executor_performs_authorized_scope', 'executor_records_return', 'governance_evaluates_return'],
    guardrails: [
      'no_scope_escalation',
      'no_canonical_promotion_by_executor',
      'preserve_actor_and_decision_lineage',
      'return_required_before_claiming_realization',
    ],
  };
}

export async function queueApprovedProposal(input: {
  proposalId: string;
  actorId: string;
  actorLabel?: string | null;
  decisionAuthority: ProposalDecisionAuthority;
  currentRow: Record<string, unknown>;
  note?: string | null;
}) {
  const proposalType = proposalTypeOf(input.currentRow);
  const executionPlan = buildGovernedExecutionPlan(input.currentRow);
  const previousOutcome = recordValue(input.currentRow.outcome);
  const previousPatch = recordValue(previousOutcome.payloadPatch);

  const event = await appendOperationalEvent({
    eventName: 'acp.proposal.queued',
    actorId: input.actorId,
    confidence: 1,
    payload: {
      proposal_id: input.proposalId,
      proposal_type: proposalType,
      previous_status: input.currentRow.status ?? null,
      next_status: 'queued',
      queue_authorized_by: input.actorId,
      queue_authorized_by_label: input.actorLabel ?? null,
      decision_authority: input.decisionAuthority,
      execution_plan: executionPlan,
      note: input.note ?? null,
    },
    lineage: [input.proposalId],
  });
  if (!event.ok) return event;

  return updateActionProposalStatus({
    proposalId: input.proposalId,
    status: 'queued',
    actorId: input.actorId,
    // The caller has already passed governance authority. This bypass is only
    // for proposal ownership; it does not grant ROOT or canonical promotion.
    isRoot: true,
    proposalType,
    expectedStatuses: ['design_approved'],
    eventId: event.data.id,
    payloadPatch: {
      ...previousPatch,
      queueAuthorized: true,
      queueAuthorizedAt: new Date().toISOString(),
      queueAuthorizedBy: input.actorId,
      queueAuthorizedByLabel: input.actorLabel ?? null,
      executionPlan,
      requiresExecutorReturn: true,
      canonicalPromotionAllowed: false,
      note: input.note ?? previousPatch.note ?? null,
    },
  });
}
