import { NextRequest, NextResponse } from 'next/server';
import { streamEpistemicEvents } from '@/lib/events/eventStore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const logbookId = request.nextUrl.searchParams.get('logbookId') ?? 'default';
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 100);
  const result = await streamEpistemicEvents(logbookId, limit);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
