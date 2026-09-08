import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import { getStudioObject, getStudioObjectFeatures, listStudioObjects } from '@/lib/studio/production/studioProductionRepository';
import { projectStudioObjectForHumans } from '@/lib/studio/hygiene/studioObjectHygiene';
import { createStudioContentSignedUrl } from '@/lib/studio/multimodal/storage';
import { resolveStudioObjectDescriptor, analyzeStudioModalityObject } from '@/lib/studio/multimodal/analyzeStudioModalityObject';
import { analyzeStudioVideo } from '@/lib/studio/multimodal/videoAnalyzer';
import { analyzeStudioAudioObject } from '@/lib/studio/audio/analyzeStudioAudioObject';
import { ingestAndAnalyzeChatGptAudioAttachment } from '@/lib/studio/external/chatgptAttachmentIntake';
import { produceStudioAudioObject } from '@/lib/studio/material/studioProductionLoop';
import type { MaterialProductionMode } from '@/lib/studio/material/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

type StudioOperation = 'list' | 'inspect' | 'features' | 'content' | 'analyze' | 'ingest_analyze' | 'produce';
type Row = Record<string, unknown>;

function requiredScope(operation: StudioOperation) {
  if (operation === 'content') return 'studio:content';
  if (operation === 'analyze' || operation === 'ingest_analyze' || operation === 'produce') return 'studio:run';
  return 'studio:read';
}
function objectIdFrom(body: Row) { return typeof body.objectId === 'string' ? body.objectId.trim() : ''; }
function boundedLimit(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(1, Math.min(100, Math.floor(parsed))) : 25; }
function repositoryResponse(result: Awaited<ReturnType<typeof getStudioObject>>, actor: string, operation: StudioOperation) {
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error, details: result.details }, { status: result.status });
  return NextResponse.json({ ok: true, actor, operation, object: projectStudioObjectForHumans(result.data) });
}
function studioError(error: unknown, fallback: string) {
  const status = typeof (error as { status?: unknown })?.status === 'number' ? Number((error as { status: number }).status) : 500;
  return NextResponse.json({ ok: false, error: typeof (error as { code?: unknown })?.code === 'string' ? (error as { code: string }).code : fallback, details: error instanceof Error ? error.message : String(error) }, { status });
}
function materialMode(value: unknown): MaterialProductionMode | null { return value === 'VOICE_MUSICALIZE' || value === 'MASTER_ADJUST' ? value : null; }
function optionalNumber(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined; }
function optionalText(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
function instrumentIds(value: unknown) {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
  const harmony = optionalText(data.harmony); const bass = optionalText(data.bass);
  return harmony || bass ? { harmony, bass } : undefined;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Row;
  const operation = String(body.operation || 'list') as StudioOperation;
  if (!['list','inspect','features','content','analyze','ingest_analyze','produce'].includes(operation)) return NextResponse.json({ ok: false, error: 'unsupported_studio_operation' }, { status: 400 });

  const scope = requiredScope(operation);
  const auth = authorizeExternalRequest(req, scope);
  const cred = auth.credential;
  if (!cred) return NextResponse.json(externalAuthError(auth, scope), { status: 401 });
  if (cred.authMethod !== 'oauth' || !cred.subjectId) return NextResponse.json({ ok: false, error: 'user_bound_oauth_required_for_studio', required: 'OAuth access token carrying an SFI institutional subject_id' }, { status: 403 });

  const ownerId = cred.subjectId;
  const actor = externalActor(cred);

  if (operation === 'list') {
    const includeArchived = body.includeArchived === true;
    const before = typeof body.before === 'string' && body.before.trim() ? body.before.trim() : null;
    const result = await listStudioObjects(ownerId, { includeArchived, limit: boundedLimit(body.limit), before });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error, details: result.details }, { status: result.status });
    const nextCursor = result.data.length ? String(result.data[result.data.length - 1]?.updated_at ?? '') || null : null;
    return NextResponse.json({ ok: true, actor, operation, ownershipBoundary: 'oauth.subjectId = studio_objects.owner_id', operationalDefault: includeArchived ? 'ARCHIVE_INCLUDED_BY_EXPLICIT_REQUEST' : 'ARCHIVED_EXCLUDED_BY_DEFAULT', count: result.data.length, nextCursor, objects: result.data });
  }

  if (operation === 'ingest_analyze') {
    try {
      const result = await ingestAndAnalyzeChatGptAudioAttachment({ ownerId, openaiFileIdRefs: body.openaiFileIdRefs, analysisAuthorization: body.analysisAuthorization, title: body.title, force: body.force === true });
      return NextResponse.json({ ok: true, actor, operation, ownershipBoundary: 'oauth.subjectId = studio_objects.owner_id', authorityBoundary: 'DECLARED_ANALYSIS_PERMISSION_DOES_NOT_TRANSFER_RIGHTS_OR_PROMOTE_CANON', result }, { status: 202 });
    } catch (error) { return studioError(error, 'external_studio_attachment_analysis_failed'); }
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
      const projected = projectStudioObjectForHumans(owned.data);
      const hygiene = (projected.metadata as Row | undefined)?.hygiene as Row | undefined;
      if (hygiene?.binaryRetrievable === false) return NextResponse.json({ ok: false, error: 'studio_binary_not_materialized', objectId, identityState: hygiene?.canonicalIdentityVerified === true ? 'CANONICAL_IDENTITY_VERIFIED' : 'IDENTITY_REGISTERED', materializationState: hygiene?.materializationState ?? 'UNKNOWN' }, { status: 409 });
      const url = await createStudioContentSignedUrl(objectId, 120);
      return NextResponse.json({ ok: true, actor, operation, objectId, url, expiresInSeconds: 120, ownershipBoundary: 'oauth.subjectId = studio_objects.owner_id' });
    } catch (error) { return studioError(error, 'studio_content_failed'); }
  }

  if (operation === 'produce') {
    const mode = materialMode(body.mode);
    if (!mode) return NextResponse.json({ ok: false, error: 'material_production_mode_required', supportedModes: ['VOICE_MUSICALIZE','MASTER_ADJUST'] }, { status: 400 });
    try {
      const result = await produceStudioAudioObject({ ownerId, sourceObjectId: objectId, mode, productionAuthorization: body.productionAuthorization, bpm: optionalNumber(body.bpm), key: optionalText(body.key), culturalProfile: optionalText(body.culturalProfile), instrumentIds: instrumentIds(body.instrumentIds), forceAnalysis: body.force === true });
      return NextResponse.json({ ok: true, actor, operation, objectId, result, ownershipBoundary: 'oauth.subjectId = source/result studio_objects.owner_id', authorityBoundary: 'DECLARED_PROCESSING_PERMISSION; RIGHTS_TRANSFER=false; CANONICAL_PROMOTION=false' }, { status: 202 });
    } catch (error) { return studioError(error, 'external_studio_material_production_failed'); }
  }

  try {
    const { descriptor } = await resolveStudioObjectDescriptor(objectId);
    const force = body.force === true;
    let result: unknown;
    if (descriptor.modality === 'audio') result = await analyzeStudioAudioObject(objectId, { force, requestedByUserId: ownerId });
    else if (descriptor.modality === 'video') result = await analyzeStudioModalityObject(objectId, { expectedModalities: ['video'], force, requestedByUserId: ownerId, analyze: async ({ bytes, extension }) => ({ ...(await analyzeStudioVideo(bytes, extension)), table: 'studio_video_features' }) });
    else return NextResponse.json({ ok: false, error: 'external_studio_analyzer_not_exposed_for_modality', modality: descriptor.modality, supportedModalities: ['audio','video'] }, { status: 415 });
    const reused = Boolean(result && typeof result === 'object' && !Array.isArray(result) && (result as Row).reused === true);
    return NextResponse.json({ ok: true, actor, operation, objectId, result }, { status: reused ? 200 : 202 });
  } catch (error) { return studioError(error, 'external_studio_analysis_failed'); }
}
