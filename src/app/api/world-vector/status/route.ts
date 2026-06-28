import { NextResponse } from 'next/server';
import { getWorldVectorStatus } from '@/lib/world-vector/readModel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await getWorldVectorStatus();
  return NextResponse.json(status);
}
