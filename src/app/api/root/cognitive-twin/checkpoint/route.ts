import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { createLineageCheckpoint } from '@/core/cognitive-twin/reentry/checkpoint';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const gate = await requireRootActor('root.cognitive-twin.checkpoint.create');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const result = await createLineageCheckpoint(gate.ctx.user.id);
    const audit = await auditRootAction({
      actorId: gate.ctx.user.id,
      action: 'root.cognitive-twin.checkpoint.create',
      target: result.checkpointHash,
      payload: { taskId: result.taskId, created: result.created, checkpointHash: result.checkpointHash, externalAnchor: 'PENDING_EXTERNAL_ANCHOR' },
      request,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });
    return NextResponse.json({ ok: true, ...result, audit });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'cognitive_twin_checkpoint_failed', details: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}
