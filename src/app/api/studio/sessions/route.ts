import { NextResponse } from 'next/server';
import { createStudioSession, listStudioSessions } from '@/lib/studio/production/studioProductionRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await listStudioSessions();
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await createStudioSession({ title: typeof body.title === 'string' ? body.title : null });
  return NextResponse.json(result, { status: result.ok ? 201 : result.status });
}
