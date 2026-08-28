import 'server-only';

import { randomUUID } from 'node:crypto';

export const SFI_CASE_SOURCE_BUCKET = 'field-evidence';
export const SFI_CASE_DIRECT_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
export const SFI_CASE_LEGACY_PROXY_MAX_BYTES = 2 * 1024 * 1024;
export const SFI_CASE_RESUMABLE_RECOMMENDED_BYTES = 6 * 1024 * 1024;

const ALLOWED_PREFIXES = ['image/', 'audio/', 'video/', 'text/'];
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/json',
  'application/zip',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
]);

export function safeCaseSourceFilename(value: string) {
  const cleaned = value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned.slice(-180) || 'source.bin';
}

export function normalizeCaseSourceType(value: unknown) {
  const source = typeof value === 'string' ? value.trim().toUpperCase().replace(/[^A-Z0-9:_-]+/g, '_') : '';
  return source.slice(0, 160) || 'DECLARED_BY_PROTOCOL';
}

export function normalizeCaseSourceContentType(value: unknown) {
  const contentType = typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : 'application/octet-stream';
  const allowed = ALLOWED_TYPES.has(contentType) || ALLOWED_PREFIXES.some((prefix) => contentType.startsWith(prefix));
  if (!allowed) throw new Error(`SFI_SOURCE_FILE_TYPE_NOT_ALLOWED:${contentType}`);
  return contentType;
}

export function normalizeCaseSourceSize(value: unknown) {
  const size = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(size) || size <= 0 || size > SFI_CASE_DIRECT_UPLOAD_MAX_BYTES) {
    throw new Error(`SFI_SOURCE_FILE_SIZE_INVALID:${SFI_CASE_DIRECT_UPLOAD_MAX_BYTES}`);
  }
  return Math.round(size);
}

export function normalizeOptionalContentHash(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const hash = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('SFI_SOURCE_CONTENT_HASH_INVALID');
  return hash;
}

export function caseSourceStoragePrefix(tenantId: string, caseId: string) {
  return `${tenantId}/${caseId}/source/`;
}

export function createCaseSourceStoragePath(input: { tenantId: string; caseId: string; filename: string }) {
  return `${caseSourceStoragePrefix(input.tenantId, input.caseId)}${randomUUID()}/${safeCaseSourceFilename(input.filename)}`;
}

export function assertCaseSourceStoragePath(input: { tenantId: string; caseId: string; storagePath: string }) {
  const expected = caseSourceStoragePrefix(input.tenantId, input.caseId);
  if (!input.storagePath.startsWith(expected) || input.storagePath.includes('..')) throw new Error('SFI_SOURCE_STORAGE_PATH_FORBIDDEN');
  return input.storagePath;
}

export function uploadStrategyForSize(size: number) {
  return size > SFI_CASE_RESUMABLE_RECOMMENDED_BYTES ? 'SIGNED_RESUMABLE_RECOMMENDED' : 'SIGNED_STANDARD';
}
