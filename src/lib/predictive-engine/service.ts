import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { appendLogbookEntry } from '@/lib/logbook/query';
import {
  calibrationStatus,
  classifyPredictionError,
  predictBinary,
  qualityWeight,
  updateBinaryModel,
  type PredictiveModelState,
} from './calibration';
import { buildAmvAssessment, interpretPrediction, reflectOnPredictionError } from './amvInterpreter';
import type {
  PredictiveEngineHealth,
  PredictiveEvidenceInput,
  PredictiveEvidenceRequest,
  PredictiveFeatureInput,
  PredictiveLearningResult,
  PredictiveOutcomeInput,
  PredictiveRequest,
  PredictiveReturnWindow,
  PredictiveRunResult,
  PredictiveVerificationRule,
} from './types';

const MODEL_TABLE = 'sfi_predictive_models';
const RUN_TABLE = 'sfi_predictive_runs';
const EVIDENCE_REQUEST_TABLE = 'sfi_predictive_evidence_requests';
const OUTCOME_TABLE = 'sfi_predictive_outcomes';
const LEARNING_TABLE = 'sfi_predictive_learning_events';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function rows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numeric(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function windowMilliseconds(window: PredictiveReturnWindow) {
  if (window === '72h') return 72 * 60 * 60 * 1000;
  if (window === '7d') return 7 * 24 * 60 * 60 * 1000;
  if (window === '90d') return 90 * 24 * 60 * 60 * 1000;
  return 30 * 24 * 60 * 60 * 1000;
}

function dueAt(window: PredictiveReturnWindow, startedAt = Date.now()) {
  return new Date(startedAt + windowMilliseconds(window)).toISOString();
}

function defaultVerificationRule(targetKey: string, window: PredictiveReturnWindow): PredictiveVerificationRule {
  return {
    observable: targetKey,
    comparator: 'gte',
    threshold: 0.5,
    returnWindow: window,
    sourcePriority: ['verified_platform_metric', 'observed_runtime_metric', 'declared_operator_outcome'],
    trueCondition: `${targetKey} >= 0.5 in the declared return window`,
    falseCondition: `${targetKey} < 0.5 in the declared return window`,
    partialCondition: 'The observable exists but exposure, fidelity, or source quality is incomplete.',
    unverifiableCondition: 'No observable outcome or trustworthy source exists for the declared window.',
  };
}

function modelFromRow(value: unknown): PredictiveModelState {
  const row = record(value);
  return {
    id: String(row.id ?? ''),
    scope: String(row.scope ?? 'system'),
    modelKey: String(row.model_key ?? 'generic_binary_v1'),
    targetKey: String(row.target_key ?? 'observable_outcome'),
    targetKind: row.target_kind === 'continuous' ? 'continuous' : 'binary',
    version: numeric(row.version) ?? 1,
    status: row.status === 'SHADOW' || row.status === 'FROZEN' || row.status === 'RETIRED' ? row.status : 'ACTIVE',
    featureSchema: rows(row.feature_schema).map((item) => ({
      key: String(item.key ?? ''),
      required: item.required === true,
      default: numeric(item.default) ?? undefined,
    })).filter((item) => item.key),
    weights: Object.fromEntries(Object.entries(record(row.weights)).map(([key, item]) => [key, numeric(item) ?? 0])),
    intercept: numeric(row.intercept) ?? 0,
    learningRate: numeric(row.learning_rate) ?? 0.03,
    sampleCount: numeric(row.sample_count) ?? 0,
    verifiedSampleCount: numeric(row.verified_sample_count) ?? 0,
    metrics: Object.fromEntries(Object.entries(record(row.metrics)).map(([key, item]) => [key, numeric(item)])),
  };
}

function featureValues(features: PredictiveFeatureInput[]) {
  return Object.fromEntries(features
    .filter((item) => item.key && item.value !== null && Number.isFinite(item.value))
    .map((item) => [item.key, {
      value: clamp01(Number(item.value)),
      confidence: clamp01(item.confidence ?? 0.65),
      source: item.source ?? null,
      evidenceIds: item.evidenceIds ?? [],
    }]));
}

function evidenceTrustWeight(evidence: PredictiveEvidenceInput[]) {
  const weights: Record<PredictiveEvidenceInput['trust'], number> = {
    VERIFIED: 1,
    OBSERVED: 0.8,
    DECLARED: 0.55,
    INFERRED: 0.3,
    UNKNOWN: 0.1,
  };
  if (!evidence.length) return 0.2;
  return evidence.reduce((sum, item) => sum + weights[item.trust], 0) / evidence.length;
}

function requestForFeature(key: string, scope: string): PredictiveEvidenceRequest {
  const descriptions: Record<string, string> = {
    field_compatibility: 'Compatibilidad del objeto con el campo actual, calculada desde dimensiones compartidas.',
    world_confidence: 'Confianza y cobertura del snapshot longitudinal utilizado.',
    mihm_coverage: 'Cobertura del vector MIHM disponible para el objeto o fenómeno.',
    signal_strength: 'Magnitud observable de la señal que sostiene la predicción.',
    evidence_coverage: 'Proporción de variables respaldadas por evidencia trazable.',
    context_confidence: 'Confianza del contexto donde se espera observar el outcome.',
  };
  return {
    evidenceKey: key,
    description: descriptions[key] ?? `Evidencia observable para la variable ${key}.`,
    reason: `El modelo ${scope} declara ${key} como feature requerida; se usó un prior de baja confianza para no bloquear la proyección.`,
    sourceCandidates: scope === 'studio'
      ? ['studio_object_features', 'studio_object_context_synthesis', 'worldspect_snapshots', 'scorefriction_vectors', 'platform_outcome_export']
      : ['internal_runtime_state', 'worldspect_snapshots', 'operator_evidence', 'verified_external_source'],
    autoCollectible: ['field_compatibility', 'world_confidence', 'mihm_coverage', 'mihm_core_coverage'].includes(key),
    priority: key === 'world_confidence' || key === 'evidence_coverage' ? 'HIGH' : 'MEDIUM',
  };
}

async function loadModel(scope: string, requestedModelKey?: string | null) {
  const service = createServiceSupabaseClient();
  const modelKey = requestedModelKey ?? (scope === 'studio' ? 'studio_field_response_v1' : 'generic_binary_v1');
  const preferredScope = scope === 'studio' ? 'studio' : 'system';
  const preferred = await service
    .from(MODEL_TABLE)
    .select('*')
    .eq('scope', preferredScope)
    .eq('model_key', modelKey)
    .eq('status', 'ACTIVE')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!preferred.error && preferred.data) return modelFromRow(preferred.data);

  const fallback = await service
    .from(MODEL_TABLE)
    .select('*')
    .eq('scope', 'system')
    .eq('model_key', 'generic_binary_v1')
    .eq('status', 'ACTIVE')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fallback.error || !fallback.data) throw new Error(`PREDICTIVE_MODEL_NOT_AVAILABLE: ${fallback.error?.message ?? modelKey}`);
  return modelFromRow(fallback.data);
}

