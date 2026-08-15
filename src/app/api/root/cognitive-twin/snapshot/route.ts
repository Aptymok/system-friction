import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { createCognitiveTwinSnapshot } from '@/core/cognitive-twin/reentry/experiments';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const gate = await requireRootActor('root.cognitive-twin.snapshot.create');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const result = await createCognitiveTwinSnapshot(gate.ctx.user.id);
    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'root.cognitive-twin.snapshot.create',
      target: result.snapshotHash,
      payload: { taskId: result.taskId, created: result.created, snapshotHash: result.snapshotHash },
      request,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });
    return NextResponse.json({ ok: true, result, audit });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'cognitive_twin_snapshot_failed', details: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}
