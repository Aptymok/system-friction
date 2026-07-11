import { NextResponse } from 'next/server';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';
import { runPrediction } from '@/lib/predictive-engine/service';
import type {
  PredictiveEvidenceInput,
  PredictiveFeatureInput,
  PredictiveReturnWindow,
  PredictiveTargetKind,
  PredictiveVerificationRule,
} from '@/lib/predictive-engine/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function cleanText(value: unknown, maximum = 240) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maximum) : null;
}

function cleanNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : null;
  return parsed !== null && Number.isFinite(parsed) ? parsed : null;
}

function featureInputs(value: unknown): PredictiveFeatureInput[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => record(item)).map((item) => ({
    key: cleanText(item.key, 120) ?? '',
    value: cleanNumber(item.value),
    confidence: cleanNumber(item.confidence),
    source: cleanText(item.source, 240),
    evidenceIds: Array.isArray(item.evidenceIds) ? item.evidenceIds.map(String).slice(0, 50) : [],
    observedAt: cleanText(item.observedAt, 80),
  })).filter((item) => item.key);
}

function evidenceInputs(value: unknown): PredictiveEvidenceInput[] {
  if (!Array.isArray(value)) return [];
  const allowedTrust = new Set(['VERIFIED', 'OBSERVED', 'DECLARED', 'INFERRED', 'UNKNOWN']);
  return value.map((item) => record(item)).map((item) => ({
    id: cleanText(item.id, 180) ?? undefined,
    key: cleanText(item.key, 120) ?? '',
    source: cleanText(item.source, 240) ?? 'unknown',
    trust: allowedTrust.has(String(item.trust)) ? String(item.trust) as PredictiveEvidenceInput['trust'] : 'UNKNOWN',
    value: item.value,
    observedAt: cleanText(item.observedAt, 80),
  })).filter((item) => item.key);
}

function returnWindow(value: unknown): PredictiveReturnWindow {
  return value === '72h' || value === '7d' || value === '90d' ? value : '30d';
}

function targetKind(value: unknown): PredictiveTargetKind {
  return value === 'continuous' ? 'continuous' : 'binary';
}

function verificationRule(value: unknown): PredictiveVerificationRule | null {
  const item = record(value);
  const observable = cleanText(item.observable, 240);
  if (!observable) return null;
  const comparator = ['gte', 'lte', 'equals', 'contains', 'changes_by'].includes(String(item.comparator))
    ? String(item.comparator) as PredictiveVerificationRule['comparator']
    : 'gte';
  return {
    observable,
    comparator,
    threshold: typeof item.threshold === 'boolean' || typeof item.threshold === 'number' || typeof item.threshold === 'string' ? item.threshold : 0.5,
    returnWindow: returnWindow(item.returnWindow),
    sourcePriority: Array.isArray(item.sourcePriority) ? item.sourcePriority.map(String).slice(0, 10) : ['observed_metric'],
    trueCondition: cleanText(item.trueCondition, 800) ?? 'Observable satisfies the declared threshold.',
    falseCondition: cleanText(item.falseCondition, 800) ?? 'Observable does not satisfy the declared threshold.',
    partialCondition: cleanText(item.partialCondition, 800),
    unverifiableCondition: cleanText(item.unverifiableCondition, 800) ?? 'No trustworthy observable is available.',
  };
}

export async function POST(request: Request) {
  try {
    const access = await requireAuthenticatedUser();
    const body = record(await request.json().catch(() => null));
    const scope = cleanText(body.scope, 120);
    const subjectType = cleanText(body.subjectType, 120);
    const subjectId = cleanText(body.subjectId, 240);
    if (!scope || !subjectType || !subjectId) {
      return NextResponse.json({ ok: false, error: 'PREDICTIVE_SUBJECT_REQUIRED' }, { status: 400 });
    }
    const features = featureInputs(body.features);
    if (!features.length) {
      return NextResponse.json({ ok: false, error: 'PREDICTIVE_FEATURES_REQUIRED' }, { status: 400 });
    }
    const result = await runPrediction({
      scope,
      subjectType,
      subjectId,
      modelKey: cleanText(body.modelKey, 160),
      targetKey: cleanText(body.targetKey, 160),
      targetKind: targetKind(body.targetKind),
      returnWindow: returnWindow(body.returnWindow),
      features,
      evidence: evidenceInputs(body.evidence),
      context: record(body.context),
      verificationRule: verificationRule(body.verificationRule),
      persist: body.persist !== false,
      ownerId: access.user.id,
      createdBy: access.user.id,
    });
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'PREDICTIVE_RUN_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