async function logLearning(input: { caseId?: string | null; eventType: string; summary: string; payload: unknown }) {
  try {
    await appendLogbookEntry({
      scope: 'predictive-engine',
      visibility: 'root',
      case_id: input.caseId ?? null,
      event_type: input.eventType,
      title: 'Predictive learning engine',
      summary: input.summary,
      payload: input.payload,
    });
  } catch {
    // The engine must not fail because the optional logbook adapter is unavailable.
  }
}

export async function runPrediction(request: PredictiveRequest): Promise<PredictiveRunResult> {
  if (!request.scope.trim() || !request.subjectType.trim() || !request.subjectId.trim()) throw new Error('PREDICTIVE_SUBJECT_REQUIRED');
  if (!Array.isArray(request.features)) throw new Error('PREDICTIVE_FEATURES_REQUIRED');

  const service = createServiceSupabaseClient();
  const model = await loadModel(request.scope, request.modelKey);
  if (model.targetKind !== 'binary') throw new Error('CONTINUOUS_TARGET_NOT_IMPLEMENTED');
  const values = featureValues(request.features);
  const missingEvidence = model.featureSchema
    .filter((schema) => schema.required && !values[schema.key])
    .map((schema) => requestForFeature(schema.key, request.scope));
  const calculated = predictBinary({ model, values });
  const evidence = request.evidence ?? [];
  const trust = evidenceTrustWeight(evidence);
  const missingPenalty = missingEvidence.length / Math.max(1, model.featureSchema.filter((item) => item.required).length);
  const confidence = clamp01(calculated.confidence * (0.55 + trust * 0.45) * (1 - missingPenalty * 0.45));
  const marginExpansion = (1 - confidence) * 0.12;
  const lowerBound = clamp01(calculated.lowerBound - marginExpansion);
  const upperBound = clamp01(calculated.upperBound + marginExpansion);
  const status = missingEvidence.length ? 'WAITING_EVIDENCE' as const : 'OPEN' as const;
  const returnWindow = request.returnWindow ?? '30d';
  const verificationRule = request.verificationRule ?? defaultVerificationRule(request.targetKey ?? model.targetKey, returnWindow);
  const currentCalibration = calibrationStatus(model);
  const amv = buildAmvAssessment({
    confidence,
    prediction: calculated.prediction,
    missingEvidence,
    contributions: calculated.contributions,
    verifiedSampleCount: model.verifiedSampleCount,
    calibrationStatus: currentCalibration,
  });
  const interpretation = await interpretPrediction({
    scope: request.scope,
    subjectType: request.subjectType,
    subjectId: request.subjectId,
    targetKey: request.targetKey ?? model.targetKey,
    prediction: calculated.prediction,
    lowerBound,
    upperBound,
    confidence,
    calibrationStatus: currentCalibration,
    contributions: calculated.contributions,
    missingEvidence,
    context: request.context,
  });
  const createdAt = new Date().toISOString();
  const due = dueAt(returnWindow);
  let runId: string | null = null;

  if (request.persist !== false) {
    const inserted = await service.from(RUN_TABLE).insert({
      owner_id: request.ownerId ?? null,
      scope: request.scope,
      subject_type: request.subjectType,
      subject_id: request.subjectId,
      model_id: model.id,
      model_version: model.version,
      target_key: request.targetKey ?? model.targetKey,
      target_kind: model.targetKind,
      status,
      prediction: calculated.prediction,
      lower_bound: lowerBound,
      upper_bound: upperBound,
      confidence,
      calibration_status: currentCalibration,
      input_snapshot: { features: request.features, evidence, context: request.context ?? {} },
      feature_vector: Object.fromEntries(Object.entries(values).map(([key, item]) => [key, item.value])),
      feature_contributions: calculated.contributions,
      evidence_refs: evidence,
      missing_evidence: missingEvidence,
      interpretation,
      amv_assessment: amv,
      verification_rule: verificationRule,
      requested_return_window: returnWindow,
      due_at: due,
      created_by: request.createdBy ?? request.ownerId ?? null,
    }).select('id').single();
    if (inserted.error || !inserted.data) throw new Error(`PREDICTIVE_RUN_INSERT_FAILED: ${inserted.error?.message ?? 'unknown'}`);
    runId = String(inserted.data.id);
    if (missingEvidence.length) {
      const evidenceRows = missingEvidence.map((item) => ({
        run_id: runId,
        evidence_key: item.evidenceKey,
        description: item.description,
        reason: item.reason,
        source_candidates: item.sourceCandidates,
        auto_collectible: item.autoCollectible,
        priority: item.priority,
        status: 'OPEN',
      }));
      const evidenceInsert = await service.from(EVIDENCE_REQUEST_TABLE).insert(evidenceRows);
      if (evidenceInsert.error) throw new Error(`PREDICTIVE_EVIDENCE_REQUEST_INSERT_FAILED: ${evidenceInsert.error.message}`);
    }
    await logLearning({
      caseId: request.subjectId,
      eventType: 'prediction_registered',
      summary: `Predicción ${request.scope}/${request.subjectType} registrada con confianza ${confidence.toFixed(3)} y ${missingEvidence.length} hueco(s) de evidencia.`,
      payload: { runId, model: model.modelKey, prediction: calculated.prediction, confidence, status, amv },
    });
  }

  return {
    id: runId,
    scope: request.scope,
    subjectType: request.subjectType,
    subjectId: request.subjectId,
    model: {
      id: model.id,
      key: model.modelKey,
      version: model.version,
      targetKey: request.targetKey ?? model.targetKey,
      targetKind: model.targetKind,
      sampleCount: model.sampleCount,
      verifiedSampleCount: model.verifiedSampleCount,
      calibrationStatus: currentCalibration,
    },
    prediction: calculated.prediction,
    lowerBound,
    upperBound,
    confidence,
    featureContributions: calculated.contributions,
    missingEvidence,
    interpretation,
    amv,
    verificationRule,
    returnWindow,
    dueAt: due,
    status,
    calibrationNotice: currentCalibration === 'BOOTSTRAP_UNCALIBRATED'
      ? 'El modelo usa priors explícitos y todavía no tiene outcomes verificados suficientes. La predicción es una hipótesis de trabajo.'
      : currentCalibration === 'DRIFT_WARNING'
        ? 'El error acumulado indica drift; use la predicción solo como escenario y revise el modelo.'
        : `Modelo en estado ${currentCalibration}.`,
    createdAt,
  };
}

