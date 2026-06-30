import { NextResponse } from 'next/server';
import { ingestAmvEvidence, readAmvOperationalMemory } from '@/lib/agents/amvAgent';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const gate = await requireRootActor('agentic.amv');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const operation = typeof body.operation === 'string' ? body.operation : 'search';
  if (operation === 'ingest') {
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (text.length < 6) return NextResponse.json({ ok: false, error: 'text_required' }, { status: 400 });
    const result = await ingestAmvEvidence({
      source: typeof body.source === 'string' ? body.source : 'root_manual',
      text,
      caseId: typeof body.caseId === 'string' ? body.caseId : null,
    });
    return NextResponse.json(result);
  }

  const result = await readAmvOperationalMemory({
    query: typeof body.query === 'string' ? body.query : null,
    useEmbeddings: body.useEmbeddings === true,
  });
  return NextResponse.json(result);
}
