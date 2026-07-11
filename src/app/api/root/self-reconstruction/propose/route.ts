import { NextResponse } from 'next/server';
import { proposeSelfReconstruction } from '@/lib/root/selfReconstruction';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireRootActor('self-reconstruction.preview');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  return NextResponse.json(await proposeSelfReconstruction());
}

export async function POST(request: Request) {
  const gate = await requireRootActor('self-reconstruction.propose');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const result = await proposeSelfReconstruction();
  const audit = await auditRootAction({ actorId: gate.ctx.user.id, action: 'self-reconstruction.propose', target: 'root_reconstruction', payload: { ok: result.ok }, request });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });
  return NextResponse.json({ ...result, audit });
}
