import { NextResponse } from 'next/server';
import { runStudioMasterAnalysisLoop } from '@/lib/studio/cognitive/studioMasterAnalysisLoop';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: RouteContext) {
  try {
    const params = await Promise.resolve(ctx.params);
    const objectId = decodeURIComponent(params.id);
    const access = await requireObjectOwner(objectId);
    const result = await runStudioMasterAnalysisLoop({ ownerId: access.user.id, objectId });
    return NextResponse.json(result, { status: result.status });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    return NextResponse.json({
      ok: false,
      error: 'STUDIO_MASTER_ANALYSIS_FAILED',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
