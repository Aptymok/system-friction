import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { analyzeStudioAudioObject } from '@/lib/studio/audio/analyzeStudioAudioObject';
import { buildStudioUploadDescriptor, studioAnalysisLimitBytes } from '@/lib/studio/multimodal/detect';
import { completeStudioSignedUpload, prepareStudioSignedUpload, STUDIO_OBJECT_BUCKET } from '@/lib/studio/multimodal/storage';
import { StudioMultimodalError } from '@/lib/studio/multimodal/types';

type Row = Record<string, unknown>;
type ChatGptFileRef = { name: string; id: string; mimeType: string | null; downloadLink: string };
export type StudioAnalysisAuthorization = { authorizedForAnalysis: true; basis: 'operator_owned' | 'authorized_by_rightsholder' | 'session_specific_permission'; note?: string | null };

type IntakeIdentityState =
  | { state: 'NONE' }
  | { state: 'STORED'; objectId: string; sessionId: string; sizeBytes: number | null }
  | { state: 'PENDING'; objectId: string; sessionId: string }
  | { state: 'FAILED'; objectId: string; sessionId: string; uploadId: string; storagePath: string };

const AUDIO_EXTENSIONS = new Set(['wav', 'wave', 'mp3', 'm4a', 'aac', 'flac', 'ogg', 'oga', 'opus', 'aiff', 'aif']);
const NON_AUDIO_EXTENSIONS = new Set(['pdf', 'docx', 'txt', 'md', 'json', 'csv', 'tsv', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'mov', 'webm', 'mkv', 'zip']);

function row(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : ''; }
function extensionOf(fileName: string) { const index = fileName.trim().toLowerCase().lastIndexOf('.'); return index >= 0 ? fileName.trim().toLowerCase().slice(index + 1) : ''; }

function parseSingleChatGptFileRef(value: unknown): ChatGptFileRef {
  if (!Array.isArray(value) || value.length !== 1) throw new StudioMultimodalError('OPENAI_FILE_REFERENCE_REQUIRED', 'Exactly one ChatGPT conversation file is required for Studio attachment intake.', 400, { expectedParameter: 'openaiFileIdRefs', expectedCount: 1 });
  const ref = row(value[0]);
  const parsed = { name: text(ref.name), id: text(ref.id), mimeType: text(ref.mime_type) || null, downloadLink: text(ref.download_link) };
  if (!parsed.name || !parsed.id || !parsed.downloadLink) throw new StudioMultimodalError('OPENAI_FILE_REFERENCE_INVALID', 'ChatGPT did not provide a usable file reference for the attached object.', 400, { expectedFields: ['name', 'id', 'mime_type', 'download_link'] });
  return parsed;
}

function assertAudioEvidenceConsistent(ref: ChatGptFileRef) {
  const extension = extensionOf(ref.name);
  const mime = (ref.mimeType || '').toLowerCase();
  const extensionClass = AUDIO_EXTENSIONS.has(extension) ? 'audio' : NON_AUDIO_EXTENSIONS.has(extension) ? 'non_audio' : 'unknown';
  const mimeClass = mime.startsWith('audio/') ? 'audio' : mime && mime !== 'application/octet-stream' ? 'non_audio' : 'unknown';
  if ((extensionClass === 'audio' && mimeClass === 'non_audio') || (extensionClass === 'non_audio' && mimeClass === 'audio')) {
    throw new StudioMultimodalError('OPENAI_FILE_EVIDENCE_CONFLICT', 'Attachment filename extension and MIME type provide contradictory modality evidence.', 415, { fileName: ref.name, mimeType: ref.mimeType, extension });
  }
}

function assertOpenAiAttachmentUrl(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new StudioMultimodalError('OPENAI_FILE_URL_INVALID', 'The ChatGPT attachment URL is invalid.', 400); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || (host !== 'files.oaiusercontent.com' && !host.endsWith('.oaiusercontent.com'))) throw new StudioMultimodalError('OPENAI_FILE_URL_FORBIDDEN', 'Studio attachment intake only accepts temporary ChatGPT file URLs from the OpenAI file host.', 400, { host });
  return url;
}

