import { StudioMultimodalError, type StudioDatabaseObjectType, type StudioModality, type StudioUploadDescriptor } from './types';

const AUDIO_EXTENSIONS = new Set(['wav', 'wave', 'mp3', 'm4a', 'aac', 'flac', 'ogg', 'oga', 'opus', 'aiff', 'aif']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'mkv', 'm4v']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'tif', 'tiff']);
const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'rtf', 'pdf', 'docx']);

export const STUDIO_ACCEPTED_EXTENSIONS = [
  ...AUDIO_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
  ...TEXT_EXTENSIONS,
].sort();

function extensionOf(fileName: string) {
  const clean = fileName.trim().toLowerCase();
  const index = clean.lastIndexOf('.');
  return index >= 0 ? clean.slice(index + 1) : '';
}

export function sanitizeStudioFileName(fileName: string) {
  const normalized = fileName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  return normalized.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 180) || 'studio-object';
}

function modalityFromEvidence(mimeType: string | null, extension: string): StudioModality {
  const mime = (mimeType || '').toLowerCase();
  if (mime.startsWith('audio/') || AUDIO_EXTENSIONS.has(extension)) return 'audio';
  if (mime.startsWith('video/') || VIDEO_EXTENSIONS.has(extension)) return 'video';
  if (mime.startsWith('image/') || IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (
    mime.startsWith('text/') ||
    mime === 'application/pdf' ||
    mime.includes('wordprocessingml') ||
    mime === 'application/json' ||
    mime.includes('csv') ||
    TEXT_EXTENSIONS.has(extension)
  ) return 'text';
  return 'unknown';
}

function requestedModality(value: unknown): StudioModality | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'music' || normalized === 'audio') return 'audio';
  if (normalized === 'video') return 'video';
  if (normalized === 'image') return 'image';
  if (normalized === 'text' || normalized === 'document') return 'text';
  if (normalized === 'community') return 'community';
  if (normalized === 'time_coordinate' || normalized === 'time-coordinate') return 'time_coordinate';
  return null;
}

export function objectTypeFromModality(modality: StudioModality): StudioDatabaseObjectType {
  if (modality === 'audio') return 'music';
  if (modality === 'video') return 'video';
  if (modality === 'image') return 'image';
  if (modality === 'text') return 'text';
  if (modality === 'community') return 'community';
  if (modality === 'time_coordinate') return 'time_coordinate';
  return 'unknown';
}

function envMegabytes(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function studioUploadLimitBytes(modality: StudioModality) {
  const fallback = modality === 'video' ? 500 : modality === 'audio' ? 250 : modality === 'image' ? 60 : 80;
  return Math.floor(envMegabytes(`STUDIO_${modality.toUpperCase()}_UPLOAD_MAX_MB`, fallback) * 1024 * 1024);
}

export function studioAnalysisLimitBytes(modality: StudioModality) {
  const fallback = modality === 'video' ? 180 : modality === 'audio' ? 150 : modality === 'image' ? 40 : 50;
  return Math.floor(envMegabytes(`STUDIO_${modality.toUpperCase()}_ANALYSIS_MAX_MB`, fallback) * 1024 * 1024);
}

export function buildStudioUploadDescriptor(input: {
  fileName: unknown;
  mimeType?: unknown;
  sizeBytes: unknown;
  title?: unknown;
  requestedObjectType?: unknown;
}): StudioUploadDescriptor {
  const fileName = typeof input.fileName === 'string' ? input.fileName.trim() : '';
  const sizeBytes = Number(input.sizeBytes);
  const mimeType = typeof input.mimeType === 'string' && input.mimeType.trim() ? input.mimeType.trim().toLowerCase() : null;

  if (!fileName || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new StudioMultimodalError('UNSUPPORTED_FILE_TYPE', 'A valid file name and positive byte size are required.', 400);
  }

  const extension = extensionOf(fileName);
  const evidenced = modalityFromEvidence(mimeType, extension);
  const requested = requestedModality(input.requestedObjectType);
  const modality = requested ?? evidenced;

  if (modality === 'unknown') {
    throw new StudioMultimodalError('UNSUPPORTED_FILE_TYPE', 'Studio does not recognize this file type.', 415, {
      fileName,
      mimeType,
      extension,
      acceptedExtensions: STUDIO_ACCEPTED_EXTENSIONS,
    });
  }

  if ((modality === 'community' || modality === 'time_coordinate') && !['json', 'csv', 'tsv', 'txt', 'md'].includes(extension)) {
    throw new StudioMultimodalError('UNSUPPORTED_FILE_TYPE', `${modality} intake requires JSON, CSV, TSV, TXT or Markdown evidence.`, 415, {
      extension,
    });
  }

  const limit = studioUploadLimitBytes(modality);
  if (sizeBytes > limit) {
    throw new StudioMultimodalError('FILE_TOO_LARGE', 'File exceeds the configured Studio upload limit.', 413, {
      modality,
      sizeBytes,
      limit,
    });
  }

  const safeFileName = sanitizeStudioFileName(fileName);
  const baseTitle = fileName.replace(/\.[^.]+$/, '').trim() || fileName;
  const title = typeof input.title === 'string' && input.title.trim() ? input.title.trim().slice(0, 240) : baseTitle.slice(0, 240);

  return {
    fileName,
    safeFileName,
    extension,
    mimeType,
    sizeBytes,
    title,
    modality,
    objectType: objectTypeFromModality(modality),
  };
}
