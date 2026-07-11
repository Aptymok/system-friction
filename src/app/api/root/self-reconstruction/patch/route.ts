import { NextRequest, NextResponse } from 'next/server';
import { registerSelfReconstructionPatch } from '@/lib/root/selfReconstruction';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const gate = await requireRootActor('self-reconstruction.patch');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const body = await request.json().catch(() => ({}));
  const result = await registerSelfReconstructionPatch(body);
  const audit = await auditRootAction({ actorId: gate.ctx.user.id, action: 'self-reconstruction.patch', target: 'root_reconstruction', payload: { ok: result.ok }, request });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });
  return NextResponse.json({ ...result, audit });
}
