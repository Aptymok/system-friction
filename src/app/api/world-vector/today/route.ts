import { NextResponse } from 'next/server';
import { getWorldVectorToday } from '@/lib/world-vector/readModel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await getWorldVectorToday();

  return NextResponse.json({
    ok: true,
    mode: 'read_only',
    data,
  });
}
