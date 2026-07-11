import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import {
  getPersistedStudioFieldProjection,
  projectStudioObjectField,
} from '@/lib/studio/production/objectFieldProjection';

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
    const projection = await getPersistedStudioFieldProjection(objectId);
    if (!projection) {
      return NextResponse.json({ ok: false, error: 'PROJECTION_NOT_FOUND', details: 'No persisted field projection exists.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, projection });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'PROJECTION_READ_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: RouteContext) {
  const objectId = await objectIdFrom(ctx);
  try {
    await requireObjectOwner(objectId);
    const body = await request.json().catch(() => ({})) as { persist?: unknown };
    const projection = await projectStudioObjectField(objectId, { persist: body.persist !== false });
    return NextResponse.json({ ok: true, status: projection.status, projection }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'PROJECTION_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
