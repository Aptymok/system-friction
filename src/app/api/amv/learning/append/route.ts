import { NextRequest, NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { appendAmvLearning } from '@/lib/amv/learning';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 16_384;

export async function POST(request: NextRequest) {
  const gate = await requireRootActor('root.amv.learning.append');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'amv_learning_payload_too_large' }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: 'amv_learning_object_required' }, { status: 400 });
  }
  if (JSON.stringify(body).length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'amv_learning_payload_too_large' }, { status: 413 });
  }

  const event = await appendAmvLearning({
    case_id: typeof body.case_id === 'string' ? body.case_id.slice(0, 128) : null,
    source: typeof body.source === 'string' ? body.source.slice(0, 120) : 'amv.api',
    event_type: typeof body.event_type === 'string' ? body.event_type.slice(0, 80) : 'learning',
    summary: typeof body.summary === 'string' ? body.summary.slice(0, 4_000) : 'aprendizaje registrado.',
    payload: body.payload ?? body,
  });
  return NextResponse.json({ ok: true, event }, { headers: { 'Cache-Control': 'private, no-store' } });
}
