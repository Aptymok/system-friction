import { NextResponse } from 'next/server';
import { auditRootAction, readTableHealth, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

const CRITICAL_TABLES = [
  'profiles',
  'nodes',
  'graph_nodes',
  'graph_edges',
  'logbook_mutations',
  'action_proposals',
  'mihm_analyses',
  'epistemic_events',
  'root_audit_events',
  'root_evidence_entries',
  'accounts',
  'account_members',
  'usage_ledger',
  'account_balance',
];

export async function GET(req: Request) {
  const gate = await requireRootActor('state.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const tables = await Promise.all(CRITICAL_TABLES.map((table) => readTableHealth(table, 5)));
  const warnings = tables.flatMap((table) => table.warning ? [`${table.table}: ${table.warning}`] : []);
  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'state.read',
    target: 'root_state',
    payload: {
      checkedTables: CRITICAL_TABLES,
      warningCount: warnings.length,
    },
    request: req,
  });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });

  return NextResponse.json({
    ok: warnings.length === 0,
    data: {
      supabase: { ok: true, checkedAt: new Date().toISOString() },
      identity: {
        userId: gate.ctx.user.id,
        email: gate.ctx.user.email ?? null,
        role: gate.ctx.profile?.role ?? null,
        isRoot: gate.ctx.isRoot,
      },
      permissions: {
        root: gate.ctx.isRoot,
        canReadState: true,
        canWriteEvidence: true,
        canAudit: true,
      },
      tables,
      warnings,
    },
  });
}
