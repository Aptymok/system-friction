import { NextResponse } from 'next/server';
import { ingestAmvEvidence, readAmvOperationalMemory } from '@/lib/agents/amvAgent';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const operation = typeof body.operation === 'string' ? body.operation : 'search';
  const gate = await requireRootActor(operation === 'ingest' ? 'agentic.amv.ingest' : 'agentic.amv.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  if (operation === 'ingest') {
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (text.length < 6) return NextResponse.json({ ok: false, error: 'text_required' }, { status: 400 });
    const result = await ingestAmvEvidence({
      source: typeof body.source === 'string' ? body.source : 'root_manual',
      text,
      caseId: typeof body.caseId === 'string' ? body.caseId : null,
    });
    const audit = await auditRootAction({ actorId: gate.ctx.user.id, action: 'agentic.amv.ingest', target: 'sfi_amv_memory', payload: { source: body.source ?? 'root_manual', caseId: body.caseId ?? null, ok: result.ok }, request });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });
    return NextResponse.json({ ...result, audit });
  }

  const result = await readAmvOperationalMemory({
    query: typeof body.query === 'string' ? body.query : null,
    useEmbeddings: body.useEmbeddings === true,
  });
  return NextResponse.json(result);
}
