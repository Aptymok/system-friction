import { NextResponse } from 'next/server';
import { listStudioObjects } from '@/lib/studio/production/studioProductionRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  const result = await listStudioObjects(sessionId);
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
