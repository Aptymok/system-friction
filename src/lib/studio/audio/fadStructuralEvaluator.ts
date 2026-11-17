import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const FAD_STRUCTURAL_METHOD = 'FAD:structural_contrast_v1' as const;
export const FAD_STRUCTURAL_SOURCE = 'studio_fad_structural_contrast_v1' as const;

type Segment = { i?: unknown; t0?: unknown; t1?: unknown; rms?: unknown };
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const validHash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);

export function calculateFadStructuralContrast(input: unknown): number | null {
  if (!Array.isArray(input) || input.length < 2) return null;
  let end = -Infinity, change = 0, magnitude = 0, previous: number | null = null;
  for (let index = 0; index < input.length; index += 1) {
    const segment = input[index] as Segment | null;
    if (!segment || !finite(segment.i) || segment.i !== index ||
        !finite(segment.t0) || !finite(segment.t1) || !finite(segment.rms) ||
        segment.t0 < end - 0.0002 || segment.t1 <= segment.t0 ||
        segment.rms < 0 || segment.rms > 1.000001) return null;
    if (previous !== null) {
      change += Math.abs(segment.rms - previous);
      magnitude += Math.max(segment.rms, previous);
    }
    end = segment.t1;
    previous = segment.rms;
  }
  return magnitude > 0 ? Number((change / magnitude).toFixed(8)) : null;
}

export async function evaluateStudioFadStructuralContrast(objectId: string, ownerId: string, sourceSha256: string) {
  if (!objectId || !ownerId || !validHash(sourceSha256)) throw new Error('FAD_SOURCE_IDENTITY_REQUIRED');
  const db = createServiceSupabaseClient();
  const owner = await db.from('studio_objects').select('id').eq('id', objectId).eq('owner_id', ownerId).maybeSingle();
  if (owner.error || !owner.data) throw new Error('FAD_OBJECT_OWNERSHIP_NOT_VERIFIED');
  const audio = await db.from('studio_audio_features')
    .select('id,energy_segments,payload').eq('object_id', objectId).order('created_at', { ascending: false }).limit(20);
  if (audio.error) throw new Error('FAD_AUDIO_READ_FAILED:' + audio.error.message);
  const row = audio.data?.find((item) => {
    const payload = item.payload as Record<string, unknown> | null;
    return payload?.checksumSha256 === sourceSha256;
  });
  const value = row ? calculateFadStructuralContrast(row.energy_segments) : null;
  if (value === null || !row) return {
    state: 'INSUFFICIENT_SIGNAL' as const, methodRef: FAD_STRUCTURAL_METHOD, value: null, receiptRef: null,
  };
  const receipts = await db.from('studio_evidence_traces').select('id,payload')
    .eq('object_id', objectId).eq('source', FAD_STRUCTURAL_SOURCE).order('created_at', { ascending: false }).limit(20);
  if (receipts.error) throw new Error('FAD_RECEIPT_READ_FAILED:' + receipts.error.message);
  const previous = receipts.data?.find((item) => {
    const payload = item.payload as Record<string, unknown> | null;
    return payload?.methodRef === FAD_STRUCTURAL_METHOD && payload?.audioFeatureId === row.id &&
      payload?.sourceSha256 === sourceSha256 && payload?.value === value;
  });
  if (previous) return { state: 'DERIVED' as const, methodRef: FAD_STRUCTURAL_METHOD,
    value, receiptRef: 'studio_evidence_trace:' + previous.id, reused: true };
  const created = await db.from('studio_evidence_traces').insert({
    object_id: objectId, source: FAD_STRUCTURAL_SOURCE,
    label: 'FAD acoustic structural contrast (not cultural affinity)',
    payload: { methodRef: FAD_STRUCTURAL_METHOD, audioFeatureId: row.id, sourceSha256, value,
      epistemicClass: 'DERIVED', calibration: 'FORMULA_ONLY_NOT_EMPIRICALLY_CALIBRATED',
      limitations: ['NOT_GLOBAL_FAD', 'NOT_AUDIENCE_AFFINITY', 'NOT_CULTURAL_OUTCOME'] },
  }).select('id').single();
  if (created.error || !created.data) throw new Error('FAD_RECEIPT_PERSIST_FAILED:' + (created.error?.message ?? 'unknown'));
  return { state: 'DERIVED' as const, methodRef: FAD_STRUCTURAL_METHOD,
    value, receiptRef: 'studio_evidence_trace:' + created.data.id, reused: false };
}

export async function verifyFadStructuralReceipt(input: {
  value: number; methodRef: string; receiptRef: string; sourceRef: string;
  evidenceRefs: string[]; ownerId: string;
}): Promise<boolean> {
  if (input.methodRef !== FAD_STRUCTURAL_METHOD || !finite(input.value) ||
      input.value < 0 || input.value > 1) return false;
  if (!input.receiptRef.startsWith('studio_evidence_trace:') ||
      !input.sourceRef.startsWith('studio_object:') ||
      !input.evidenceRefs.includes(input.receiptRef)) return false;
  const traceId = input.receiptRef.slice('studio_evidence_trace:'.length);
  const objectId = input.sourceRef.slice('studio_object:'.length);
  if (!traceId || !objectId || !input.ownerId) return false;
  const db = createServiceSupabaseClient();
  const trace = await db.from('studio_evidence_traces').select('object_id,payload')
    .eq('id', traceId).eq('object_id', objectId).eq('source', FAD_STRUCTURAL_SOURCE).maybeSingle();
  if (trace.error || !trace.data) return false;
  const owned = await db.from('studio_objects').select('id')
    .eq('id', objectId).eq('owner_id', input.ownerId).maybeSingle();
  if (owned.error || !owned.data) return false;
  const p = trace.data.payload as Record<string, unknown> | null;
  if (p?.methodRef !== FAD_STRUCTURAL_METHOD || p.value !== input.value ||
      !validHash(p.sourceSha256) || typeof p.audioFeatureId !== 'string') return false;
  const audio = await db.from('studio_audio_features').select('energy_segments,payload')
    .eq('id', p.audioFeatureId).eq('object_id', objectId).maybeSingle();
  if (audio.error || !audio.data) return false;
  const source = audio.data.payload as Record<string, unknown> | null;
  return source?.checksumSha256 === p.sourceSha256 &&
    calculateFadStructuralContrast(audio.data.energy_segments) === input.value;
}
