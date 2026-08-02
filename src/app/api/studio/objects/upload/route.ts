import { NextResponse } from 'next/server';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';
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

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function cleanJsonText(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function normalizeObjectType(value: unknown) {
  const type = cleanJsonText(value, 80);
  return type && ['music', 'video', 'image', 'text', 'community', 'time_coordinate', 'unknown'].includes(type) ? type : 'unknown';
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => null) as Record<string, unknown> | null;
      const sourceUri = cleanJsonText(body?.url, 2000);
      const title = cleanJsonText(body?.title, 240) ?? sourceUri;
      if (!sourceUri || !title) return NextResponse.json({ ok: false, error: 'URL_REQUIRED' }, { status: 400 });
      const supabase = createServiceSupabaseClient();
      const session = await supabase
        .from('studio_sessions')
        .insert({
          title: `${title} session`,
          status: 'active',
          owner_id: user.id,
          metadata: { source: 'studio_url_object_v1' },
        })
        .select('id')
        .single();
      if (session.error || !session.data) throw new StudioMultimodalError('PERSISTENCE_FAILED', session.error?.message ?? 'Studio session could not be created.', 503);
      const declaration = {
        sourceAuthor: cleanJsonText(body?.sourceAuthor, 400),
        objectDate: cleanJsonText(body?.objectDate, 80),
        context: cleanJsonText(body?.context, 2000),
        notes: cleanJsonText(body?.notes, 2000),
        authorityConsent: body?.authorityConsent === true,
        provenance: {
          source: 'studio_url_object_form',
          capturedAt: new Date().toISOString(),
          operatorId: user.id,
        },
      };
      const object = await supabase
        .from('studio_objects')
        .insert({
          session_id: session.data.id,
          owner_id: user.id,
          title,
          object_type: normalizeObjectType(body?.objectType),
          source_uri: sourceUri,
          mime_type: cleanJsonText(body?.mimeType, 160),
          status: 'blocked',
          metadata: {
            declaration,
            urlIngestion: {
              status: 'REQUIRES_CONFIGURATION',
              reason: 'URL_FETCH_ANALYZER_NOT_CONFIGURED',
            },
          },
        })
        .select('*')
        .single();
      if (object.error || !object.data) throw new StudioMultimodalError('PERSISTENCE_FAILED', object.error?.message ?? 'Studio URL object could not be created.', 503);
      await supabase.from('studio_analysis_jobs').insert({
        object_id: object.data.id,
        status: 'blocked',
        reason: 'URL_FETCH_ANALYZER_NOT_CONFIGURED',
        payload: { source: 'studio_url_object_form', sourceUri, declaration },
      });
      return NextResponse.json({
        ok: true,
        data: { id: object.data.id, session_id: session.data.id, object_type: object.data.object_type },
        analysis: { status: 'REQUIRES_CONFIGURATION', reason: 'URL_FETCH_ANALYZER_NOT_CONFIGURED' },
      }, { status: 201 });
    }

    const form = await request.formData().catch(() => null);
    if (!form) return NextResponse.json({ ok: false, error: 'FORM_REQUIRED' }, { status: 400 });
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

    const uploadMetadata = {
      sourceAuthor: cleanText(form.get('sourceAuthor'), 400),
      objectDate: cleanText(form.get('objectDate'), 80),
      context: cleanText(form.get('context'), 2000),
      notes: cleanText(form.get('notes'), 2000),
      authorityConsent: form.get('authorityConsent') === 'true',
      provenance: {
        source: 'studio_object_upload_form',
        capturedAt: new Date().toISOString(),
        operatorId: user.id,
      },
    };
    const current = await supabase.from('studio_objects').select('metadata').eq('id', prepared.objectId).maybeSingle();
    if (current.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', current.error.message, 503, { objectId: prepared.objectId });
    const metadata = current.data?.metadata && typeof current.data.metadata === 'object' && !Array.isArray(current.data.metadata)
      ? current.data.metadata as Record<string, unknown>
      : {};
    const updated = await supabase
      .from('studio_objects')
      .update({ metadata: { ...metadata, declaration: uploadMetadata }, updated_at: new Date().toISOString() })
      .eq('id', prepared.objectId);
    if (updated.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', updated.error.message, 503, { objectId: prepared.objectId });

    return NextResponse.json({
      ok: true,
      data: { id: prepared.objectId, session_id: prepared.sessionId, object_type: descriptor.objectType },
      upload: { storagePath: prepared.storagePath, mode: 'server_compatibility' },
      analysis: {
        status: 'PENDING',
        dispatchPath: `/api/studio/objects/${encodeURIComponent(prepared.objectId)}/analyze`,
      },
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
