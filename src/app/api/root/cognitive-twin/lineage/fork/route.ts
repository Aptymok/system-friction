import { NextRequest, NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { registerCognitiveTwinFork } from '@/core/cognitive-twin/reentry/experiments';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const gate = await requireRootActor('root.cognitive-twin.fork.register');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  try {
    const body = await request.json().catch(() => ({})) as { snapshotHash?: string; childSubjectId?: string };
    if (!body.snapshotHash?.trim()) return NextResponse.json({ ok: false, error: 'snapshot_hash_required' }, { status: 400 });
    const actorId = gate.ctx.user!.id;
    const result = await registerCognitiveTwinFork({ actorId, snapshotHash: body.snapshotHash.trim(), childSubjectId: body.childSubjectId });
    const audit = await auditRootAction({ actorId, action: 'cognitive-twin.fork.register', target: result.forkManifest.childSubjectId, payload: { taskId: result.taskId, forkHash: result.forkHash, parentSnapshotHash: body.snapshotHash, created: result.created }, request });
    if (!audit.ok) return NextResponse.json({ ok: false, error: audit.error, details: audit.details, result }, { status: 503 });
    return NextResponse.json({ ok: true, result, audit });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'cognitive_twin_fork_failed', details: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}
