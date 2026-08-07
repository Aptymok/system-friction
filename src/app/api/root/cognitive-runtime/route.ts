import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { readObservedSfiCognitiveRuntime } from '@/lib/sfi/cognitive-runtime/observedRuntime';
import { planCognitiveQuestion } from '@/lib/sfi/cognitive-runtime/planning';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootActor('root.cognitive-runtime.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  return NextResponse.json({ ok: true, runtime: await readObservedSfiCognitiveRuntime() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.cognitive-runtime.plan');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({}));
  const question = body && typeof body === 'object' && 'question' in body ? String(body.question ?? '').trim() : '';
  if (!question) return NextResponse.json({ ok: false, error: 'question_required' }, { status: 400 });

  const result = await planCognitiveQuestion(question, gate.ctx.user.id);
  if (!result.ok) return NextResponse.json(result, { status: 503 });
  return NextResponse.json(result);
}
