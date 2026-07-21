import { NextResponse } from 'next/server';

import {
  getPhenomenonState,
  listLinkedEvidence,
  recalibratePhenomenon,
} from '@/lib/ppoi/ppoiService';

import { getPhenomenonHypothesisView } from '@/lib/phenomena/identity/phenomenonHypothesisView';

import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function getParams(ctx: RouteContext) {
  const params = await ctx.params;
  return typeof params === 'object' && params !== null ? params : { id: '' };
}

export async function GET(request: Request, ctx: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { id } = await getParams(ctx);
    const result = await getPhenomenonState(user.id, id);

    let linkedEvidence: Awaited<ReturnType<typeof listLinkedEvidence>> = [];
    try {
      linkedEvidence = await listLinkedEvidence(user.id, id);
    } catch {
      linkedEvidence = [];
    }

    let hypothesisView: Awaited<ReturnType<typeof getPhenomenonHypothesisView>> | null = null;
    try {
      hypothesisView = await getPhenomenonHypothesisView(user.id, id);
    } catch {
      hypothesisView = null;
    }

    return NextResponse.json(
      {
        ok: true,
        ...result,
        linkedEvidence,
        hypothesisView,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json(
        { ok: false, error: error.code, details: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, ctx: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { id } = await getParams(ctx);
    const result = await recalibratePhenomenon(user.id, id);
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json(
        { ok: false, error: error.code, details: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' },
      { status: 500 },
    );
  }
}