export async function getPredictiveRun(runId: string) {
  const service = createServiceSupabaseClient();
  const [run, evidence, outcomes, learning] = await Promise.all([
    service.from(RUN_TABLE).select('*').eq('id', runId).maybeSingle(),
    service.from(EVIDENCE_REQUEST_TABLE).select('*').eq('run_id', runId).order('created_at', { ascending: true }),
    service.from(OUTCOME_TABLE).select('*').eq('run_id', runId).order('observed_at', { ascending: true }),
    service.from(LEARNING_TABLE).select('*').eq('run_id', runId).order('created_at', { ascending: true }),
  ]);
  if (run.error || !run.data) throw new Error(`PREDICTIVE_RUN_NOT_FOUND: ${run.error?.message ?? runId}`);
  return {
    run: run.data,
    evidenceRequests: evidence.data ?? [],
    outcomes: outcomes.data ?? [],
    learningEvents: learning.data ?? [],
  };
}

export async function getLatestPredictiveRun(scope: string, subjectType: string, subjectId: string) {
  const service = createServiceSupabaseClient();
  const result = await service.from(RUN_TABLE)
    .select('*')
    .eq('scope', scope)
    .eq('subject_type', subjectType)
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(`PREDICTIVE_RUN_READ_FAILED: ${result.error.message}`);
  return result.data ?? null;
}

