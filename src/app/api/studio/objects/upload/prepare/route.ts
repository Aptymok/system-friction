import { NextResponse } from 'next/server';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';
import { buildStudioUploadDescriptor } from '@/lib/studio/multimodal/detect';
import { prepareStudioSignedUpload } from '@/lib/studio/multimodal/storage';
import { StudioMultimodalError, toStudioMultimodalApiError } from '@/lib/studio/multimodal/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });

    const descriptor = buildStudioUploadDescriptor({
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      title: body.title,
      requestedObjectType: body.objectType,
    });
    const prepared = await prepareStudioSignedUpload({
      descriptor,
      ownerId: user.id,
      sessionId: typeof body.sessionId === 'string' ? body.sessionId : null,
    });

    return NextResponse.json({
      ok: true,
      objectId: prepared.objectId,
      sessionId: prepared.sessionId,
      uploadId: prepared.uploadId,
      storagePath: prepared.storagePath,
      token: prepared.signedToken,
      descriptor: prepared.descriptor,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    const body = toStudioMultimodalApiError(error);
    const status = error instanceof StudioMultimodalError ? error.status : 500;
    return NextResponse.json(body, { status });
  }
}
