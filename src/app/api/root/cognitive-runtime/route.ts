import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { publishCognitiveTaskGraph, readSfiCognitiveRuntime } from '@/lib/sfi/cognitive-runtime/runtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootActor('root.cognitive-runtime.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  return NextResponse.json({ ok: true, runtime: await readSfiCognitiveRuntime() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.cognitive-runtime.plan');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({}));
  const question = body && typeof body === 'object' && 'question' in body ? String(body.question ?? '') : '';
  const result = await publishCognitiveTaskGraph(question);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, details: result.details ?? null, taskGraph: result.taskGraph }, { status: 503 });
  }

  return NextResponse.json({ ok: true, taskGraph: result.taskGraph, event: result.event });
}
