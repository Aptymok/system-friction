import { NextResponse } from 'next/server';
import { requireSfiMember } from '@/lib/system/access/server';
import { studioApiAccessError } from '@/lib/studio/production/studioApiAuth';
import { buildStudioUploadDescriptor } from '@/lib/studio/multimodal/detect';
import { prepareStudioSignedUpload } from '@/lib/studio/multimodal/storage';
import { StudioMultimodalError, toStudioMultimodalApiError } from '@/lib/studio/multimodal/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// An owner-scoped signed upload. The browser sends bytes directly to private
// Studio storage; this endpoint never accepts or proxies raw file contents.
export async function POST(request: Request) {
  try {
    const { user, profile } = await requireSfiMember();
    const access = profile.module_access && typeof profile.module_access === 'object'
      ? profile.module_access as Record<string, unknown> : {};
    if (access.studio !== true) {
      return NextResponse.json({ ok: false, error: 'STUDIO_ACCESS_REQUIRED' }, { status: 403 });
    }
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: 'INVALID_REQUEST' }, { status: 400 });
    }
    const descriptor = buildStudioUploadDescriptor({
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      title: body.title,
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
      storagePath: prepared.storagePath,
      signedToken: prepared.signedToken,
      bucket: 'studio-objects',
      modality: descriptor.modality,
      maxAnalysisBytes: descriptor.sizeBytes,
      next: '/api/studio/objects/upload/complete',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof StudioMultimodalError) {
      return NextResponse.json(toStudioMultimodalApiError(error), { status: error.status });
    }
    return studioApiAccessError(error);
  }
}
