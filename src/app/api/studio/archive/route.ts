import { NextResponse } from 'next/server';
import { listStudioArchive } from '@/lib/studio/production/studioProductionRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await listStudioArchive();
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
