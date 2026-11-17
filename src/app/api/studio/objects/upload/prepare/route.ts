import { NextResponse } from 'next/server';
import { requireSfiMember, AccessDeniedError } from '@/lib/system/access/server';
import { buildStudioUploadDescriptor } from '@/lib/studio/multimodal/detect';
import { prepareStudioSignedUpload, STUDIO_OBJECT_BUCKET } from '@/lib/studio/multimodal/storage';
import { StudioMultimodalError, toStudioMultimodalApiError } from '@/lib/studio/multimodal/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Originals are NEVER uploaded by default. Only an authenticated member
// explicitly requesting durable archival and acoustic analysis may begin this flow.
export async function POST(request: Request) {
  try {
    const { user, profile } = await requireSfiMember();
    const access = (profile.module_access ?? {}) as Record<string, unknown>;
    if (access.studio !== true) {
      return NextResponse.json({ ok: false, error: 'STUDIO_ACCESS_REQUIRED' }, { status: 403 });
    }
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || body.originalPersistenceAuthorized !== true ||
        body.analysisAuthorized !== true || body.rightsBasis !== 'operator_owned') {
      return NextResponse.json({
        ok: false, error: 'EXPLICIT_ORIGINAL_STORAGE_AND_ANALYSIS_AUTHORIZATION_REQUIRED',
        message: 'Guardar el audio original requiere una autorización separada y explícita.',
      }, { status: 400 });
    }
    const descriptor = buildStudioUploadDescriptor({
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      requestedObjectType: 'audio',
      title: body.title,
    });
    if (descriptor.modality !== 'audio' || descriptor.sizeBytes > 150 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: 'AUDIO_LIMIT_150_MB' }, { status: 413 });
    }
    const prepared = await prepareStudioSignedUpload({
      descriptor, ownerId: user.id,
      metadata: {
        originalPersistenceAuthorized: true,
        analysisAuthorized: true,
        rightsBasis: 'operator_owned',
        persistenceMode: 'EXPLICIT_DURABLE_PRIVATE_STUDIO_ORIGINAL',
      },
    });
    return NextResponse.json({
      ok: true,
      bucket: STUDIO_OBJECT_BUCKET,
      objectId: prepared.objectId,
      sessionId: prepared.sessionId,
      storagePath: prepared.storagePath,
      signedToken: prepared.signedToken,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code }, { status: error.status });
    }
    if (error instanceof StudioMultimodalError) {
      return NextResponse.json(toStudioMultimodalApiError(error), { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'PREPARE_FAILED',
      details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
