import { NextResponse } from 'next/server';
import { loadWorldOpportunities } from '@/lib/worldspect/opportunities';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') ?? 80);
  const result = await loadWorldOpportunities(limit);
  return NextResponse.json({
    ...result,
    rule: 'Opportunities require evidence refs and are observation targets, not intervention advice. Object/case evidence is required before campaign recommendations.',
  });
}
