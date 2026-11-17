import 'server-only';

import { createHash } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { transcodeAudioToFloatWav } from '@/lib/studio/multimodal/mediaRuntime';
import { loadStudioAudioBytes } from './audioStorage';

export const STUDIO_MIHM_SOURCE = 'studio_mihm_v3_canonical_python' as const;
const METHOD = 'MIHM_V3_CANONICAL_ACOUSTIC';
const CORE = ['F_s', 'D_i', 'E_r', 'C_s', 'D_cog', 'G_f'] as const;

export async function runStudioCanonicalMihm(objectId: string, expectedSourceSha256: string) {
  const url = process.env.SFI_ENGINE_URL?.replace(/\/$/, '');
  const token = process.env.SFI_ENGINE_STUDIO_TOKEN || process.env.CRON_SECRET;
  if (!url || !token) return { state: 'BLOCKED' as const, reason: 'MIHM_PYTHON_SERVICE_NOT_CONFIGURED' };
  if (!/^https:\/\//.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url)) {
    return { state: 'BLOCKED' as const, reason: 'MIHM_SERVICE_REQUIRES_TLS' };
  }
  const db = createServiceSupabaseClient();
  const prior = await db.from('studio_evidence_traces').select('id,payload')
    .eq('object_id', objectId).eq('source', STUDIO_MIHM_SOURCE)
    .order('created_at', { ascending: false }).limit(20);
  if (prior.error) throw new Error('MIHM_RECEIPT_LOOKUP_FAILED:' + prior.error.message);
  const cached = prior.data?.find(row => {
    const p = row.payload as Record<string, unknown> | null;
    return p?.method === METHOD && p?.sourceSha256 === expectedSourceSha256 && p?.state === 'DERIVED';
  });
  if (cached) {
    return { state: 'DERIVED' as const, receiptRef: 'studio_evidence_trace:' + cached.id,
      result: cached.payload, reused: true };
  }

  const stored = await loadStudioAudioBytes(objectId);
  if (stored.checksumSha256 !== expectedSourceSha256) {
    return { state: 'BLOCKED' as const, reason: 'MIHM_SOURCE_IDENTITY_CHANGED' };
  }
  const metadata = (stored.object.metadata ?? {}) as Record<string, unknown>;
  const name = String(metadata.originalFileName ?? stored.upload.storage_path ?? 'audio.wav');
  const extension = name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  const isWav = stored.bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    stored.bytes.subarray(8, 12).toString('ascii') === 'WAVE';
  const wav = isWav ? stored.bytes : await transcodeAudioToFloatWav(stored.bytes, extension);
  const wavHash = createHash('sha256').update(wav).digest('hex');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 280_000);
  let response: Response;
  try {
    response = await fetch(url + '/evaluate-audio', {
      method: 'POST',
      headers: { 'content-type': 'audio/wav', 'x-content-sha256': wavHash, 'x-sfi-studio-token': token },
      body: new Uint8Array(wav),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch {
    return { state: 'BLOCKED' as const, reason: 'MIHM_PYTHON_SERVICE_UNREACHABLE' };
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) return { state: 'BLOCKED' as const, reason: 'MIHM_PYTHON_SERVICE_HTTP_' + response.status };
  const data = await response.json() as Record<string, unknown>;
  const vector = data.mihm_vector as Record<string, unknown> | null;
  const coreValid = vector && CORE.every(key =>
    typeof vector[key] === 'number' && Number.isFinite(vector[key]) &&
    (vector[key] as number) >= 0 && (vector[key] as number) <= 1);
  if (data.method !== METHOD || data.source_sha256 !== wavHash ||
      data.core_emission_valid !== coreValid ||
      (coreValid && data.state !== 'DERIVED')) {
    return { state: 'BLOCKED' as const, reason: 'MIHM_PYTHON_RESULT_CONTRACT_INVALID' };
  }
  if (!coreValid) {
    return { state: 'INSUFFICIENT_DATA' as const, method: METHOD, result: data };
  }
  if (data.nti !== null || data.ihg_final !== null ||
      typeof data.ihg_raw !== 'number' || !Number.isFinite(data.ihg_raw)) {
    return { state: 'BLOCKED' as const, reason: 'MIHM_UNSUPPORTED_FINAL_IHG_CLAIM' };
  }
  const payload = {
    method: METHOD, state: 'DERIVED', epistemicClass: 'DERIVED',
    sourceSha256: stored.checksumSha256, wavSha256: wavHash,
    extractor: 'python/scorefriction/audio_features.py',
    mihm_vector: vector, core_emission_valid: true,
    ihg_raw: data.ihg_raw, ihg_final: null, nti: null,
    weighted_sum: data.weighted_sum, penalty_sum: data.penalty_sum,
    warnings: data.warnings,
  };
  const inserted = await db.from('studio_evidence_traces').insert({
    object_id: objectId, source: STUDIO_MIHM_SOURCE,
    label: 'MIHM v3 original Python acoustic extraction',
    payload,
  }).select('id').single();
  if (inserted.error || !inserted.data) throw new Error('MIHM_RECEIPT_PERSIST_FAILED:' + (inserted.error?.message ?? 'unknown'));
  return { state: 'DERIVED' as const, receiptRef: 'studio_evidence_trace:' + inserted.data.id,
    result: payload, reused: false };
}
