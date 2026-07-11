import { NextResponse } from 'next/server';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';
import { analyzeStudioObject } from '@/lib/studio/multimodal/analyzeStudioObject';
import { buildStudioUploadDescriptor } from '@/lib/studio/multimodal/detect';
import {
  completeStudioSignedUpload,
  prepareStudioSignedUpload,
  STUDIO_OBJECT_BUCKET,
} from '@/lib/studio/multimodal/storage';
import { StudioMultimodalError, toStudioMultimodalApiError } from '@/lib/studio/multimodal/types';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function legacyMultipartLimit() {
  const configured = Number(process.env.STUDIO_LEGACY_MULTIPART_MAX_MB);
  const megabytes = Number.isFinite(configured) && configured > 0 ? configured : 8;
  return Math.floor(megabytes * 1024 * 1024);
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'FILE_REQUIRED' }, { status: 400 });

    const limit = legacyMultipartLimit();
    if (file.size > limit) {
      return NextResponse.json({
        ok: false,
        error: 'SIGNED_DIRECT_UPLOAD_REQUIRED',
        details: 'This file must use the signed direct upload flow.',
        maxLegacyMultipartBytes: limit,
        receivedBytes: file.size,
      }, { status: 413 });
    }

    const descriptor = buildStudioUploadDescriptor({
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      title: form?.get('title'),
      requestedObjectType: form?.get('objectType'),
    });
    const prepared = await prepareStudioSignedUpload({
      descriptor,
      ownerId: user.id,
      sessionId: typeof form?.get('sessionId') === 'string' ? String(form.get('sessionId')) : null,
    });

    const bytes = Buffer.from(await file.arrayBuffer());
    const supabase = createServiceSupabaseClient();
    const stored = await supabase.storage.from(STUDIO_OBJECT_BUCKET).upload(prepared.storagePath, bytes, {
      contentType: descriptor.mimeType ?? 'application/octet-stream',
      upsert: false,
    });
    if (stored.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', stored.error.message, 503, { objectId: prepared.objectId });

    await completeStudioSignedUpload(prepared.objectId, user.id);
    const analysis = await analyzeStudioObject(prepared.objectId, { requestedByUserId: user.id })
      .catch((error) => toStudioMultimodalApiError(error));

    return NextResponse.json({
      ok: true,
      data: { id: prepared.objectId, session_id: prepared.sessionId, object_type: descriptor.objectType },
      upload: { storagePath: prepared.storagePath, mode: 'server_compatibility' },
      analysis,
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