export async function registerPredictiveOutcome(input: PredictiveOutcomeInput): Promise<PredictiveLearningResult> {
  const service = createServiceSupabaseClient();
  const runResult = await service.from(RUN_TABLE).select('*').eq('id', input.runId).maybeSingle();
  if (runResult.error || !runResult.data) throw new Error(`PREDICTIVE_RUN_NOT_FOUND: ${runResult.error?.message ?? input.runId}`);
  const run = record(runResult.data);
  const modelResult = await service.from(MODEL_TABLE).select('*').eq('id', String(run.model_id)).maybeSingle();
  if (modelResult.error || !modelResult.data) throw new Error(`PREDICTIVE_MODEL_NOT_FOUND: ${modelResult.error?.message ?? run.model_id}`);
  const model = modelFromRow(modelResult.data);
  const predicted = numeric(run.prediction) ?? 0;
  const actual = input.actualValue === null || typeof input.actualValue === 'undefined' ? null : clamp01(input.actualValue);
  const quality = qualityWeight(input.sourceQuality, input.interventionFidelity);
  const contributions = rows(run.feature_contributions).map((item) => ({
    key: String(item.key ?? ''),
    rawValue: numeric(item.rawValue) ?? numeric(item.raw_value) ?? 0,
    normalizedValue: numeric(item.normalizedValue) ?? numeric(item.normalized_value) ?? 0,
    weight: numeric(item.weight) ?? 0,
    contribution: numeric(item.contribution) ?? 0,
    confidence: numeric(item.confidence) ?? 0,
    source: text(item.source),
    evidenceIds: Array.isArray(item.evidenceIds) ? item.evidenceIds.map(String) : Array.isArray(item.evidence_ids) ? item.evidence_ids.map(String) : [],
  }));
  const missingEvidence = rows(run.missing_evidence).map((item) => ({
    evidenceKey: String(item.evidenceKey ?? item.evidence_key ?? ''),
    description: String(item.description ?? ''),
    reason: String(item.reason ?? ''),
    sourceCandidates: Array.isArray(item.sourceCandidates) ? item.sourceCandidates.map(String) : [],
    autoCollectible: item.autoCollectible === true,
    priority: item.priority === 'CRITICAL' || item.priority === 'HIGH' || item.priority === 'LOW' ? item.priority : 'MEDIUM',
  } satisfies PredictiveEvidenceRequest));
  const update = actual === null
    ? null
    : updateBinaryModel({ model, contributions, predicted, actual, quality });
  const residual = actual === null ? null : predicted - actual;
  const currentCalibration = String(run.calibration_status ?? calibrationStatus(model));
  const errorClass = classifyPredictionError({
    residual,
    missingEvidenceCount: missingEvidence.length,
    sourceQuality: input.sourceQuality,
    interventionFidelity: input.interventionFidelity,
    calibration: currentCalibration,
  });
  const learningState: PredictiveLearningResult['learningState'] =
    actual === null || input.sourceQuality === 'UNVERIFIABLE'
      ? 'REJECTED_UNVERIFIABLE'
      : quality < 0.6
        ? 'REJECTED_LOW_QUALITY'
        : currentCalibration === 'DRIFT_WARNING' && Math.abs(residual ?? 0) > 0.35
          ? 'REVIEW_REQUIRED'
          : 'APPLIED';
  const learningApplied = learningState === 'APPLIED' && Boolean(update?.applied);
  const modelBefore = update?.before ?? {
    weights: model.weights,
    intercept: model.intercept,
    sampleCount: model.sampleCount,
    verifiedSampleCount: model.verifiedSampleCount,
    metrics: model.metrics,
  };
  const parameterDelta = update?.delta ?? { reason: 'OUTCOME_NOT_LEARNABLE' };
  const modelAfter = learningApplied ? update!.after : modelBefore;
  const reflection = await reflectOnPredictionError({
    predicted,
    actual,
    residual,
    errorClass,
    sourceQuality: input.sourceQuality,
    interventionFidelity: input.interventionFidelity,
    missingEvidence,
    contributions,
    modelBefore,
    modelAfter,
    learningApplied,
  });
  const outcomePayload = {
    run_id: input.runId,
    return_window: input.returnWindow,
    actual_value: actual,
    outcome_payload: input.outcomePayload ?? {},
    source_type: input.sourceType,
    source_ref: input.sourceRef ?? null,
    source_quality: input.sourceQuality,
    intervention_fidelity: input.interventionFidelity ?? null,
    observed_at: input.observedAt ?? new Date().toISOString(),
    evaluation_state: actual === null ? 'UNVERIFIABLE' : input.sourceQuality === 'VERIFIED' ? 'EVALUATED' : 'PARTIAL',
    error_payload: {
      predicted,
      actual,
      residual,
      absoluteError: residual === null ? null : Math.abs(residual),
      squaredError: residual === null ? null : residual * residual,
      errorClass,
    },
    created_by: input.createdBy ?? null,
  };
  const outcomeInsert = await service.from(OUTCOME_TABLE)
    .upsert(outcomePayload, { onConflict: 'run_id,return_window' })
    .select('id')
    .single();
  if (outcomeInsert.error || !outcomeInsert.data) throw new Error(`PREDICTIVE_OUTCOME_INSERT_FAILED: ${outcomeInsert.error?.message ?? 'unknown'}`);
  const outcomeId = String(outcomeInsert.data.id);

  if (learningApplied) {
    const modelUpdate = await service.from(MODEL_TABLE).update({
      weights: modelAfter.weights,
      intercept: modelAfter.intercept,
      sample_count: modelAfter.sampleCount,
      verified_sample_count: modelAfter.verifiedSampleCount,
      metrics: modelAfter.metrics,
    }).eq('id', model.id);
    if (modelUpdate.error) throw new Error(`PREDICTIVE_MODEL_UPDATE_FAILED: ${modelUpdate.error.message}`);
  }

  const learningInsert = await service.from(LEARNING_TABLE).insert({
    run_id: input.runId,
    outcome_id: outcomeId,
    model_id: model.id,
    learning_state: learningState,
    error_class: errorClass,
    error_analysis: {
      residual,
      absoluteError: residual === null ? null : Math.abs(residual),
      squaredError: residual === null ? null : residual * residual,
      missingEvidence,
      sourceQuality: input.sourceQuality,
      interventionFidelity: input.interventionFidelity ?? null,
    },
    parameter_state_before: modelBefore,
    parameter_delta: parameterDelta,
    parameter_state_after: modelAfter,
    quality_weight: quality,
    amv_reflection: reflection,
    created_by: input.createdBy ?? null,
  }).select('id').single();
  if (learningInsert.error || !learningInsert.data) throw new Error(`PREDICTIVE_LEARNING_EVENT_INSERT_FAILED: ${learningInsert.error?.message ?? 'unknown'}`);
  const learningEventId = String(learningInsert.data.id);

  const runUpdate = await service.from(RUN_TABLE).update({
    status: actual === null ? 'UNVERIFIABLE' : 'EVALUATED',
    calibration_status: learningApplied ? calibrationStatus({
      status: model.status,
      verifiedSampleCount: Number(modelAfter.verifiedSampleCount ?? model.verifiedSampleCount),
      metrics: record(modelAfter.metrics),
    }) : currentCalibration,
  }).eq('id', input.runId);
  if (runUpdate.error) throw new Error(`PREDICTIVE_RUN_UPDATE_FAILED: ${runUpdate.error.message}`);

  await logLearning({
    caseId: String(run.subject_id ?? input.runId),
    eventType: 'prediction_outcome_evaluated',
    summary: `Predicción evaluada: ${errorClass}; aprendizaje ${learningState}; quality=${quality.toFixed(3)}.`,
    payload: { runId: input.runId, outcomeId, learningEventId, residual, learningState, parameterDelta, reflection },
  });

  return {
    runId: input.runId,
    outcomeId,
    learningEventId,
    learningState,
    error: {
      residual,
      absoluteError: residual === null ? null : Math.abs(residual),
      squaredError: residual === null ? null : residual * residual,
      class: errorClass,
    },
    modelBefore,
    parameterDelta,
    modelAfter,
    amvReflection: reflection,
    qualityWeight: quality,
    blockers: learningState === 'APPLIED' ? [] : [
      learningState === 'REJECTED_UNVERIFIABLE' ? 'OUTCOME_UNVERIFIABLE' : '',
      learningState === 'REJECTED_LOW_QUALITY' ? 'EVIDENCE_QUALITY_BELOW_0_60' : '',
      learningState === 'REVIEW_REQUIRED' ? 'DRIFT_REQUIRES_HUMAN_REVIEW' : '',
    ].filter(Boolean),
  };
}

