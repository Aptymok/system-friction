import { NextRequest, NextResponse } from 'next/server';
import { analyzeOperationalInput } from '@/observatory/operational/analysis';
import { createCalendarSuggestion, getOperationalMemory, updateCalendar } from '@/observatory/operational/storage';

export async function GET() {
  return NextResponse.json({ calendar: getOperationalMemory().calendars });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.id && body.action) {
    const status = body.action === 'accept' ? 'accepted' : body.action === 'cancel' ? 'cancelled' : 'edited';
    const updated = updateCalendar(String(body.id), {
      status,
      scheduledFor: body.scheduledFor ? String(body.scheduledFor) : undefined,
      prompt: body.prompt ? String(body.prompt) : undefined,
      material: body.material ? String(body.material) : undefined,
    });
    return NextResponse.json({ success: Boolean(updated), item: updated });
  }

  const reading = body.reading ?? analyzeOperationalInput({ text: String(body.text ?? body.title ?? '') });
  const item = createCalendarSuggestion({
    sourceId: String(body.sourceId ?? 'analysis'),
    title: body.title ? String(body.title) : undefined,
    reading,
  });

  return NextResponse.json({
    success: true,
    item,
    adapters: ['instagram', 'tiktok', 'linkedin', 'x'].map((provider) => ({ provider, status: 'prepared' })),
  });
}
