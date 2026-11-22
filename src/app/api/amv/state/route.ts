import { NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';
import { buildAllAmvScopeStates, buildAmvScopeState } from '@/lib/amv/core/amvStateBuilder';
import { publicAmvStateProjection } from '@/lib/amv/core/publicAmvStateProjection';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // The public product keeps aggregate status, never raw service-role rows.
  // Only an authorized ROOT observer may receive the full internal context.
  const gate = await requireRootViewer('root.amv.state.read').catch(() => null);
  const fullInternalAccess = gate?.ok === true;
  const headers = { 'Cache-Control': 'private, no-store' };
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope');
  if (!scope) {
    const scopes = await buildAllAmvScopeStates();
    return NextResponse.json({
      ok: true,
      scopes: fullInternalAccess ? scopes : scopes.map(publicAmvStateProjection),
    }, { headers });
  }

  const state = await buildAmvScopeState(scope);
  return NextResponse.json(fullInternalAccess ? state : publicAmvStateProjection(state), {
    status: state.ok ? 200 : 404,
    headers,
  });
}
