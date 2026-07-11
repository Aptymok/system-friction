import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { completeStudioSignedUpload } from '@/lib/studio/multimodal/storage';
import { StudioMultimodalError, toStudioMultimodalApiError } from '@/lib/studio/multimodal/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { objectId?: unknown } | null;
    const objectId = typeof body?.objectId === 'string' ? body.objectId : '';
    if (!objectId) return NextResponse.json({ ok: false, error: 'OBJECT_ID_REQUIRED' }, { status: 400 });

    const context = await requireObjectOwner(objectId);
    const completed = await completeStudioSignedUpload(objectId, context.user.id);
    return NextResponse.json({ ok: true, ...completed }, { status: 200 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    const body = toStudioMultimodalApiError(error);
    const status = error instanceof StudioMultimodalError ? error.status : 500;
    return NextResponse.json(body, { status });
  }
}
