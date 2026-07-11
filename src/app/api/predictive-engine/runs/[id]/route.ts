import { NextResponse } from 'next/server';
import { AccessDeniedError, requireAuthenticatedUser, requireFounder } from '@/lib/system/access/server';
import { getPredictiveRun } from '@/lib/predictive-engine/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function runIdFrom(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return decodeURIComponent(params.id);
}

export async function GET(_request: Request, ctx: RouteContext) {
  try {
    const access = await requireAuthenticatedUser();
    const runId = await runIdFrom(ctx);
    const result = await getPredictiveRun(runId);
    const ownerId = typeof result.run.owner_id === 'string' ? result.run.owner_id : null;
    if (ownerId && ownerId !== access.user.id) {
      await requireFounder();
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message.startsWith('PREDICTIVE_RUN_NOT_FOUND') ? 'PREDICTIVE_RUN_NOT_FOUND' : 'PREDICTIVE_RUN_READ_FAILED', details: message }, { status: message.startsWith('PREDICTIVE_RUN_NOT_FOUND') ? 404 : 500 });
  }
}
