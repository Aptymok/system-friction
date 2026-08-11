import { NextResponse } from 'next/server';
import { createActionProposal, latestActionProposals } from '@/lib/operational/common';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PROPOSAL_TYPE = 'governance_crl_persistence';

export async function POST() {
  const gate = await requireRootActor('governance.crl.prepare_decision');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const existing = await latestActionProposals([PROPOSAL_TYPE], 100);
  const active = existing.data.find((row: Record<string, unknown>) => !['rejected','superseded'].includes(String(row.status ?? '').toLowerCase()));
  if (active) return NextResponse.json({ ok:true, created:false, proposal:active, boundary:'Existing CRL persistence governance object reused; no migration was applied.' });

  const result = await createActionProposal({
    proposalType: PROPOSAL_TYPE,
    actorId: gate.ctx.user.id,
    title: 'CRL persistence model governance',
    objective: 'Choose the governed persistence model for Cognitive Relational Lab before any protocol-specific production schema is treated as approved.',
    status: 'proposed',
    payload: {
      object:'CRL_PERSISTENCE_MODEL',
      sourceMigration:'supabase/migrations/20260810003000_cognitive_relational_lab_v1.sql',
      options:[
        { id:'DEDICATED_PROTOCOL_TABLES', effect:'Approve the three CRL-specific tables with explicit migration and rollback review.' },
        { id:'SHARED_METHOD_LAB_LEDGER_ONLY', effect:'Keep CRL persistence only in sfi_lab_analyses and do not apply the CRL-specific migration.' },
        { id:'HYBRID_GOVERNED_MIGRATION', effect:'Use the shared Method Lab ledger as institutional truth while allowing protocol tables as subordinate experimental storage.' },
      ],
      currentTruth:{ codePresent:true, migrationFilePresent:true, migrationGovernanceApproved:false, liveSchemaVerified:false },
      requiredForDecision:['evidence','tests','reproducibility','migration_plan','rollback_plan','limitations'],
      executionAllowed:false,
    },
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
