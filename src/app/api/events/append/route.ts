import { NextRequest, NextResponse } from 'next/server';
import { appendEpistemicEvent } from '@/lib/events/eventStore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await appendEpistemicEvent(body);
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
