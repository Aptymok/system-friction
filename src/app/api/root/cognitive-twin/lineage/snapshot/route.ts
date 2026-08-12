import { NextRequest, NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { createCognitiveTwinSnapshot } from '@/core/cognitive-twin/reentry/experiments';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const gate = await requireRootActor('root.cognitive-twin.snapshot.create');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  try {
    const actorId = gate.ctx.user!.id;
    const result = await createCognitiveTwinSnapshot(actorId);
    const audit = await auditRootAction({ actorId, action: 'cognitive-twin.snapshot.create', target: 'CT-A01', payload: { taskId: result.taskId, snapshotHash: result.snapshotHash, created: result.created }, request });
    if (!audit.ok) return NextResponse.json({ ok: false, error: audit.error, details: audit.details, result }, { status: 503 });
    return NextResponse.json({ ok: true, result, audit });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'cognitive_twin_snapshot_failed', details: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}