function parseAnalysisAuthorization(value: unknown): StudioAnalysisAuthorization {
  const declaration = row(value);
  const basis = text(declaration.basis);
  const allowedBases = new Set<StudioAnalysisAuthorization['basis']>(['operator_owned', 'authorized_by_rightsholder', 'session_specific_permission']);
  if (declaration.authorizedForAnalysis !== true || !allowedBases.has(basis as StudioAnalysisAuthorization['basis'])) throw new StudioMultimodalError('ANALYSIS_AUTHORIZATION_REQUIRED', 'An explicit operator declaration authorizing analysis of this attachment is required.', 400, { legalEffect: 'DECLARATION_ONLY_NOT_RIGHTS_TRANSFER', allowedBases: [...allowedBases] });
  return { authorizedForAnalysis: true, basis: basis as StudioAnalysisAuthorization['basis'], note: text(declaration.note) || null };
}

function durableAuthorization(authorization: StudioAnalysisAuthorization) {
  return { ...authorization, epistemicClass: 'DECLARED', legalEffect: 'ANALYSIS_PERMISSION_DECLARATION_ONLY_NOT_RIGHTS_TRANSFER', declaredAt: new Date().toISOString() };
}

async function resolveExistingIntake(ownerId: string, openaiFileId: string): Promise<IntakeIdentityState> {
  const db = createServiceSupabaseClient();
  const existing = await db.from('studio_objects').select('id,session_id,size_bytes').eq('owner_id', ownerId).eq('metadata->externalIntake->>openaiFileId', openaiFileId).maybeSingle();
  if (existing.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', existing.error.message, 503, { openaiFileId });
  if (!existing.data) return { state: 'NONE' };
  const upload = await db.from('studio_uploads').select('id,status,size_bytes,storage_path').eq('object_id', existing.data.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (upload.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', upload.error.message, 503, { objectId: existing.data.id });
  const common = { objectId: String(existing.data.id), sessionId: String(existing.data.session_id) };
  if (upload.data?.status === 'stored') return { state: 'STORED', ...common, sizeBytes: Number(upload.data.size_bytes ?? existing.data.size_bytes ?? 0) || null };
  if (upload.data?.status === 'failed' && upload.data.id && upload.data.storage_path) return { state: 'FAILED', ...common, uploadId: String(upload.data.id), storagePath: String(upload.data.storage_path) };
  return { state: 'PENDING', ...common };
}

async function persistRetryAuthorization(objectId: string, ownerId: string, authorization: StudioAnalysisAuthorization) {
  const db = createServiceSupabaseClient();
  const current = await db.from('studio_objects').select('metadata').eq('id', objectId).eq('owner_id', ownerId).maybeSingle();
  if (current.error || !current.data) throw new StudioMultimodalError('PERSISTENCE_FAILED', current.error?.message ?? 'Studio object metadata could not be read.', 503, { objectId });
  const metadata = row(current.data.metadata);
  const history = Array.isArray(metadata.analysisAuthorizationHistory) ? metadata.analysisAuthorizationHistory : [];
  const updated = await db.from('studio_objects').update({ metadata: { ...metadata, analysisAuthorizationHistory: [...history, durableAuthorization(authorization)].slice(-50) }, updated_at: new Date().toISOString() }).eq('id', objectId).eq('owner_id', ownerId);
  if (updated.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', updated.error.message, 503, { objectId, operation: 'persist_retry_authorization' });
}

async function assertNoActiveAnalysis(objectId: string) {
  const db = createServiceSupabaseClient();
  const active = await db.from('studio_analysis_jobs').select('id,status').eq('object_id', objectId).in('status', ['queued', 'running']).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (active.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', active.error.message, 503, { objectId });
  if (active.data) throw new StudioMultimodalError('OPENAI_FILE_INTAKE_CONFLICT', 'This attachment already has an analysis in progress. Retry after the active analysis reaches a terminal state.', 409, { objectId, analysisJobId: active.data.id, analysisStatus: active.data.status });
}

async function analyzeStoredRetry(existing: Extract<IntakeIdentityState, { state: 'STORED' }>, ref: ChatGptFileRef, authorization: StudioAnalysisAuthorization, force: boolean, ownerId: string) {
  await assertNoActiveAnalysis(existing.objectId);
  await persistRetryAuthorization(existing.objectId, ownerId, authorization);
  const analysis = await analyzeStudioAudioObject(existing.objectId, { force, requestedByUserId: ownerId });
  return { objectId: existing.objectId, sessionId: existing.sessionId, reused: true, file: { name: ref.name, openaiFileId: ref.id, mimeType: ref.mimeType, sizeBytes: existing.sizeBytes }, authority: { analysisAuthorization: authorization, epistemicClass: 'DECLARED' as const, rightsTransfer: false, canonicalPromotion: false }, observation: analysis };
}

async function downloadBoundedAttachment(ref: ChatGptFileRef) {
  const url = assertOpenAiAttachmentUrl(ref.downloadLink);
  const maxBytes = studioAnalysisLimitBytes('audio');
  const response = await fetch(url, { method: 'GET', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(120_000) });
  if (!response.ok || !response.body) throw new StudioMultimodalError('OPENAI_FILE_DOWNLOAD_FAILED', `ChatGPT attachment download failed with HTTP ${response.status}.`, response.status === 404 || response.status === 410 ? 409 : 502, { openaiFileId: ref.id });
  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new StudioMultimodalError('FILE_TOO_LARGE', 'Attached audio exceeds the synchronous Studio analysis limit.', 413, { declaredLength, limit: maxBytes });
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let sizeBytes = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; if (!value) continue; sizeBytes += value.byteLength; if (sizeBytes > maxBytes) { await reader.cancel('studio_attachment_limit_exceeded'); throw new StudioMultimodalError('FILE_TOO_LARGE', 'Attached audio exceeds the synchronous Studio analysis limit.', 413, { sizeBytes, limit: maxBytes }); } chunks.push(value); }
  const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), sizeBytes);
  if (!bytes.byteLength) throw new StudioMultimodalError('OPENAI_FILE_DOWNLOAD_EMPTY', 'The attached ChatGPT file contained no bytes.', 409, { openaiFileId: ref.id });
  return bytes;
}

async function resumeFailedIntake(existing: Extract<IntakeIdentityState, { state: 'FAILED' }>, bytes: Buffer, mimeType: string | null, ownerId: string) {
  const db = createServiceSupabaseClient();
  await db.storage.from(STUDIO_OBJECT_BUCKET).remove([existing.storagePath]);
  const resetUpload = await db.from('studio_uploads').update({ status: 'missing', size_bytes: bytes.byteLength }).eq('id', existing.uploadId).eq('owner_id', ownerId);
  const resetObject = await db.from('studio_objects').update({ status: 'uploaded', size_bytes: bytes.byteLength, updated_at: new Date().toISOString() }).eq('id', existing.objectId).eq('owner_id', ownerId);
  if (resetUpload.error || resetObject.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', resetUpload.error?.message ?? resetObject.error?.message ?? 'Failed intake reservation could not be reset.', 503, { objectId: existing.objectId });
  const uploaded = await db.storage.from(STUDIO_OBJECT_BUCKET).upload(existing.storagePath, bytes, { contentType: mimeType ?? 'application/octet-stream', upsert: false });
  if (uploaded.error) {
    await Promise.allSettled([db.from('studio_uploads').update({ status: 'failed' }).eq('id', existing.uploadId), db.from('studio_objects').update({ status: 'failed' }).eq('id', existing.objectId)]);
    throw new StudioMultimodalError('PERSISTENCE_FAILED', uploaded.error.message, 503, { objectId: existing.objectId });
  }
  await completeStudioSignedUpload(existing.objectId, ownerId);
}

export async function ingestAndAnalyzeChatGptAudioAttachment(input: { ownerId: string; openaiFileIdRefs: unknown; analysisAuthorization: unknown; title?: unknown; force?: boolean }) {
  const ref = parseSingleChatGptFileRef(input.openaiFileIdRefs);
  const analysisAuthorization = parseAnalysisAuthorization(input.analysisAuthorization);
  assertAudioEvidenceConsistent(ref);

  const existing = await resolveExistingIntake(input.ownerId, ref.id);
  if (existing.state === 'STORED') return analyzeStoredRetry(existing, ref, analysisAuthorization, input.force === true, input.ownerId);
  if (existing.state === 'PENDING') throw new StudioMultimodalError('OPENAI_FILE_INTAKE_CONFLICT', 'This ChatGPT attachment already has an owner-scoped intake reservation that is still in progress.', 409, { objectId: existing.objectId, openaiFileId: ref.id });

  const bytes = await downloadBoundedAttachment(ref);
  const descriptor = buildStudioUploadDescriptor({ fileName: ref.name, mimeType: ref.mimeType, sizeBytes: bytes.byteLength, title: input.title });
  if (descriptor.modality !== 'audio') throw new StudioMultimodalError('AUDIO_ATTACHMENT_REQUIRED', 'This Studio operation accepts one audio file only.', 415, { fileName: descriptor.fileName, modality: descriptor.modality, mimeType: descriptor.mimeType });

  if (existing.state === 'FAILED') {
    await persistRetryAuthorization(existing.objectId, input.ownerId, analysisAuthorization);
    await resumeFailedIntake(existing, bytes, descriptor.mimeType, input.ownerId);
    const analysis = await analyzeStudioAudioObject(existing.objectId, { force: input.force === true, requestedByUserId: input.ownerId });
    return { objectId: existing.objectId, sessionId: existing.sessionId, reused: true, resumedFromFailure: true, file: { name: ref.name, openaiFileId: ref.id, mimeType: ref.mimeType, sizeBytes: bytes.byteLength }, authority: { analysisAuthorization, epistemicClass: 'DECLARED', rightsTransfer: false, canonicalPromotion: false }, observation: analysis };
  }

  const externalIntake = { contract: 'SFI-CHATGPT-STUDIO-ATTACHMENT-1.1', source: 'chatgpt_action_attachment', openaiFileId: ref.id, originalFileName: ref.name, mimeType: ref.mimeType, receivedAt: new Date().toISOString(), temporaryDownloadUrlPersisted: false, analysisAuthorization: durableAuthorization(analysisAuthorization) };
  let prepared: Awaited<ReturnType<typeof prepareStudioSignedUpload>>;
  try { prepared = await prepareStudioSignedUpload({ descriptor, ownerId: input.ownerId, metadata: { externalIntake, analysisAuthorizationHistory: [durableAuthorization(analysisAuthorization)] } }); }
  catch (cause) {
    const raced = await resolveExistingIntake(input.ownerId, ref.id).catch(() => ({ state: 'NONE' as const }));
    if (raced.state === 'STORED') return analyzeStoredRetry(raced, ref, analysisAuthorization, input.force === true, input.ownerId);
    if (raced.state === 'PENDING' || raced.state === 'FAILED') throw new StudioMultimodalError('OPENAI_FILE_INTAKE_CONFLICT', 'A concurrent intake already reserved this attachment. Retry through the durable reservation.', 409, { objectId: raced.objectId, openaiFileId: ref.id, reservationState: raced.state });
    throw cause;
  }

  const db = createServiceSupabaseClient();
  const uploaded = await db.storage.from(STUDIO_OBJECT_BUCKET).upload(prepared.storagePath, bytes, { contentType: descriptor.mimeType ?? 'application/octet-stream', upsert: false });
  if (uploaded.error) { await Promise.allSettled([db.from('studio_uploads').update({ status: 'failed' }).eq('id', prepared.uploadId), db.from('studio_objects').update({ status: 'failed' }).eq('id', prepared.objectId)]); throw new StudioMultimodalError('PERSISTENCE_FAILED', uploaded.error.message, 503, { objectId: prepared.objectId }); }

  await completeStudioSignedUpload(prepared.objectId, input.ownerId);
  const analysis = await analyzeStudioAudioObject(prepared.objectId, { force: input.force === true, requestedByUserId: input.ownerId });
  return { objectId: prepared.objectId, sessionId: prepared.sessionId, reused: false, file: { name: ref.name, openaiFileId: ref.id, mimeType: ref.mimeType, sizeBytes: bytes.byteLength }, authority: { analysisAuthorization, epistemicClass: 'DECLARED', rightsTransfer: false, canonicalPromotion: false }, observation: analysis };
}
