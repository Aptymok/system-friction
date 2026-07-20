import { NextResponse } from 'next/server';

import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import {
  declareStudioAttractor,
  getStudioAttractor,
} from '@/lib/studio/production/attractorDeclaration';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

function objectIdFrom(ctx: RouteContext) {
  return Promise.resolve(ctx.params).then((params) => decodeURIComponent(params.id));
}

export async function GET(_request: Request, ctx: RouteContext) {
  const objectId = await objectIdFrom(ctx);
  try {
    await requireObjectOwner(objectId);
    const declaration = await getStudioAttractor(objectId);
    if (!declaration) {
      return NextResponse.json(
        { ok: false, error: 'ATTRACTOR_NOT_DECLARED', details: 'Este objeto todavía no tiene un atractor/objetivo declarado.' },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, declaration });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'ATTRACTOR_READ_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: RouteContext) {
  const objectId = await objectIdFrom(ctx);
  try {
    await requireObjectOwner(objectId);
    const body = await request.json().catch(() => ({})) as {
      stuckSystem?: unknown;
      objective?: unknown;
      attempts?: unknown;
      evidence?: unknown;
      consequence?: unknown;
    };

    const declaration = await declareStudioAttractor({
      objectId,
      stuckSystem: typeof body.stuckSystem === 'string' ? body.stuckSystem : '',
      objective: typeof body.objective === 'string' ? body.objective : '',
      attempts: typeof body.attempts === 'string' ? body.attempts : undefined,
      evidence: typeof body.evidence === 'string' ? body.evidence : undefined,
      consequence: typeof body.consequence === 'string' ? body.consequence : undefined,
    });

    return NextResponse.json({ ok: true, declaration }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : String(error);
    const isValidation = message.startsWith('STUDIO_ATTRACTOR_OBJECTIVE_REQUIRED') || message.startsWith('STUDIO_ATTRACTOR_STUCK_SYSTEM_REQUIRED');
    return NextResponse.json(
      { ok: false, error: isValidation ? message : 'ATTRACTOR_DECLARATION_FAILED', details: message },
      { status: isValidation ? 400 : 500 },
    );
  }
}
