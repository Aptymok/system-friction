import { NextResponse } from 'next/server';
import { readWorldSpectVectorSnapshot } from '@/lib/worldspect/vector-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await readWorldSpectVectorSnapshot();
  return NextResponse.json(result, {
    status: 200,
    headers: { 'cache-control': 'no-store' },
  });
}
