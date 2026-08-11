import 'server-only';

import { readGovernanceRuntime } from '@/lib/governance/governanceRuntime';
import { normalizeProposalState, proposalStateMeaning } from '@/lib/governance/proposalLifecycle';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

const STATES = ['draft','proposed','waiting_evidence','design_approved','queued','accepted','rejected','conflicted','frozen','superseded'] as const;

function text(value: unknown) { return typeof value === 'string' ? value : ''; }
function rec(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }

export async function readGovernanceHealth() {
  const service = createServiceSupabaseClient();
  const [runtime, proposals, decisions, reports, events] = await Promise.all([
    readGovernanceRuntime(),
    service.from('action_proposals').select('*').order('created_at', { ascending: false }).limit(500),
    service.from('sfi_cognitive_twin_decisions').select('id,status,decision_kind,created_at').order('created_at', { ascending: false }).limit(200),
    service.from('sfi_cognitive_twin_runs').select('id,status,role,output_envelope,created_at').order('created_at', { ascending: false }).limit(200),
    service.from('epistemic_events').select('id,event_id,event_name,payload,occurred_at,created_at').like('event_name', 'governance.%').order('occurred_at', { ascending: false }).limit(200),
  ]);

  const rows = (proposals.data ?? []) as Row[];
  const counts = Object.fromEntries(STATES.map((state) => [state, 0])) as Record<(typeof STATES)[number], number>;
  let legacyApproved = 0;
  let unknown = 0;
  for (const row of rows) {
    if (text(row.status).toLowerCase() === 'approved') legacyApproved += 1;
    const state = normalizeProposalState(row.status);
    if (state === 'unknown') unknown += 1;
    else counts[state] += 1;
  }

  const ctPending = ((decisions.data ?? []) as Row[]).filter((row) => ['CANDIDATE','WAITING_EVIDENCE'].includes(text(row.status).toUpperCase())).length;
  const reportPending = ((reports.data ?? []) as Row[]).filter((row) => {
    const approval = rec(rec(row.output_envelope).approval_queue);
    return ['queued_for_approval','waiting_evidence'].includes(text(approval.status).toLowerCase());
  }).length;
  const promotionReceipts = ((events.data ?? []) as Row[]).filter((row) => text(row.event_name) === 'governance.promotion.accepted').length;
  const conflictEvents = ((events.data ?? []) as Row[]).filter((row) => text(row.event_name) === 'governance.conflict.declared').length;

  const warnings = [proposals.error?.message, decisions.error?.message, reports.error?.message, events.error?.message].filter(Boolean) as string[];
  if (legacyApproved) warnings.push(`legacy_action_proposals_approved:${legacyApproved}`);
  if (unknown) warnings.push(`unknown_action_proposal_status:${unknown}`);

  return {
    generatedAt: new Date().toISOString(),
    runtime,
    proposalLifecycle: {
      counts,
      legacyApproved,
      unknown,
      states: STATES.map((state) => ({ state, meaning: proposalStateMeaning(state) })),
    },
    sovereignInbox: { proposals: counts.proposed + counts.waiting_evidence + counts.conflicted, ctDecisions: ctPending, reports: reportPending },
    receipts: { promotions: promotionReceipts, conflictEvents },
    crl: {
      persistenceDecision: 'PENDING_ROOT_ACP_DECISION',
      decisionObject: 'CRL_PERSISTENCE_MODEL',
      options: ['DEDICATED_PROTOCOL_TABLES','SHARED_METHOD_LAB_LEDGER_ONLY','HYBRID_GOVERNED_MIGRATION'],
      boundary: 'Code presence and a migration file do not constitute approval or live schema application.',
    },
    healthy: runtime.status === 'active' && !runtime.blindMode && !warnings.length && counts.conflicted === 0,
    warnings,
  };
}

export type GovernanceHealth = Awaited<ReturnType<typeof readGovernanceHealth>>;
