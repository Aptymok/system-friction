import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { studioApiAccessError } from '@/lib/studio/production/studioApiAuth';
import { getStudioObject } from '@/lib/studio/production/studioProductionRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const params = await Promise.resolve(ctx.params);
    const result = await getStudioObject(decodeURIComponent(params.id), user.id);
    return NextResponse.json(result, { status: result.ok ? 200 : result.status });
  } catch (error) {
    return studioApiAccessError(error);
  }
}
