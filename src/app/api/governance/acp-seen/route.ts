import { NextResponse } from 'next/server';
import { recordAcpSeen } from '@/lib/governance/governanceRuntime';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const gate = await requireRootActor('governance.acp.presence');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const result = await recordAcpSeen(gate.ctx.user.id, gate.ctx.user.email ?? null);

  if (!result.ok) {
    return NextResponse.json(result, { status: 409 });
  }

  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'governance.acp.presence',
    target: 'SFI_ROOT',
    payload: { eventId: result.data.eventId, observedAt: result.data.acpLastSeenAt },
    request,
  });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });
  return NextResponse.json({ ...result, audit });
}
