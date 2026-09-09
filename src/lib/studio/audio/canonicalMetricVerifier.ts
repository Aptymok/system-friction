import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { STUDIO_OBJECT_SYNTHESIS_SOURCE } from '@/lib/studio/production/objectContextSynthesisContract';
import { evaluateScoreFrictionCase } from '@/lib/scorefriction/store';
import type { SfiAudioMetricEvidence, SfiAudioMetricKey } from './closedLoop';

export const SFI_AUDIO_CANONICAL_METRIC_VERIFIER = 'SFI-AUDIO-CANONICAL-METRIC-VERIFIER-1.1' as const;

type MihmPayload = {
  objectId?: unknown;
  mihm?: {
    ihg?: unknown;
    weightedSum?: unknown;
    variables?: Array<{ key?: unknown; value?: unknown }>;
  };
};

function finite(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sameNumber(left: number, right: number) {
  return Math.abs(left - right) <= 1e-8;
}

function parseRef(ref: string, prefix: string) {
  return ref.startsWith(prefix) ? ref.slice(prefix.length) : null;
}

async function verifyMihm(value: number, evidence: SfiAudioMetricEvidence, ownerId: string | null) {
  if (!ownerId) return false;
  const traceId = parseRef(evidence.receiptRef, 'studio_evidence_trace:');
  const variableKey = parseRef(evidence.methodRef, 'MIHM:');
  if (!traceId || !variableKey) return false;
  const db = createServiceSupabaseClient();
  const row = await db.from('studio_evidence_traces')
    .select('id,object_id,owner_id,source,payload')
    .eq('id', traceId)
    .eq('owner_id', ownerId)
    .eq('source', STUDIO_OBJECT_SYNTHESIS_SOURCE)
    .maybeSingle();
  if (row.error || !row.data || String(row.data.owner_id) !== ownerId) return false;
  const payload = row.data.payload as MihmPayload | null;
  if (!payload || payload.objectId !== String(row.data.object_id)) return false;
  if (evidence.sourceRef !== `studio_object:${payload.objectId}`) return false;
  if (!evidence.evidenceRefs.includes(`studio_evidence_trace:${traceId}`)) return false;

  let persisted: number | null = null;
  if (variableKey === 'ihg') persisted = finite(payload.mihm?.ihg);
  else if (variableKey === 'weightedSum') persisted = finite(payload.mihm?.weightedSum);
  else persisted = finite(payload.mihm?.variables?.find((item) => item.key === variableKey)?.value);
  return persisted !== null && sameNumber(persisted, value);
}

async function verifyWorldSpect(value: number, evidence: SfiAudioMetricEvidence) {
  const suffix = parseRef(evidence.receiptRef, 'worldspect_snapshot:');
  const field = parseRef(evidence.methodRef, 'WORLDSPECT:');
  if (!suffix || (field !== 'wsi' && field !== 'nti')) return false;
  const separator = suffix.lastIndexOf(':');
  if (separator <= 0) return false;
  const snapshotId = suffix.slice(0, separator);
  const snapshotHash = suffix.slice(separator + 1);
  if (!snapshotId || !/^[a-f0-9]{64}$/i.test(snapshotHash)) return false;
  const db = createServiceSupabaseClient();
  const row = await db.from('worldspect_snapshots')
    .select('id,snapshot_hash,wsi,nti')
    .eq('id', snapshotId)
    .maybeSingle();
  if (row.error || !row.data || String(row.data.snapshot_hash) !== snapshotHash) return false;
  if (evidence.sourceRef !== evidence.receiptRef) return false;
  if (!evidence.evidenceRefs.includes(`worldspect_snapshot:${snapshotId}:${snapshotHash}`)) return false;
  const persisted = finite(field === 'wsi' ? row.data.wsi : row.data.nti);
  return persisted !== null && sameNumber(persisted, value);
}

async function verifyScoreFriction(value: number, evidence: SfiAudioMetricEvidence) {
  const caseId = parseRef(evidence.receiptRef, 'scorefriction_case:');
  if (!caseId || evidence.methodRef !== 'SCOREFRICTION:cvphi') return false;
  const evaluated = await evaluateScoreFrictionCase(caseId);
  if (!evaluated) return false;
  const persisted = finite(evaluated.cultural_vector.cvphi);
  const latestHash = evaluated.evidence?.latest_hash;
  if (persisted === null || !latestHash) return false;
  if (evidence.sourceRef !== `scorefriction_case:${caseId}`) return false;
  if (!evidence.evidenceRefs.includes(latestHash)) return false;
  return sameNumber(persisted, value);
}

export async function verifyCanonicalAudioMetric(input: {
  metric: SfiAudioMetricKey;
  value: number;
  requiredMethodRef: string;
  evidence: SfiAudioMetricEvidence | undefined;
  ownerId?: string | null;
}) {
  const evidence = input.evidence;
  if (!evidence || evidence.methodRef !== input.requiredMethodRef) return false;
  if (!evidence.receiptRef.trim() || !evidence.sourceRef.trim() || !evidence.evidenceRefs.length) return false;

  try {
    if (input.metric === 'fad') return false;
    if (input.metric === 'mihm') {
      if (evidence.owner !== 'MIHM' || evidence.epistemicClass !== 'DERIVED') return false;
      return await verifyMihm(input.value, evidence, input.ownerId?.trim() || null);
    }
    if (input.metric === 'wsv') {
      if (evidence.owner !== 'WORLDSPECT' || evidence.epistemicClass !== 'DERIVED') return false;
      return await verifyWorldSpect(input.value, evidence);
    }
    if (input.metric === 'cvf') {
      if (evidence.owner !== 'SCOREFRICTION' || evidence.epistemicClass !== 'DERIVED') return false;
      return await verifyScoreFriction(input.value, evidence);
    }
    return false;
  } catch {
    return false;
  }
}