export async function reconcilePredictiveRuns() {
  const service = createServiceSupabaseClient();
  const now = new Date().toISOString();
  const due = await service.from(RUN_TABLE)
    .select('id, subject_id, status, due_at')
    .in('status', ['OPEN', 'WAITING_EVIDENCE'])
    .lte('due_at', now)
    .limit(500);
  if (due.error) throw new Error(`PREDICTIVE_RECONCILE_READ_FAILED: ${due.error.message}`);
  const ids = (due.data ?? []).map((item) => String(item.id));
  if (ids.length) {
    const updated = await service.from(RUN_TABLE).update({ status: 'DUE' }).in('id', ids);
    if (updated.error) throw new Error(`PREDICTIVE_RECONCILE_UPDATE_FAILED: ${updated.error.message}`);
    await service.from(EVIDENCE_REQUEST_TABLE)
      .update({ priority: 'HIGH' })
      .in('run_id', ids)
      .eq('status', 'OPEN');
  }
  await logLearning({ eventType: 'prediction_reconcile', summary: `${ids.length} predicción(es) marcadas DUE; no se inventaron outcomes.`, payload: { ids, reconciledAt: now } });
  return { ok: true, dueCount: ids.length, runIds: ids, reconciledAt: now };
}

async function countRows(table: string, apply?: (query: any) => any) {
  let query: any = createServiceSupabaseClient().from(table).select('id', { count: 'exact', head: true });
  if (apply) query = apply(query);
  const result = await query;
  return result.error ? null : result.count ?? 0;
}

