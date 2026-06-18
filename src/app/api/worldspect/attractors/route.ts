import { NextResponse } from 'next/server';
import { loadWorldAttractors } from '@/lib/worldspect/attractors';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') ?? 80);
  const result = await loadWorldAttractors(limit);
  return NextResponse.json({
    ...result,
    rule: 'Attractors are vector clusters derived from persisted WorldSpect snapshots and evidence refs. No snapshots means no attractor claim.',
  });
}
