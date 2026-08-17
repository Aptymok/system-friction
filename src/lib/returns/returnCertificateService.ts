import 'server-only';

import crypto from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const RETURN_CERTIFICATE_STATES = ['prepared', 'published', 'verified', 'invalidated'] as const;
export type ReturnCertificateState = typeof RETURN_CERTIFICATE_STATES[number];

export const RETURN_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'x', 'linkedin', 'medium', 'web', 'other'] as const;
export type ReturnPlatform = typeof RETURN_PLATFORMS[number];

type JsonRecord = Record<string, unknown>;
type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string; details?: string };

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function optionalText(value: unknown) {
  const valueText = text(value);
  return valueText ? valueText : null;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

function digest(value: unknown) {
  return crypto.createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function sha256(value: unknown) {
  const normalized = text(value).toLowerCase();
  return /^[0-9a-f]{64}$/.test(normalized) ? normalized : '';
}

function validCertificateId(value: string) {
  return /^SFI-[A-Z0-9-]{6,80}$/.test(value);
}

function platformUrlMatches(platform: ReturnPlatform, urlValue: string) {
  if (!urlValue) return false;
  try {
    const url = new URL(urlValue);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (platform === 'instagram') return host === 'instagram.com' || host.endsWith('.instagram.com');
    if (platform === 'tiktok') return host === 'tiktok.com' || host.endsWith('.tiktok.com');
    if (platform === 'youtube') return host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be';
    if (platform === 'x') return host === 'x.com' || host.endsWith('.x.com') || host === 'twitter.com' || host.endsWith('.twitter.com');
    if (platform === 'linkedin') return host === 'linkedin.com' || host.endsWith('.linkedin.com');
    if (platform === 'medium') return host === 'medium.com' || host.endsWith('.medium.com');
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function canonicalCertificateFields(input: JsonRecord) {
  return {
    certificate_id: text(input.certificate_id),
    program_id: text(input.program_id),
    object_id: text(input.object_id),
    trace_id: text(input.trace_id),
    parent_trace_id: optionalText(input.parent_trace_id),
    platform: text(input.platform),
    state: text(input.state),
    epistemic_class: text(input.epistemic_class, 'RECORD'),
    scheduled_at: optionalText(input.scheduled_at),
    published_at: optionalText(input.published_at),
    observed_at: optionalText(input.observed_at),
    external_url: optionalText(input.external_url),
    canonical_url: text(input.canonical_url),
    asset_sha256: text(input.asset_sha256).toLowerCase(),
    payload_sha256: optionalText(input.payload_sha256)?.toLowerCase() ?? null,
    watermark_scheme: optionalText(input.watermark_scheme),
    watermark_token: optionalText(input.watermark_token),
    watermark_verification: typeof input.watermark_verification === 'object' && input.watermark_verification ? input.watermark_verification : {},
    publication_snapshot: typeof input.publication_snapshot === 'object' && input.publication_snapshot ? input.publication_snapshot : {},
  };
}

export async function listReturnCertificates() {
  const service = createServiceSupabaseClient();
  const rows = await service
    .from('public_return_certificates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(250);

  return {
    schemaReady: !rows.error,
    warnings: rows.error ? [`public_return_certificates:${rows.error.message}`] : [],
    certificates: rows.error ? [] : rows.data ?? [],
  };
}

export async function readPublicReturnCertificate(certificateId: string) {
  if (!validCertificateId(certificateId)) return null;
  const service = createServiceSupabaseClient();
  const row = await service
    .from('public_return_certificates')
    .select('certificate_id,program_id,object_id,trace_id,parent_trace_id,platform,state,epistemic_class,scheduled_at,published_at,observed_at,external_url,canonical_url,asset_sha256,payload_sha256,watermark_scheme,watermark_token,watermark_verification,record_digest,created_at,updated_at')
    .eq('certificate_id', certificateId)
    .maybeSingle();

  if (row.error || !row.data) return null;
  return row.data;
}

export async function createReturnCertificate(input: JsonRecord, actorId: string): Promise<ServiceResult<unknown>> {
  const certificateId = text(input.certificateId).toUpperCase();
  const programId = text(input.programId);
  const objectId = text(input.objectId);
  const traceId = text(input.traceId);
  const platform = text(input.platform).toLowerCase() as ReturnPlatform;
  const assetSha = sha256(input.assetSha256);

  if (!validCertificateId(certificateId)) return { ok: false, error: 'return_certificate_id_invalid' };
  if (!programId || !objectId || !traceId) return { ok: false, error: 'return_certificate_lineage_required' };
  if (!RETURN_PLATFORMS.includes(platform)) return { ok: false, error: 'return_certificate_platform_invalid' };
  if (!assetSha) return { ok: false, error: 'return_certificate_asset_sha256_required' };

  const canonicalUrl = `https://systemfriction.org/return/${encodeURIComponent(certificateId)}`;
  const payloadSha = optionalText(input.payloadSha256) ? sha256(input.payloadSha256) : null;
  if (optionalText(input.payloadSha256) && !payloadSha) return { ok: false, error: 'return_certificate_payload_sha256_invalid' };

  const fields = canonicalCertificateFields({
    certificate_id: certificateId,
    program_id: programId,
    object_id: objectId,
    trace_id: traceId,
    parent_trace_id: optionalText(input.parentTraceId),
    platform,
    state: 'prepared',
    epistemic_class: text(input.epistemicClass, 'RECORD'),
    scheduled_at: optionalText(input.scheduledAt),
    published_at: null,
    observed_at: null,
    external_url: null,
    canonical_url: canonicalUrl,
    asset_sha256: assetSha,
    payload_sha256: payloadSha,
    watermark_scheme: optionalText(input.watermarkScheme),
    watermark_token: optionalText(input.watermarkToken),
    watermark_verification: input.watermarkVerification ?? {},
    publication_snapshot: {},
  });

  const service = createServiceSupabaseClient();
  const inserted = await service.from('public_return_certificates').insert({
    ...fields,
    record_digest: digest(fields),
    notes: optionalText(input.notes),
    created_by: actorId,
  }).select('*').single();

  if (inserted.error) return { ok: false, error: 'return_certificate_insert_failed', details: inserted.error.message };
  return { ok: true, data: inserted.data };
}

export async function publishReturnCertificate(input: JsonRecord, actorId: string): Promise<ServiceResult<unknown>> {
  const certificateId = text(input.certificateId).toUpperCase();
  const externalUrl = text(input.externalUrl);
  if (!validCertificateId(certificateId)) return { ok: false, error: 'return_certificate_id_invalid' };

  const service = createServiceSupabaseClient();
  const current = await service.from('public_return_certificates').select('*').eq('certificate_id', certificateId).maybeSingle();
  if (current.error) return { ok: false, error: 'return_certificate_lookup_failed', details: current.error.message };
  if (!current.data) return { ok: false, error: 'return_certificate_not_found' };
  if (current.data.state !== 'prepared') return { ok: false, error: 'return_certificate_not_prepared', details: String(current.data.state) };

  const platform = String(current.data.platform) as ReturnPlatform;
  if (!platformUrlMatches(platform, externalUrl)) return { ok: false, error: 'return_certificate_external_url_invalid_for_platform' };

  const now = new Date().toISOString();
  const fields = canonicalCertificateFields({
    ...current.data,
    state: 'published',
    published_at: optionalText(input.publishedAt) ?? now,
    observed_at: now,
    external_url: externalUrl,
    publication_snapshot: typeof input.publicationSnapshot === 'object' && input.publicationSnapshot ? input.publicationSnapshot : {},
  });

  const updated = await service.from('public_return_certificates').update({
    ...fields,
    record_digest: digest(fields),
    updated_at: now,
  }).eq('certificate_id', certificateId).select('*').single();

  if (updated.error) return { ok: false, error: 'return_certificate_publish_failed', details: updated.error.message };
  return { ok: true, data: updated.data };
}

export async function verifyReturnCertificate(input: JsonRecord, actorId: string): Promise<ServiceResult<unknown>> {
  const certificateId = text(input.certificateId).toUpperCase();
  if (!validCertificateId(certificateId)) return { ok: false, error: 'return_certificate_id_invalid' };

  const service = createServiceSupabaseClient();
  const current = await service.from('public_return_certificates').select('*').eq('certificate_id', certificateId).maybeSingle();
  if (current.error) return { ok: false, error: 'return_certificate_lookup_failed', details: current.error.message };
  if (!current.data) return { ok: false, error: 'return_certificate_not_found' };
  if (current.data.state !== 'published') return { ok: false, error: 'return_certificate_not_published', details: String(current.data.state) };

  const now = new Date().toISOString();
  const verification = typeof input.watermarkVerification === 'object' && input.watermarkVerification
    ? input.watermarkVerification
    : current.data.watermark_verification ?? {};
  const fields = canonicalCertificateFields({
    ...current.data,
    state: 'verified',
    observed_at: now,
    watermark_verification: verification,
  });

  const updated = await service.from('public_return_certificates').update({
    ...fields,
    record_digest: digest(fields),
    verified_by: actorId,
    updated_at: now,
  }).eq('certificate_id', certificateId).select('*').single();

  if (updated.error) return { ok: false, error: 'return_certificate_verify_failed', details: updated.error.message };
  return { ok: true, data: updated.data };
}

export async function invalidateReturnCertificate(input: JsonRecord, actorId: string): Promise<ServiceResult<unknown>> {
  const certificateId = text(input.certificateId).toUpperCase();
  if (!validCertificateId(certificateId)) return { ok: false, error: 'return_certificate_id_invalid' };

  const service = createServiceSupabaseClient();
  const current = await service.from('public_return_certificates').select('*').eq('certificate_id', certificateId).maybeSingle();
  if (current.error) return { ok: false, error: 'return_certificate_lookup_failed', details: current.error.message };
  if (!current.data) return { ok: false, error: 'return_certificate_not_found' };
  if (current.data.state === 'invalidated') return { ok: false, error: 'return_certificate_already_invalidated' };

  const now = new Date().toISOString();
  const fields = canonicalCertificateFields({ ...current.data, state: 'invalidated' });
  const updated = await service.from('public_return_certificates').update({
    ...fields,
    record_digest: digest(fields),
    invalidated_by: actorId,
    invalidated_at: now,
    updated_at: now,
  }).eq('certificate_id', certificateId).select('*').single();

  if (updated.error) return { ok: false, error: 'return_certificate_invalidate_failed', details: updated.error.message };
  return { ok: true, data: updated.data };
}
