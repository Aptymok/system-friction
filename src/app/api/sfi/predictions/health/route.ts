import { NextResponse } from 'next/server';
import { getPredictionRegistryHealth } from '@/lib/sfi/predictions/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const health = await getPredictionRegistryHealth();
  return NextResponse.json(health, { status: health.table_available ? 200 : 200 });
}
