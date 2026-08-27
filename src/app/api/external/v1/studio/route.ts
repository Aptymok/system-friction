import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import {
  getStudioObject,
  getStudioObjectFeatures,
  listStudioObjects,
} from '@/lib/studio/production/studioProductionRepository';
import { createStudioContentSignedUrl } from '@/lib/studio/multimodal/storage';
import { resolveStudioObjectDescriptor, analyzeStudioModalityObject } from '@/lib/studio/multimodal/analyzeStudioModalityObject';
import { analyzeStudioVideo } from '@/lib/studio/multimodal/videoAnalyzer';
import { analyzeStudioAudioObject } from '@/lib/studio/audio/analyzeStudioAudioObject';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

type StudioOperation = 'list' | 'inspect' | 'features' | 'content' | 'analyze';
type Row = Record<string, unknown>;

function requiredScope(operation: StudioOperation) {
  if (operation === 'content') return 'studio:content';
  if (operation === 'analyze') return 'studio:run';
  return 'studio:read';
}

function objectIdFrom(body: Row) {
  return typeof body.objectId === 'string' ? body.objectId.trim() : '';
}

function repositoryResponse(result: Awaited<ReturnType<typeof getStudioObject>>, actor: string, operation: StudioOperation) {
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, details: result.details }, { status: result.status });
  }
  return NextResponse.json({ ok: true, actor, operation, object: result.data });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Row;
  const operation = String(body.operation || 'list') as StudioOperation;
  if (!['list', 'inspect', 'features', 'content', 'analyze'].includes(operation)) {
    return NextResponse.json({ ok: false, error: 'unsupported_studio_operation' }, { status: 400 });
  }

  const scope = requiredScope(operation);
  const auth = authorizeExternalRequest(req, scope);
  const cred = auth.credential;
  if (!cred) return NextResponse.json(externalAuthError(auth, scope), { status: 401 });

  // Studio access through the public external gateway is deliberately user-bound.
  // Static/shared tokens cannot impersonate an object owner. OAuth subject_id is
  // the owner boundary used for every lookup and operation below.
  if (cred.authMethod !== 'oauth' || !cred.subjectId) {
    return NextResponse.json({
      ok: false,
      error: 'user_bound_oauth_required_for_studio',
      required: 'OAuth access token carrying an SFI institutional subject_id',
    }, { status: 403 });
  }

  const ownerId = cred.subjectId;
  const actor = externalActor(cred);

  if (operation === 'list') {
    const result = await listStudioObjects(ownerId);
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error, details: result.details }, { status: result.status });
    return NextResponse.json({
      ok: true,
      actor,
      operation,
      ownershipBoundary: 'oauth.subjectId = studio_objects.owner_id',
      count: result.data.length,
      objects: result.data,
    });
  }

  const objectId = objectIdFrom(body);
  if (!objectId) return NextResponse.json({ ok: false, error: 'objectId_required' }, { status: 400 });

  const owned = await getStudioObject(objectId, ownerId);
  if (!owned.ok) return NextResponse.json({ ok: false, error: owned.error, details: owned.details }, { status: owned.status });

  if (operation === 'inspect') return repositoryResponse(owned, actor, operation);

  if (operation === 'features') {
    const result = await getStudioObjectFeatures(objectId, ownerId);
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error, details: result.details }, { status: result.status });
    return NextResponse.json({ ok: true, actor, operation, ...result.data });
  }

  if (operation === 'content') {
    try {
      const url = await createStudioContentSignedUrl(objectId, 120);
      return NextResponse.json({
        ok: true,
        actor,
        operation,
        objectId,
        url,
        expiresInSeconds: 120,
        ownershipBoundary: 'oauth.subjectId = studio_objects.owner_id',
      });
    } catch (error) {
      const status = typeof (error as { status?: unknown })?.status === 'number'
        ? Number((error as { status: number }).status)
        : 500;
      return NextResponse.json({
        ok: false,
        error: typeof (error as { code?: unknown })?.code === 'string' ? (error as { code: string }).code : 'studio_content_failed',
        details: error instanceof Error ? error.message : String(error),
      }, { status });
    }
  }

  try {
    const { descriptor } = await resolveStudioObjectDescriptor(objectId);
    const force = body.force === true;
    let result: unknown;

    if (descriptor.modality === 'audio') {
      result = await analyzeStudioAudioObject(objectId, { force, requestedByUserId: ownerId });
    } else if (descriptor.modality === 'video') {
      result = await analyzeStudioModalityObject(objectId, {
        expectedModalities: ['video'],
        force,
        requestedByUserId: ownerId,
        analyze: async ({ bytes, extension }) => ({
          ...(await analyzeStudioVideo(bytes, extension)),
          table: 'studio_video_features',
        }),
      });
    } else {
      return NextResponse.json({
        ok: false,
        error: 'external_studio_analyzer_not_exposed_for_modality',
        modality: descriptor.modality,
        supportedModalities: ['audio', 'video'],
      }, { status: 415 });
    }

    const reused = Boolean(result && typeof result === 'object' && !Array.isArray(result) && (result as Row).reused === true);
    return NextResponse.json({ ok: true, actor, operation, objectId, result }, { status: reused ? 200 : 202 });
  } catch (error) {
    const status = typeof (error as { status?: unknown })?.status === 'number'
      ? Number((error as { status: number }).status)
      : 500;
    return NextResponse.json({
      ok: false,
      error: typeof (error as { code?: unknown })?.code === 'string' ? (error as { code: string }).code : 'external_studio_analysis_failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status });
  }
}
