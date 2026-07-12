import 'server-only';

import { createHash } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { normalizeAmvObjectClass, type AmvObjectClass } from './epistemicGate';

export type ExternalEvidenceObservationInput = {
  caseId?: string | null;
  objectId: string;
  objectClass: string;
  sourceType: string;
  sourceRef?: string | null;
  metricKey: string;
  rawValue: unknown;
  normalizedValue?: number | null;
  unit?: string | null;
  reliability: number;
  evidenceNote: string;
  epistemicClass?: 'observed' | 'declared' | 'derived' | 'inferred' | 'missing';
  capturedAt: string;
  operatorId?: string | null;
  consentEvidenceId?: string | null;
  payload?: Record<string, unknown>;
};

export type ExternalEvidenceObservation = {
  id: string;
  caseId: string | null;
  objectId: string;
  objectClass: AmvObjectClass;
  sourceType: string;
  sourceRef: string | null;
  metricKey: string;
  rawValue: unknown;
  normalizedValue: number | null;
  unit: string | null;
  reliability: number;
  evidenceNote: string;
  epistemicClass: string;
  capturedAt: string;
  operatorId: string | null;
  consentEvidenceId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type ExternalEvidenceVector = {
  objectId: string;
  generatedAt: string;
  observations: ExternalEvidenceObservation[];
  latestByMetric: Record<string, ExternalEvidenceObservation>;
  documentedKeys: string[];
  requiredKeys: string[];
  missingKeys: string[];
  coverage: number;
  weightedReliability: number | null;
  status: 'COMPLETE' | 'PARTIAL' | 'MISSING';
  warnings: string[];
};

type Row = Record<string, unknown>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function observationFromRow(row: Row): ExternalEvidenceObservation {
  return {
    id: String(row.id ?? ''),
    caseId: text(row.case_id),
    objectId: String(row.object_id ?? ''),
    objectClass: normalizeAmvObjectClass(row.object_class),
    sourceType: String(row.source_type ?? ''),
    sourceRef: text(row.source_ref),
    metricKey: String(row.metric_key ?? ''),
    rawValue: row.raw_value,
    normalizedValue: number(row.normalized_value),
    unit: text(row.unit),
    reliability: clamp01(number(row.reliability) ?? 0),
    evidenceNote: String(row.evidence_note ?? ''),
    epistemicClass: String(row.epistemic_class ?? 'declared'),
    capturedAt: String(row.captured_at ?? ''),
    operatorId: text(row.operator_id),
    consentEvidenceId: text(row.consent_evidence_id),
    payload: record(row.payload),
    createdAt: String(row.created_at ?? ''),
  };
}

export function externalEvidenceRequiredKeys(objectClass: AmvObjectClass): string[] {
  if (objectClass === 'music') return ['exposure', 'engagement_or_retention'];
  if (objectClass === 'article') return ['exposure', 'read_or_completion'];
  if (objectClass === 'social_post') return ['exposure', 'completion_or_interaction'];
  if (objectClass === 'website') return ['exposure', 'task_or_navigation_outcome'];
  if (objectClass === 'ai_response') return ['evaluation', 'revision_required'];
  if (objectClass === 'historical_event') return ['t0_context', 'observed_outcome'];
  if (objectClass === 'company' || objectClass === 'institution') return ['t0_context', 'observable_response'];
  if (objectClass === 'person' || objectClass === 'organization' || objectClass === 'movement') return ['consent_scope', 'observable_response'];
  return ['t0_context', 'observable_outcome'];
}

export async function readExternalEvidenceVector(input: {
  objectId: string;
  objectClass?: string | null;
  requiredKeys?: string[];
}): Promise<ExternalEvidenceVector> {
  const service = createServiceSupabaseClient();
  const result = await service
    .from('sfi_external_evidence_observations')
    .select('id,case_id,object_id,object_class,source_type,source_ref,metric_key,raw_value,normalized_value,unit,reliability,evidence_note,epistemic_class,captured_at,operator_id,consent_evidence_id,payload,created_at')
    .eq('object_id', input.objectId)
    .order('captured_at', { ascending: false })
    .limit(500);

  if (result.error) throw new Error(`EXTERNAL_EVIDENCE_READ_FAILED:${result.error.message}`);
  const observations = (result.data ?? []).map((item) => observationFromRow(item as Row));
  const objectClass = normalizeAmvObjectClass(input.objectClass ?? observations[0]?.objectClass);
  const requiredKeys = Array.from(new Set((input.requiredKeys ?? externalEvidenceRequiredKeys(objectClass)).filter(Boolean)));
  const latestByMetric: Record<string, ExternalEvidenceObservation> = {};
  for (const observation of observations) {
    if (!latestByMetric[observation.metricKey]) latestByMetric[observation.metricKey] = observation;
  }
  const documentedKeys = Object.keys(latestByMetric).sort();
  const missingKeys = requiredKeys.filter((key) => !latestByMetric[key]);
  const coverage = requiredKeys.length ? (requiredKeys.length - missingKeys.length) / requiredKeys.length : 0;
  const comparable = observations.filter((item) => item.normalizedValue !== null);
  const reliabilityWeight = comparable.reduce((sum, item) => sum + item.reliability, 0);
  const weightedReliability = reliabilityWeight > 0
    ? comparable.reduce((sum, item) => sum + (item.normalizedValue ?? 0) * item.reliability, 0) / reliabilityWeight
    : null;
  const warnings = observations
    .filter((item) => item.normalizedValue === null)
    .map((item) => `MISSING_NORMALIZED_VALUE:${item.metricKey}`);

  return {
    objectId: input.objectId,
    generatedAt: new Date().toISOString(),
    observations,
    latestByMetric,
    documentedKeys,
    requiredKeys,
    missingKeys,
    coverage,
    weightedReliability,
    status: !observations.length ? 'MISSING' : missingKeys.length ? 'PARTIAL' : 'COMPLETE',
    warnings,
  };
}

export async function recordExternalEvidence(input: ExternalEvidenceObservationInput) {
  const objectId = input.objectId.trim();
  const sourceType = input.sourceType.trim();
  const metricKey = input.metricKey.trim();
  const evidenceNote = input.evidenceNote.trim();
  const capturedAt = new Date(input.capturedAt);
  if (!objectId) throw new Error('EXTERNAL_EVIDENCE_OBJECT_REQUIRED');
  if (!sourceType) throw new Error('EXTERNAL_EVIDENCE_SOURCE_REQUIRED');
  if (!metricKey) throw new Error('EXTERNAL_EVIDENCE_METRIC_REQUIRED');
  if (evidenceNote.length < 6) throw new Error('EXTERNAL_EVIDENCE_NOTE_REQUIRED');
  if (!Number.isFinite(input.reliability) || input.reliability < 0 || input.reliability > 1) throw new Error('EXTERNAL_EVIDENCE_RELIABILITY_INVALID');
  if (Number.isNaN(capturedAt.getTime())) throw new Error('EXTERNAL_EVIDENCE_CAPTURED_AT_INVALID');
  if (input.normalizedValue !== null && typeof input.normalizedValue !== 'undefined' && (!Number.isFinite(input.normalizedValue) || input.normalizedValue < 0 || input.normalizedValue > 1)) {
    throw new Error('EXTERNAL_EVIDENCE_NORMALIZED_VALUE_INVALID');
  }

  const objectClass = normalizeAmvObjectClass(input.objectClass);
  const service = createServiceSupabaseClient();
  const row = {
    case_id: input.caseId ?? null,
    object_id: objectId,
    object_class: objectClass,
    source_type: sourceType,
    source_ref: input.sourceRef?.trim() || null,
    metric_key: metricKey,
    raw_value: input.rawValue ?? null,
    normalized_value: input.normalizedValue ?? null,
    unit: input.unit?.trim() || null,
    reliability: clamp01(input.reliability),
    evidence_note: evidenceNote,
    epistemic_class: input.epistemicClass ?? 'declared',
    captured_at: capturedAt.toISOString(),
    operator_id: input.operatorId ?? null,
    consent_evidence_id: input.consentEvidenceId ?? null,
    payload: input.payload ?? {},
  };
  const inserted = await service.from('sfi_external_evidence_observations').insert(row).select('*').single();
  if (inserted.error || !inserted.data) throw new Error(`EXTERNAL_EVIDENCE_INSERT_FAILED:${inserted.error?.message ?? 'unknown'}`);

  const evidenceHash = createHash('sha256').update(JSON.stringify({ objectId, sourceType, metricKey, capturedAt: row.captured_at, rawValue: row.raw_value })).digest('hex');
  const ledger = await service.from('sfi_evidence_ledger').insert({
    case_id: input.caseId ?? null,
    module: 'amv',
    evidence_kind: 'external_observation',
    source_name: sourceType,
    source_url: row.source_ref,
    private_ref: String(inserted.data.id),
    public_summary: {
      objectId,
      objectClass,
      metricKey,
      normalizedValue: row.normalized_value,
      reliability: row.reliability,
      epistemicClass: row.epistemic_class,
      capturedAt: row.captured_at,
    },
    evidence_hash: evidenceHash,
    anonymized: objectClass === 'person',
    trust_level: row.epistemic_class,
    trust_score: row.reliability,
    ldi: 1,
    public_weight: objectClass === 'person' ? 0 : row.reliability,
    observed_at: row.captured_at,
  });
  if (ledger.error) throw new Error(`EXTERNAL_EVIDENCE_LEDGER_FAILED:${ledger.error.message}`);

  return {
    observation: observationFromRow(inserted.data as Row),
    evidenceHash,
  };
}
