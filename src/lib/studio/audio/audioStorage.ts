import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { sha256Buffer } from './audioChecksum';
import { StudioAudioError } from './audioErrors';
import {
  STUDIO_AUDIO_BUCKET,
  type StudioAudioAnalysisOptions,
  type StudioAudioObjectRow,
  type StudioAudioUploadRow,
  type StudioStoredAudio,
} from './audioTypes';

const DEFAULT_MAX_FILE_BYTES = 150 * 1024 * 1024;

function maxFileBytes(options: StudioAudioAnalysisOptions) {
  const fromEnv = Number(process.env.STUDIO_AUDIO_MAX_FILE_MB);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return Math.floor(fromEnv * 1024 * 1024);
  return options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
}

function isAudioObject(object: StudioAudioObjectRow) {
  const objectType = String(object.object_type ?? '').toLowerCase();
  const mime = String(object.mime_type ?? '').toLowerCase();
  const source = String(object.source_uri ?? '').toLowerCase();
  return objectType === 'music' || objectType === 'audio' || mime.startsWith('audio/') || /\.(wav|wave)$/i.test(source);
}

async function blobToBuffer(blob: Blob) {
  return Buffer.from(await blob.arrayBuffer());
}

export async function loadStudioAudioBytes(
  objectId: string,
  options: StudioAudioAnalysisOptions = {},
  supabase: SupabaseClient = createServiceSupabaseClient()
): Promise<StudioStoredAudio> {
  const { data: object, error: objectError } = await supabase
    .from('studio_objects')
    .select('*')
    .eq('id', objectId)
    .maybeSingle();

  if (objectError) {
    throw new StudioAudioError('OBJECT_NOT_FOUND', objectError.message, 404, { objectId });
  }
  if (!object) {
    throw new StudioAudioError('OBJECT_NOT_FOUND', 'Studio object was not found.', 404, { objectId });
  }

  const typedObject = object as StudioAudioObjectRow;
  if (!isAudioObject(typedObject)) {
    throw new StudioAudioError('OBJECT_NOT_AUDIO', 'Studio object is not typed as audio/music and has no audio MIME evidence.', 409, {
      objectId,
      objectType: typedObject.object_type,
      mimeType: typedObject.mime_type,
    });
  }

  const { data: upload, error: uploadError } = await supabase
    .from('studio_uploads')
    .select('*')
    .eq('object_id', objectId)
    .eq('status', 'stored')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (uploadError) {
    throw new StudioAudioError('UPLOAD_NOT_FOUND', uploadError.message, 404, { objectId });
  }
  if (!upload?.storage_path) {
    throw new StudioAudioError('UPLOAD_NOT_FOUND', 'No stored Studio upload exists for this audio object.', 404, { objectId });
  }

  const typedUpload = upload as StudioAudioUploadRow;
  const storagePath = typedUpload.storage_path;
  if (!storagePath) {
    throw new StudioAudioError('UPLOAD_NOT_FOUND', 'Stored Studio upload row has no storage path.', 404, { objectId });
  }
  const declaredSize = Number(typedUpload.size_bytes ?? typedObject.size_bytes ?? 0);
  const limit = maxFileBytes(options);
  if (Number.isFinite(declaredSize) && declaredSize > limit) {
    throw new StudioAudioError('FILE_TOO_LARGE', 'Stored audio object exceeds synchronous Studio audio engine limit.', 413, {
      objectId,
      declaredSize,
      limit,
    });
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from(STUDIO_AUDIO_BUCKET)
    .download(storagePath);

  if (downloadError || !blob) {
    throw new StudioAudioError('STORAGE_DOWNLOAD_FAILED', downloadError?.message ?? 'Supabase storage returned no audio bytes.', 502, {
      objectId,
      storagePath,
    });
  }

  const bytes = await blobToBuffer(blob);
  if (bytes.byteLength > limit) {
    throw new StudioAudioError('FILE_TOO_LARGE', 'Downloaded audio object exceeds synchronous Studio audio engine limit.', 413, {
      objectId,
      byteLength: bytes.byteLength,
      limit,
    });
  }

  return {
    object: typedObject,
    upload: typedUpload,
    bytes,
    byteLength: bytes.byteLength,
    checksumSha256: sha256Buffer(bytes),
  };
}
