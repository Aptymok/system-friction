import { NextResponse } from 'next/server';
import { proposeFromCognitiveSpineRun } from '@/lib/institution/cognitiveSpineProposal';
import { requireGovernedActor } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

type Row = Record<string, unknown>;
function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown, max = 4000): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireGovernedActor('cognitive_spine.run.propose');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  if (!gate.ctx.isRoot) return NextResponse.json({ ok: false, error: 'root_required' }, { status: 403 });

  try {
    const { id } = await Promise.resolve(context.params);
    const runId = decodeURIComponent(id).trim();
    if (!runId) return NextResponse.json({ ok: false, error: 'missing_run_id' }, { status: 400 });
    const body = record(await request.json().catch(() => ({})));
    const result = await proposeFromCognitiveSpineRun({
      runId,
      actorId: gate.ctx.user.id,
      title: text(body.title, 300),
      objective: text(body.objective, 4000),
      note: text(body.note, 4000),
    });
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const status = details.includes('NOT_FOUND') ? 404 : details.includes('NOT_PROMOTABLE') || details.includes('NOT_CONSUMED') ? 409 : 400;
    return NextResponse.json({ ok: false, error: 'COGNITIVE_SPINE_PROPOSAL_FAILED', details }, { status });
  }
}
