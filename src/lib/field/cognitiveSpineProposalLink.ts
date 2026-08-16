import 'server-only';

import { canonicalSha256 } from '@/core/cognitive-spine/serialization/canonicalSerialize';
import { appendOperationalEvent, recordValue, stringValue } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { createGovernedFieldCycle, type GovernedFieldCreateInput } from './governedReturn';

type Row = Record<string, unknown>;
function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

const LINKABLE_PROPOSAL_STATES = new Set(['design_approved', 'queued']);

function spineProvenanceFromProposal(proposal: Row) {
  const expectedDelta = record(proposal.expected_field_delta);
  const payload = record(expectedDelta.payload);
  const cognitiveSpine = record(payload.cognitiveSpine);
  const proposalType = text(expectedDelta.proposalType) ?? text(record(proposal.proportionality_check).proposalType);
  if (proposalType !== 'cognitive_spine_runtime_proposal') {
    throw new Error('FIELD_COGNITIVE_SPINE_PROPOSAL_TYPE_INVALID');
  }
  const sourceRunId = text(cognitiveSpine.sourceRunId);
  const snapshotId = text(cognitiveSpine.snapshotId);
  const snapshotHash = text(cognitiveSpine.snapshotHash);
  const sourceCutoff = text(cognitiveSpine.sourceCutoff);
  if (!sourceRunId || !snapshotId || !snapshotHash || !sourceCutoff) {
    throw new Error('FIELD_COGNITIVE_SPINE_PROPOSAL_PROVENANCE_MISSING');
  }
  return { sourceRunId, snapshotId, snapshotHash, sourceCutoff };
}

/**
 * Optional bridge: a Field cycle may be opened from a ROOT-reviewed Cognitive
 * Spine proposal. Field remains independently usable without this bridge.
 *
 * A design-approved/queued proposal is context, not proof and not automatic
 * execution authority. Participant consent and the Field execution
 * acknowledgement remain separate requirements.
 */
export async function createGovernedFieldCycleFromCognitiveSpineProposal(input: {
  ownerId: string;
  proposalId: string;
  cycle: GovernedFieldCreateInput;
}) {
  const db = createServiceSupabaseClient();
  const proposalResult = await db.from('action_proposals')
    .select('*')
    .eq('id', input.proposalId)
    .maybeSingle();
  if (proposalResult.error || !proposalResult.data) throw new Error('FIELD_COGNITIVE_SPINE_PROPOSAL_NOT_FOUND');
  const proposal = record(proposalResult.data);
  const state = text(proposal.status);
  if (!state || !LINKABLE_PROPOSAL_STATES.has(state)) {
    throw new Error(`FIELD_COGNITIVE_SPINE_PROPOSAL_NOT_LINKABLE:${state ?? 'missing'}`);
  }
  const spine = spineProvenanceFromProposal(proposal);

  const result = await createGovernedFieldCycle(input.ownerId, input.cycle);
  const fieldCase = record(result.case);
  const caseId = text(fieldCase.id);
  if (!caseId) throw new Error('FIELD_COGNITIVE_SPINE_LINK_CASE_ID_MISSING');
  const linkedAt = new Date().toISOString();
  const linkSemantic = {
    contract: 'SFI-CT-FIELD-PROPOSAL-LINK-1.0',
    proposalId: input.proposalId,
    proposalStatusAtLink: state,
    proposalEventId: text(proposal.event_id),
    fieldCaseId: caseId,
    sourceRunId: spine.sourceRunId,
    snapshotId: spine.snapshotId,
    snapshotHash: spine.snapshotHash,
    sourceCutoff: spine.sourceCutoff,
    participantConsent: true,
    automaticExecution: false,
  };
  const linkHash = canonicalSha256(linkSemantic);

  const event = await appendOperationalEvent({
    eventName: 'cognitive_spine.proposal.field_case_linked',
    actorId: input.ownerId,
    confidence: 1,
    payload: {
      ...linkSemantic,
      linkHash,
      rule: 'The governed proposal is context for this Field case. Linking does not constitute execution, causal validation, or epistemic promotion.',
    },
    lineage: [input.proposalId, caseId, spine.sourceRunId, spine.snapshotHash],
  });
  if (!event.ok) throw new Error(`FIELD_COGNITIVE_SPINE_LINK_EVENT_FAILED:${'error' in event ? event.error : 'unknown'}`);

  const metadata = record(fieldCase.metadata);
  const link = {
    ...linkSemantic,
    linkEventId: event.data.id,
    linkedAt,
    linkHash,
  };
  const update = await db.from('field_cases')
    .update({
      metadata: {
        ...metadata,
        cognitiveSpineProposalLink: link,
      },
      updated_at: linkedAt,
    })
    .eq('id', caseId)
    .eq('owner_id', input.ownerId)
    .select('*')
    .single();
  if (update.error || !update.data) throw new Error(`FIELD_COGNITIVE_SPINE_LINK_PERSIST_FAILED:${update.error?.message ?? 'unknown'}`);

  return {
    ...result,
    case: update.data,
    cognitiveSpineProposalLink: link,
    proposal: {
      id: input.proposalId,
      status: state,
      title: stringValue(proposal.title),
      expectedFieldDelta: recordValue(proposal.expected_field_delta),
    },
  };
}
