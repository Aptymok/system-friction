import { NextResponse } from 'next/server';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';
import { buildStudioUploadDescriptor } from '@/lib/studio/multimodal/detect';
import { prepareStudioSignedUpload } from '@/lib/studio/multimodal/storage';
import { StudioMultimodalError, toStudioMultimodalApiError } from '@/lib/studio/multimodal/types';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function cleanList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => cleanText(item, 240)).filter((item): item is string => Boolean(item)).slice(0, 12);
  if (typeof value === 'string') return value.split(/[,;\n]+/).map((item) => cleanText(item, 240)).filter((item): item is string => Boolean(item)).slice(0, 12);
  return [];
}

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

    const rawContext = body.context && typeof body.context === 'object' && !Array.isArray(body.context)
      ? body.context as Record<string, unknown>
      : {};
    const context = {
      declaredAttractor: cleanText(rawContext.declaredAttractor, 1200),
      desiredShift: cleanText(rawContext.desiredShift, 1200),
      targetAudience: cleanText(rawContext.targetAudience, 600),
      prohibitedEffects: cleanList(rawContext.prohibitedEffects),
    };
    if (context.declaredAttractor || context.desiredShift || context.targetAudience || context.prohibitedEffects.length) {
      const service = createServiceSupabaseClient();
      const current = await service.from('studio_objects').select('metadata').eq('id', prepared.objectId).single();
      if (current.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', current.error.message, 503, { objectId: prepared.objectId });
      const metadata = current.data?.metadata && typeof current.data.metadata === 'object' && !Array.isArray(current.data.metadata)
        ? current.data.metadata as Record<string, unknown>
        : {};
      const updated = await service.from('studio_objects').update({ metadata: { ...metadata, context } }).eq('id', prepared.objectId);
      if (updated.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', updated.error.message, 503, { objectId: prepared.objectId });
    }

    return NextResponse.json({
      ok: true,
      objectId: prepared.objectId,
      sessionId: prepared.sessionId,
      uploadId: prepared.uploadId,
      storagePath: prepared.storagePath,
      token: prepared.signedToken,
      descriptor: prepared.descriptor,
      context,
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
