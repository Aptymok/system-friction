import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { getPredictiveRun, runPrediction } from './service';
import type { PredictiveEvidenceInput, PredictiveFeatureInput, PredictiveVerificationRule } from './types';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function featureRows(value: unknown): PredictiveFeatureInput[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => record(item)).map((item) => ({
    key: String(item.key ?? ''),
    value: typeof item.value === 'number' && Number.isFinite(item.value) ? item.value : null,
    confidence: typeof item.confidence === 'number' && Number.isFinite(item.confidence) ? item.confidence : null,
    source: typeof item.source === 'string' ? item.source : null,
    evidenceIds: Array.isArray(item.evidenceIds) ? item.evidenceIds.map(String) : [],
    observedAt: typeof item.observedAt === 'string' ? item.observedAt : null,
  })).filter((item) => item.key);
}

function evidenceTrust(value: unknown): PredictiveEvidenceInput['trust'] {
  if (value === 'VERIFIED' || value === 'OBSERVED' || value === 'DECLARED' || value === 'INFERRED') return value;
  return 'UNKNOWN';
}

function evidenceRows(value: unknown): PredictiveEvidenceInput[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => record(item)).map((item): PredictiveEvidenceInput => ({
    id: typeof item.id === 'string' ? item.id : undefined,
    key: String(item.key ?? ''),
    source: typeof item.source === 'string' ? item.source : 'unknown',
    trust: evidenceTrust(item.trust),
    value: item.value,
    observedAt: typeof item.observedAt === 'string' ? item.observedAt : null,
  })).filter((item) => item.key);
}

export async function fulfillPredictiveEvidence(input: {
  runId: string;
  evidenceKey: string;
  source: string;
  trust: PredictiveEvidenceInput['trust'];
  evidenceValue?: unknown;
  featureValue?: number | null;
  featureConfidence?: number | null;
  sourceRef?: string | null;
  observedAt?: string | null;
  ownerId?: string | null;
  createdBy?: string | null;
}) {
  const service = createServiceSupabaseClient();
  const current = await getPredictiveRun(input.runId);
  const run = record(current.run);
  const snapshot = record(run.input_snapshot);
  const features = featureRows(snapshot.features);
  const evidence = evidenceRows(snapshot.evidence);
  const observedAt = input.observedAt ?? new Date().toISOString();
  const evidenceId = input.sourceRef ?? `predictive-evidence:${input.runId}:${input.evidenceKey}:${observedAt}`;
  const nextEvidence: PredictiveEvidenceInput = {
    id: evidenceId,
    key: input.evidenceKey,
    source: input.source,
    trust: input.trust,
    value: input.evidenceValue ?? input.featureValue ?? null,
    observedAt,
  };
  const nextFeatures = [...features.filter((item) => item.key !== input.evidenceKey)];
  if (input.featureValue !== null && typeof input.featureValue !== 'undefined' && Number.isFinite(input.featureValue)) {
    nextFeatures.push({
      key: input.evidenceKey,
      value: Math.max(0, Math.min(1, input.featureValue)),
      confidence: Math.max(0, Math.min(1, input.featureConfidence ?? (input.trust === 'VERIFIED' ? 1 : input.trust === 'OBSERVED' ? 0.8 : 0.55))),
      source: input.source,
      evidenceIds: [evidenceId],
      observedAt,
    });
  }

  const evidenceUpdate = await service.from('sfi_predictive_evidence_requests').update({
    status: 'FULFILLED',
    fulfilled_evidence: nextEvidence,
    fulfilled_at: observedAt,
  }).eq('run_id', input.runId).eq('evidence_key', input.evidenceKey);
  if (evidenceUpdate.error) throw new Error(`PREDICTIVE_EVIDENCE_FULFILL_FAILED: ${evidenceUpdate.error.message}`);

  const next = await runPrediction({
    scope: String(run.scope ?? 'system'),
    subjectType: String(run.subject_type ?? 'unknown'),
    subjectId: String(run.subject_id ?? input.runId),
    targetKey: String(run.target_key ?? 'observable_outcome'),
    targetKind: run.target_kind === 'continuous' ? 'continuous' : 'binary',
    returnWindow: run.requested_return_window === '72h' || run.requested_return_window === '7d' || run.requested_return_window === '90d' ? run.requested_return_window : '30d',
    features: nextFeatures,
    evidence: [...evidence.filter((item) => item.key !== input.evidenceKey), nextEvidence],
    context: { ...record(snapshot.context), supersedesRunId: input.runId, fulfilledEvidenceKey: input.evidenceKey },
    verificationRule: record(run.verification_rule) as PredictiveVerificationRule,
    persist: true,
    ownerId: input.ownerId ?? (typeof run.owner_id === 'string' ? run.owner_id : null),
    createdBy: input.createdBy ?? input.ownerId ?? null,
  });

  const supersede = await service.from('sfi_predictive_runs').update({
    status: 'SUPERSEDED',
    interpretation: { ...record(run.interpretation), supersededBy: next.id, supersededReason: `Evidence ${input.evidenceKey} fulfilled.` },
  }).eq('id', input.runId);
  if (supersede.error) throw new Error(`PREDICTIVE_RUN_SUPERSEDE_FAILED: ${supersede.error.message}`);

  return {
    fulfilledRunId: input.runId,
    evidenceKey: input.evidenceKey,
    newRun: next,
  };
}
