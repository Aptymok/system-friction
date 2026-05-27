import { NextRequest, NextResponse } from 'next/server';
import { parseGraphProfile, readCanonicalGraphState } from '@/lib/graph/canonicalGraph';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const profile = parseGraphProfile(request.nextUrl.searchParams.get('profile'));
  const graph = await readCanonicalGraphState(profile);
  return NextResponse.json({ ok: true, data: graph, warnings: graph.degradedReason ? [graph.degradedReason] : undefined });
}
