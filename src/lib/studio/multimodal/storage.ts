import 'server-only';

import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { sha256Buffer } from '@/lib/studio/audio/audioChecksum';
import { buildStudioUploadDescriptor, studioAnalysisLimitBytes, type StudioUploadDescriptor } from './detect';
import { StudioMultimodalError, type StudioPreparedUpload, type StudioStoredObject } from './types';

export const STUDIO_OBJECT_BUCKET = 'studio-objects';
const BUCKET_LIMIT_BYTES = 500 * 1024 * 1024;

type Row = Record<string, unknown>;

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asRow(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

export async function ensureStudioObjectBucket(supabase: SupabaseClient = createServiceSupabaseClient()) {
  const current = await supabase.storage.getBucket(STUDIO_OBJECT_BUCKET);
  if (current.error) {
    const message = current.error.message.toLowerCase();
    if (!message.includes('not found') && !message.includes('does not exist')) throw current.error;
    const created = await supabase.storage.createBucket(STUDIO_OBJECT_BUCKET, {
      public: false,
      fileSizeLimit: BUCKET_LIMIT_BYTES,
    });
    if (created.error) throw created.error;
    return;
  }

  const existingLimit = Number(current.data?.file_size_limit ?? 0);
  if (current.data?.public || !Number.isFinite(existingLimit) || existingLimit < BUCKET_LIMIT_BYTES) {
    const updated = await supabase.storage.updateBucket(STUDIO_OBJECT_BUCKET, {
      public: false,
      fileSizeLimit: BUCKET_LIMIT_BYTES,
    });
    if (updated.error) throw updated.error;
  }
}

export async function prepareStudioSignedUpload(input: {
  descriptor: StudioUploadDescriptor;
  ownerId: string;
  sessionId?: string | null;
}): Promise<StudioPreparedUpload> {
  const supabase = createServiceSupabaseClient();
  await ensureStudioObjectBucket(supabase);

  let sessionId = asString(input.sessionId);
  if (sessionId) {
    const { data: session, error } = await supabase
      .from('studio_sessions')
      .select('id, owner_id')
      .eq('id', sessionId)
      .maybeSingle();
    if (error || !session) throw new StudioMultimodalError('OBJECT_NOT_FOUND', 'Studio session was not found.', 404, { sessionId });
    if (session.owner_id !== input.ownerId) throw new StudioMultimodalError('OWNER_REQUIRED', 'Studio session ownership is required.', 403, { sessionId });
  } else {
    const { data: session, error } = await supabase
      .from('studio_sessions')
      .insert({
        title: `${input.descriptor.title} session`,
        status: 'active',
        owner_id: input.ownerId,
        metadata: { source: 'studio_signed_upload_v1' },
      })
      .select('id')
      .single();
    if (error || !session) throw new StudioMultimodalError('PERSISTENCE_FAILED', error?.message ?? 'Studio session could not be created.', 503);
    sessionId = String(session.id);
  }

  const storagePath = `studio/${input.ownerId}/${sessionId}/${Date.now()}-${randomUUID()}-${input.descriptor.safeFileName}`;
  const objectMetadata = {
    originalFileName: input.descriptor.fileName,
    extension: input.descriptor.extension,
    modality: input.descriptor.modality,
    uploadProtocol: 'signed-direct-v1',
  };

  const { data: object, error: objectError } = await supabase
    .from('studio_objects')
    .insert({
      session_id: sessionId,
      owner_id: input.ownerId,
      title: input.descriptor.title,
      object_type: input.descriptor.objectType,
      mime_type: input.descriptor.mimeType,
      size_bytes: input.descriptor.sizeBytes,
      source_uri: storagePath,
      status: 'uploaded',
      metadata: objectMetadata,
    })
    .select('*')
    .single();
  if (objectError || !object) throw new StudioMultimodalError('PERSISTENCE_FAILED', objectError?.message ?? 'Studio object could not be created.', 503);

  const { data: upload, error: uploadError } = await supabase
    .from('studio_uploads')
    .insert({
      object_id: object.id,
      owner_id: input.ownerId,
      storage_path: storagePath,
      mime_type: input.descriptor.mimeType,
      size_bytes: input.descriptor.sizeBytes,
      status: 'missing',
    })
    .select('*')
    .single();
  if (uploadError || !upload) {
    await supabase.from('studio_objects').update({ status: 'failed' }).eq('id', object.id);
    throw new StudioMultimodalError('PERSISTENCE_FAILED', uploadError?.message ?? 'Studio upload row could not be created.', 503);
  }

  const signed = await supabase.storage.from(STUDIO_OBJECT_BUCKET).createSignedUploadUrl(storagePath);
  if (signed.error || !signed.data?.token) {
    await supabase.from('studio_uploads').update({ status: 'failed' }).eq('id', upload.id);
    await supabase.from('studio_objects').update({ status: 'failed' }).eq('id', object.id);
    throw new StudioMultimodalError('PERSISTENCE_FAILED', signed.error?.message ?? 'Signed upload token could not be created.', 503);
  }

  return {
    objectId: String(object.id),
    sessionId,
    uploadId: String(upload.id),
    storagePath,
    signedToken: signed.data.token,
    descriptor: input.descriptor,
  };
}

function splitStoragePath(storagePath: string) {
  const parts = storagePath.split('/').filter(Boolean);
  return {
    folder: parts.slice(0, -1).join('/'),
    fileName: parts.at(-1) ?? '',
  };
}

export async function completeStudioSignedUpload(objectId: string, ownerId: string) {
  const supabase = createServiceSupabaseClient();
  const { data: object, error: objectError } = await supabase
    .from('studio_objects')
    .select('*')
    .eq('id', objectId)
    .maybeSingle();
  if (objectError || !object) throw new StudioMultimodalError('OBJECT_NOT_FOUND', 'Studio object was not found.', 404, { objectId });
  if (object.owner_id !== ownerId) throw new StudioMultimodalError('OWNER_REQUIRED', 'Studio object ownership is required.', 403, { objectId });

  const { data: upload, error: uploadError } = await supabase
    .from('studio_uploads')
    .select('*')
    .eq('object_id', objectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (uploadError || !upload?.storage_path) throw new StudioMultimodalError('UPLOAD_NOT_FOUND', 'Studio upload row was not found.', 404, { objectId });
  if (upload.owner_id !== ownerId) throw new StudioMultimodalError('OWNER_REQUIRED', 'Studio upload ownership is required.', 403, { objectId });

  const storagePath = String(upload.storage_path);
  const { folder, fileName } = splitStoragePath(storagePath);
  const listed = await supabase.storage.from(STUDIO_OBJECT_BUCKET).list(folder, { limit: 20, search: fileName });
  if (listed.error) throw new StudioMultimodalError('UPLOAD_NOT_COMPLETE', listed.error.message, 409, { objectId, storagePath });
  const storedFile = listed.data.find((item) => item.name === fileName);
  if (!storedFile) throw new StudioMultimodalError('UPLOAD_NOT_COMPLETE', 'The signed upload has not reached storage.', 409, { objectId, storagePath });

  const actualSize = Number(asRow(storedFile.metadata).size ?? object.size_bytes ?? upload.size_bytes ?? 0);
  const metadata = {
    ...asRow(object.metadata),
    storageVerifiedAt: new Date().toISOString(),
    storedSizeBytes: Number.isFinite(actualSize) ? actualSize : null,
  };

  const uploadUpdate = await supabase
    .from('studio_uploads')
    .update({ status: 'stored', size_bytes: Number.isFinite(actualSize) && actualSize > 0 ? actualSize : upload.size_bytes })
    .eq('id', upload.id);
  if (uploadUpdate.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', uploadUpdate.error.message, 503, { objectId });

  const objectUpdate = await supabase
    .from('studio_objects')
    .update({ status: 'uploaded', size_bytes: Number.isFinite(actualSize) && actualSize > 0 ? actualSize : object.size_bytes, metadata, updated_at: new Date().toISOString() })
    .eq('id', objectId);
  if (objectUpdate.error) throw new StudioMultimodalError('PERSISTENCE_FAILED', objectUpdate.error.message, 503, { objectId });

  return { objectId, storagePath, sizeBytes: actualSize };
}

export async function loadStudioObjectBytes(objectId: string): Promise<StudioStoredObject> {
  const supabase = createServiceSupabaseClient();
  const { data: object, error: objectError } = await supabase.from('studio_objects').select('*').eq('id', objectId).maybeSingle();
  if (objectError || !object) throw new StudioMultimodalError('OBJECT_NOT_FOUND', 'Studio object was not found.', 404, { objectId });

  const { data: upload, error: uploadError } = await supabase
    .from('studio_uploads')
    .select('*')
    .eq('object_id', objectId)
    .eq('status', 'stored')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (uploadError || !upload?.storage_path) throw new StudioMultimodalError('UPLOAD_NOT_FOUND', 'No completed Studio upload exists for this object.', 404, { objectId });

  const metadata = asRow(object.metadata);
  const descriptor = buildStudioUploadDescriptor({
    fileName: asString(metadata.originalFileName) ?? String(upload.storage_path).split('/').at(-1) ?? object.title,
    mimeType: upload.mime_type ?? object.mime_type,
    sizeBytes: upload.size_bytes ?? object.size_bytes,
    title: object.title,
    requestedObjectType: metadata.modality ?? object.object_type,
  });
  const limit = studioAnalysisLimitBytes(descriptor.modality);
  const declaredSize = Number(upload.size_bytes ?? object.size_bytes ?? 0);
  if (Number.isFinite(declaredSize) && declaredSize > limit) {
    throw new StudioMultimodalError('FILE_TOO_LARGE', 'Object exceeds the synchronous Studio analysis limit.', 413, { objectId, modality: descriptor.modality, declaredSize, limit });
  }

  const downloaded = await supabase.storage.from(STUDIO_OBJECT_BUCKET).download(String(upload.storage_path));
  if (downloaded.error || !downloaded.data) throw new StudioMultimodalError('STORAGE_DOWNLOAD_FAILED', downloaded.error?.message ?? 'Storage returned no bytes.', 502, { objectId });
  const bytes = Buffer.from(await downloaded.data.arrayBuffer());
  if (bytes.byteLength > limit) throw new StudioMultimodalError('FILE_TOO_LARGE', 'Downloaded object exceeds the synchronous Studio analysis limit.', 413, { objectId, byteLength: bytes.byteLength, limit });

  return {
    object: object as Row,
    upload: upload as Row,
    bytes,
    byteLength: bytes.byteLength,
    checksumSha256: sha256Buffer(bytes),
    storagePath: String(upload.storage_path),
  };
}

export async function createStudioContentSignedUrl(objectId: string, expiresInSeconds = 120) {
  const supabase = createServiceSupabaseClient();
  const { data: upload, error } = await supabase
    .from('studio_uploads')
    .select('storage_path, status')
    .eq('object_id', objectId)
    .eq('status', 'stored')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !upload?.storage_path) throw new StudioMultimodalError('UPLOAD_NOT_FOUND', 'Stored Studio content was not found.', 404, { objectId });
  const signed = await supabase.storage.from(STUDIO_OBJECT_BUCKET).createSignedUrl(String(upload.storage_path), expiresInSeconds);
  if (signed.error || !signed.data?.signedUrl) throw new StudioMultimodalError('STORAGE_DOWNLOAD_FAILED', signed.error?.message ?? 'Signed content URL could not be created.', 502, { objectId });
  return signed.data.signedUrl;
}
