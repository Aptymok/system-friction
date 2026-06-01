import { NextResponse } from 'next/server';
import { requireGovernedActor } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

const agents = [
  {
    agentId: 'sfi.observer',
    label: 'Observer Agent',
    role: 'observer',
    responsibility: 'Read field state, surface evidence, and expose missing observations.',
    allowedActions: ['read_observatory_state', 'read_twin_state', 'read_proposal_queue'],
    forbiddenActions: ['approve_proposal', 'prepare_action', 'execute_external_action'],
    executionAuthority: false,
  },
  {
    agentId: 'sfi.proposer',
    label: 'Proposal Agent',
    role: 'proposer',
    responsibility: 'Generate proposals anchored to seed evidence and MIHM runtime state.',
    allowedActions: ['create_twin_proposal', 'attach_seed_evidence', 'declare_risk_level'],
    forbiddenActions: ['approve_own_proposal', 'execute_external_action'],
    executionAuthority: false,
  },
  {
    agentId: 'sfi.verifier',
    label: 'Verifier Agent',
    role: 'verifier',
    responsibility: 'Check proposal coherence, evidence coverage, and governance status before preparation.',
    allowedActions: ['review_seed_evidence', 'verify_transition_log', 'flag_missing_evidence'],
    forbiddenActions: ['execute_external_action'],
    executionAuthority: false,
  },
  {
    agentId: 'sfi.acp',
    label: 'ACP Governance Agent',
    role: 'governance',
    responsibility: 'Approve, reject, prepare, or close proposals under root governance.',
    allowedActions: ['approve_proposal', 'reject_proposal', 'prepare_non_automatic_action', 'record_outcome'],
    forbiddenActions: ['silent_execution', 'unlogged_mutation'],
    executionAuthority: false,
  },
  {
    agentId: 'sfi.executor.pending',
    label: 'Execution Agent Pending',
    role: 'executor_pending',
    responsibility: 'Reserved execution surface. Not authorized until explicit execution layer exists.',
    allowedActions: ['none'],
    forbiddenActions: ['execute_external_action', 'mutate_field_state', 'dispatch_messages'],
    executionAuthority: false,
  },
];

export async function GET() {
  const gate = await requireGovernedActor('acp.agents.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  if (!gate.ctx.isRoot) return NextResponse.json({ ok: false, error: 'root_required' }, { status: 403 });

  return NextResponse.json({
    ok: true,
    data: {
      agents,
      runtimeContract: {
        executionAuthority: false,
        currentMode: 'governed_multi_agent_scaffold',
        activeLoop: ['observer', 'proposer', 'governance', 'preparation', 'outcome'],
        missingLoop: ['verifier_review_persistence', 'explicit_execution_authorization'],
      },
    },
  });
}
