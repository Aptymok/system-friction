import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { registerCognitiveTwinFork } from '@/core/cognitive-twin/reentry/experiments';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = { snapshotHash?: unknown; childSubjectId?: unknown };

export async function POST(request: Request) {
  const gate = await requireRootActor('root.cognitive-twin.fork.register');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => null) as Body | null;
  const snapshotHash = typeof body?.snapshotHash === 'string' ? body.snapshotHash.trim() : '';
  const childSubjectId = typeof body?.childSubjectId === 'string' ? body.childSubjectId.trim() || undefined : undefined;
  if (!snapshotHash) return NextResponse.json({ ok: false, error: 'snapshotHash_required' }, { status: 400 });

  try {
    const result = await registerCognitiveTwinFork({ actorId: gate.ctx.user.id, snapshotHash, childSubjectId });
    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'root.cognitive-twin.fork.register',
      target: result.forkManifest.childSubjectId,
      payload: { taskId: result.taskId, created: result.created, forkHash: result.forkHash, parentSnapshotHash: snapshotHash, status: result.forkManifest.status },
      request,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });
    return NextResponse.json({ ok: true, result, audit });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'cognitive_twin_fork_failed', details: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}