export async function getPredictiveEngineHealth(): Promise<PredictiveEngineHealth> {
  const service = createServiceSupabaseClient();
  const [modelsResult, runs, openRuns, dueRuns, evaluatedRuns, verifiedOutcomes, appliedLearning] = await Promise.all([
    service.from(MODEL_TABLE).select('scope, model_key, version, status, sample_count, verified_sample_count, metrics').order('scope'),
    countRows(RUN_TABLE),
    countRows(RUN_TABLE, (query) => query.in('status', ['OPEN', 'WAITING_EVIDENCE'])),
    countRows(RUN_TABLE, (query) => query.eq('status', 'DUE')),
    countRows(RUN_TABLE, (query) => query.eq('status', 'EVALUATED')),
    countRows(OUTCOME_TABLE, (query) => query.eq('source_quality', 'VERIFIED')),
    countRows(LEARNING_TABLE, (query) => query.eq('learning_state', 'APPLIED')),
  ]);
  const models = modelsResult.data ?? [];
  const warnings: string[] = [];
  if (modelsResult.error) warnings.push(`MODEL_READ_FAILED:${modelsResult.error.message}`);
  if ((verifiedOutcomes ?? 0) < 10) warnings.push('INSUFFICIENT_VERIFIED_OUTCOMES_FOR_CALIBRATION');
  if ((dueRuns ?? 0) > 0) warnings.push('PREDICTIONS_DUE_FOR_OUTCOME');
  return {
    ok: !modelsResult.error,
    models: models.length,
    activeModels: models.filter((item) => item.status === 'ACTIVE').length,
    runs: runs ?? 0,
    openRuns: openRuns ?? 0,
    dueRuns: dueRuns ?? 0,
    evaluatedRuns: evaluatedRuns ?? 0,
    verifiedOutcomes: verifiedOutcomes ?? 0,
    appliedLearningEvents: appliedLearning ?? 0,
    calibration: models.map((item) => ({
      scope: String(item.scope),
      modelKey: String(item.model_key),
      version: Number(item.version),
      sampleCount: Number(item.sample_count),
      verifiedSampleCount: Number(item.verified_sample_count),
      status: calibrationStatus(modelFromRow(item)),
      metrics: record(item.metrics),
    })),
    warnings,
  };
}
