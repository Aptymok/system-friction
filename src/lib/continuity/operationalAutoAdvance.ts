import 'server-only';

import { readEvidenceReadiness } from '@/lib/evidence/evidenceCandidates';
import { dispatchQueuedProposal } from '@/lib/execution/governedExecutionRouter';
import { decideActionProposal } from '@/lib/governance/proposalLifecycle';
import { queueApprovedProposal } from '@/lib/governance/proposalQueue';
import { classifyProposalDecisionBoundary } from '@/lib/governance/rootDecisionBoundary';
import { recordValue, stringValue } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

const AUTO_ACTOR = 'sfi_operational_controller';

function proposalType(row: Row) {
  const expected = recordValue(row.expected_field_delta);
  const payload = recordValue(expected.payload);
  const proportionality = recordValue(row.proportionality_check);
  return stringValue(row.proposal_type)
    ?? stringValue(expected.proposalType)
    ?? stringValue(expected.proposal_type)
    ?? stringValue(payload.proposalType)
    ?? stringValue(payload.proposal_type)
    ?? stringValue(proportionality.proposalType)
    ?? stringValue(proportionality.proposal_type)
    ?? 'unknown';
}

function explicitEvidenceRequired(row: Row) {
  const expected = recordValue(row.expected_field_delta);
  const payload = recordValue(expected.payload);
  const candidates = [
    payload.evidenceSlots,
    payload.evidence_slots,
    payload.requiredEvidence,
    payload.required_evidence,
    expected.evidenceSlots,
    expected.requiredEvidence,
  ];
  return candidates.some((value) => Array.isArray(value) && value.length > 0);
}

function riskState(row: Row) {
  return stringValue(row.risk_level)?.toLowerCase() ?? 'unknown';
}

async function requestOperationalEvidence(row: Row, proposalId: string) {
  return decideActionProposal({
    proposalId,
    actorId: AUTO_ACTOR,
    actorLabel: 'SFI operational controller',
    decision: 'request_evidence',
    decisionAuthority: 'controller',
    currentRow: row,
    note: 'Operational evidence acquisition requested automatically. This is not a ROOT decision and does not authorize canon or an external effect.',
  });
}

async function authorizeAndDispatchOperational(row: Row, proposalId: string) {
  const decision = await decideActionProposal({
    proposalId,
    actorId: AUTO_ACTOR,
    actorLabel: 'SFI operational controller',
    decision: 'accept',
    decisionAuthority: 'controller',
    currentRow: row,
    note: 'Routine operational work advanced automatically inside existing authority. No founder approval was required.',
  });
  if (!decision.ok) return { ok: false as const, stage: 'authorize', proposalId, error: decision.error };

  const queue = await queueApprovedProposal({
    proposalId,
    actorId: AUTO_ACTOR,
    actorLabel: 'SFI operational controller',
    decisionAuthority: 'controller',
    currentRow: decision.data as Row,
    note: 'Automatically queued after non-sovereign operational authorization.',
  });
  if (!queue.ok) return { ok: false as const, stage: 'queue', proposalId, error: queue.error };

  const execution = await dispatchQueuedProposal(proposalId);
  return {
    ok: execution.ok,
    stage: execution.ok ? 'dispatched' : 'dispatch_blocked',
    proposalId,
    decisionClass: 'OPERATIONAL_WORK' as const,
    execution,
    canonicalPromotionAllowed: false,
    founderApprovalRequired: false,
  };
}

async function advanceOne(row: Row) {
  const proposalId = stringValue(row.id);
  if (!proposalId) return { ok: false as const, stage: 'invalid', error: 'proposal_id_missing' };
  if (proposalType(row) === 'evidence_candidate') return { ok: true as const, stage: 'skipped_evidence_candidate', proposalId };

  const decisionClass = classifyProposalDecisionBoundary(row);
  if (decisionClass !== 'OPERATIONAL_WORK') {
    return {
      ok: true as const,
      stage: 'sovereign_boundary',
      proposalId,
      decisionClass,
      founderApprovalRequired: true,
    };
  }

  const risk = riskState(row);
  if (risk === 'unknown') return { ok: true as const, stage: 'risk_pending', proposalId, founderApprovalRequired: false };
  if (risk === 'unassessable' || risk === 'missing_input_for_risk') {
    return { ok: true as const, stage: 'missing_risk_input', proposalId, founderApprovalRequired: false };
  }

  const status = stringValue(row.status)?.toLowerCase();
  if (status === 'proposed' && explicitEvidenceRequired(row)) {
    const request = await requestOperationalEvidence(row, proposalId);
    return {
      ok: request.ok,
      stage: request.ok ? 'evidence_requested' : 'evidence_request_failed',
      proposalId,
      founderApprovalRequired: false,
      result: request,
    };
  }

  if (status === 'waiting_evidence') {
    const readiness = await readEvidenceReadiness(proposalId);
    if (!readiness.ok || !readiness.readiness) {
      return { ok: false as const, stage: 'evidence_read_failed', proposalId, error: readiness.error ?? 'evidence_readiness_unavailable' };
    }
    if (readiness.readiness.state !== 'SATISFIED') {
      return {
        ok: true as const,
        stage: 'evidence_pending',
        proposalId,
        readiness: readiness.readiness,
        founderApprovalRequired: false,
      };
    }
  }

  if (status !== 'proposed' && status !== 'waiting_evidence') {
    return { ok: true as const, stage: 'not_eligible_state', proposalId, status, founderApprovalRequired: false };
  }

  return authorizeAndDispatchOperational(row, proposalId);
}

export async function runOperationalAutoAdvance(input: { limit?: number } = {}) {
  const db = createServiceSupabaseClient();
  const limit = Math.max(1, Math.min(25, input.limit ?? 10));
  const read = await db.from('action_proposals')
    .select('*')
    .in('status', ['proposed', 'waiting_evidence'])
    .order('created_at', { ascending: true })
    .limit(120);
  if (read.error) return { ok: false as const, error: read.error.message, processed: 0, results: [] };

  const rows = (read.data ?? []) as Row[];
  const eligible = rows.filter((row) => proposalType(row) !== 'evidence_candidate').slice(0, limit);
  const results = [] as Awaited<ReturnType<typeof advanceOne>>[];
  for (const row of eligible) {
    results.push(await advanceOne(row).catch((error) => ({
      ok: false as const,
      stage: 'exception',
      proposalId: stringValue(row.id) ?? 'unknown',
      error: error instanceof Error ? error.message : String(error),
    })));
  }

  return {
    ok: results.every((item) => item.ok !== false),
    processed: results.length,
    results,
    policy: {
      default: 'AUTONOMOUS_UNTIL_SOVEREIGN_BOUNDARY',
      founderApprovalForOperationalWork: false,
      evidenceSourceApprovalRequired: false,
      sovereignClassesRemainBlocked: true,
      canonicalPromotionAllowed: false,
    },
  };
}
