import { NextRequest, NextResponse } from 'next/server';
import { appendAmvLearning } from '@/lib/amv/learning';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const event = await appendAmvLearning({
    case_id: typeof body.case_id === 'string' ? body.case_id : null,
    source: typeof body.source === 'string' ? body.source : 'amv.api',
    event_type: typeof body.event_type === 'string' ? body.event_type : 'learning',
    summary: typeof body.summary === 'string' ? body.summary : 'aprendizaje registrado.',
    payload: body.payload ?? body,
  });
  return NextResponse.json({ ok: true, event });
}

