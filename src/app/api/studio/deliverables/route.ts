import { NextResponse } from 'next/server';
import { listStudioDeliverables } from '@/lib/studio/production/studioProductionRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await listStudioDeliverables();
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
