import { NextResponse } from 'next/server';
import { getStudioObjectFeatures } from '@/lib/studio/production/studioProductionRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_request: Request, ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  const result = await getStudioObjectFeatures(decodeURIComponent(params.id));
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
