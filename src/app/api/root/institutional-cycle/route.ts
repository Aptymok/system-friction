import { NextResponse } from 'next/server';
import { runIntegratedInstitutionalCycle } from '@/lib/cognitive-twin/integratedInstitutionalCycle';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  const gate = await requireRootActor('institutional_cycle.execute');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const result = await runIntegratedInstitutionalCycle('root_manual_cycle');
  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'institutional_cycle.execute',
    target: 'sfi_cognitive_twin_runs',
    payload: {
      taskId: result.taskId,
      cycleId: result.cycleId,
      status: result.status,
      agentCount: result.agentCount,
      warnings: result.warnings,
      cognitiveTwinIntegration: result.cognitiveTwinIntegration,
    },
    request,
  });

  if (!audit.ok) return NextResponse.json({ ok: false, error: 'institutional_cycle_audit_failed', result, audit }, { status: 500 });
  return NextResponse.json({ ok: result.ok, result, audit }, { status: result.ok ? 200 : 207 });
}
