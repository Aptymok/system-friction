import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  classifyPredictionError,
  qualityWeight,
  updateBinaryModel,
  type PredictiveModelState,
} from './calibration';
import type { PredictiveFeatureContribution, PredictiveOutcomeInput } from './types';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function numeric(value: unknown): number | null {
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

function contributionsFromRun(run: Row): PredictiveFeatureContribution[] {
  return rows(run.feature_contributions).map((item) => ({
    key: String(item.key ?? ''),
    rawValue: numeric(item.rawValue ?? item.raw_value) ?? 0,
    normalizedValue: numeric(item.normalizedValue ?? item.normalized_value) ?? 0,
    weight: numeric(item.weight) ?? 0,
    contribution: numeric(item.contribution) ?? 0,
    confidence: numeric(item.confidence) ?? 0,
    source: typeof item.source === 'string' ? item.source : null,
    evidenceIds: Array.isArray(item.evidenceIds)
      ? item.evidenceIds.map(String)
      : Array.isArray(item.evidence_ids)
        ? item.evidence_ids.map(String)
        : [],
  })).filter((item) => item.key);
}

export async function registerGovernedPredictiveOutcome(input: PredictiveOutcomeInput) {
  const service = createServiceSupabaseClient();
  const runResult = await service.from('sfi_predictive_runs').select('*').eq('id', input.runId).maybeSingle();
  if (runResult.error || !runResult.data) throw new Error(`PREDICTIVE_RUN_NOT_FOUND:${runResult.error?.message ?? input.runId}`);
  const run = record(runResult.data);
  const predicted = numeric(run.prediction);
  if (predicted === null) throw new Error('PREDICTIVE_RUN_HAS_NO_SCORE');

  const modelResult = await service.from('sfi_predictive_models').select('*').eq('id', String(run.model_id)).maybeSingle();
  if (modelResult.error || !modelResult.data) throw new Error(`PREDICTIVE_MODEL_NOT_FOUND:${modelResult.error?.message ?? run.model_id}`);
  const model = modelFromRow(modelResult.data);
  const actual = input.actualValue === null || typeof input.actualValue === 'undefined' ? null : clamp01(input.actualValue);
  const quality = qualityWeight(input.sourceQuality, input.interventionFidelity);
  const contributions = contributionsFromRun(run);
  const missingEvidenceCount = rows(run.missing_evidence).length;
  const residual = actual === null ? null : predicted - actual;
  const errorClass = classifyPredictionError({
    residual,
    missingEvidenceCount,
    sourceQuality: input.sourceQuality,
    interventionFidelity: input.interventionFidelity,
    calibration: String(run.calibration_status ?? 'BOOTSTRAP_UNCALIBRATED'),
  });
  const candidate = actual === null
    ? {
        applied: false,
        before: {
          weights: model.weights,
          intercept: model.intercept,
          sampleCount: model.sampleCount,
          verifiedSampleCount: model.verifiedSampleCount,
          metrics: model.metrics,
        },
        delta: { reason: 'OUTCOME_NOT_LEARNABLE' },
        after: {
          weights: model.weights,
          intercept: model.intercept,
          sampleCount: model.sampleCount,
          verifiedSampleCount: model.verifiedSampleCount,
          metrics: model.metrics,
        },
      }
    : updateBinaryModel({ model, contributions, predicted, actual, quality });

  const caseResult = await service.from('sfi_reference_cases').select('*').eq('prediction_run_id', input.runId).limit(1).maybeSingle();
  if (caseResult.error) throw new Error(`REFERENCE_CASE_READ_FAILED:${caseResult.error.message}`);
  const referenceCase = caseResult.data ? record(caseResult.data) : null;
  const corpusResult = await service
    .from('sfi_reference_cases')
    .select('id,object_class,status,outcome_id')
    .eq('model_key', model.modelKey)
    .eq('status', 'CLOSED');
  if (corpusResult.error) throw new Error(`CALIBRATION_CORPUS_READ_FAILED:${corpusResult.error.message}`);
  const closedCorpus = rows(corpusResult.data).filter((item) => item.outcome_id);
  const currentAlreadyClosed = referenceCase?.status === 'CLOSED';
  const eligibleOutcome = actual !== null && input.sourceQuality !== 'UNVERIFIABLE' && quality >= 0.6 && Boolean(referenceCase);
  const totalAfter = closedCorpus.length + (eligibleOutcome && !currentAlreadyClosed ? 1 : 0);
  const nonMusicBefore = closedCorpus.filter((item) => item.object_class !== 'music').length;
  const currentNonMusic = referenceCase && referenceCase.object_class !== 'music';
  const nonMusicAfter = nonMusicBefore + (eligibleOutcome && !currentAlreadyClosed && currentNonMusic ? 1 : 0);

  const learningState = actual === null || input.sourceQuality === 'UNVERIFIABLE'
    ? 'REJECTED_UNVERIFIABLE'
    : quality < 0.6
      ? 'REJECTED_LOW_QUALITY'
      : totalAfter >= 30 && nonMusicAfter >= 1
        ? 'CALIBRATION_CANDIDATE'
        : 'ACCUMULATING_CALIBRATION_CORPUS';

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
  const outcomeInsert = await service.from('sfi_predictive_outcomes')
    .upsert(outcomePayload, { onConflict: 'run_id,return_window' })
    .select('id')
    .single();
  if (outcomeInsert.error || !outcomeInsert.data) throw new Error(`PREDICTIVE_OUTCOME_INSERT_FAILED:${outcomeInsert.error?.message ?? 'unknown'}`);
  const outcomeId = String(outcomeInsert.data.id);

  const learningInsert = await service.from('sfi_predictive_learning_events').insert({
    run_id: input.runId,
    outcome_id: outcomeId,
    model_id: model.id,
    learning_state: learningState,
    error_class: errorClass,
    error_analysis: {
      predicted,
      actual,
      residual,
      absoluteError: residual === null ? null : Math.abs(residual),
      squaredError: residual === null ? null : residual * residual,
      missingEvidenceCount,
      sourceQuality: input.sourceQuality,
      interventionFidelity: input.interventionFidelity ?? null,
      corpus: { totalClosed: totalAfter, nonMusicalClosed: nonMusicAfter, required: 30 },
    },
    parameter_state_before: candidate.before,
    parameter_delta: candidate.delta,
    parameter_state_after: candidate.after,
    quality_weight: quality,
    amv_reflection: {
      headline: learningState === 'CALIBRATION_CANDIDATE' ? 'Calibration candidate ready for ROOT review' : 'Outcome recorded; active model unchanged',
      reading: `The outcome was recorded with quality ${quality.toFixed(3)}. Model parameters were not mutated automatically.`,
      drivers: contributions.slice(0, 5).map((item) => `${item.key}:${item.contribution.toFixed(4)}`),
      contradictions: residual === null ? ['OUTCOME_UNVERIFIABLE'] : Math.abs(residual) >= 0.12 ? [errorClass] : [],
      evidenceNeeded: referenceCase ? [] : ['REFERENCE_CASE_REQUIRED'],
      nextAction: learningState === 'CALIBRATION_CANDIDATE' ? 'Review and promote a versioned model from ROOT.' : `Accumulate comparable closed cases (${totalAfter}/30).`,
      nonClaims: ['NO_AUTOMATIC_ACTIVE_MODEL_MUTATION', 'NO_HISTORICAL_CALIBRATION_BEFORE_N_30'],
      provider: 'deterministic-governed-outcome',
      model: 'sfi-governed-learning-v1',
      generatedByAi: false,
      warnings: referenceCase ? [] : ['REFERENCE_CASE_NOT_LINKED'],
    },
    created_by: input.createdBy ?? null,
  }).select('id').single();
  if (learningInsert.error || !learningInsert.data) throw new Error(`PREDICTIVE_LEARNING_EVENT_INSERT_FAILED:${learningInsert.error?.message ?? 'unknown'}`);

  const runUpdate = await service.from('sfi_predictive_runs').update({
    status: actual === null ? 'UNVERIFIABLE' : 'EVALUATED',
    updated_at: new Date().toISOString(),
  }).eq('id', input.runId);
  if (runUpdate.error) throw new Error(`PREDICTIVE_RUN_UPDATE_FAILED:${runUpdate.error.message}`);

  if (referenceCase) {
    const phases = record(referenceCase.phase_status);
    const caseUpdate = await service.from('sfi_reference_cases').update({
      outcome_id: outcomeId,
      closed_at: input.observedAt ?? new Date().toISOString(),
      status: actual === null ? 'UNVERIFIABLE' : 'CLOSED',
      phase_status: {
        ...phases,
        phase5: actual === null ? 'UNVERIFIABLE' : 'OUTCOME_RECORDED',
        phase6: learningState === 'CALIBRATION_CANDIDATE' ? 'CALIBRATION_CANDIDATE' : `CORPUS_${totalAfter}_OF_30`,
      },
      updated_at: new Date().toISOString(),
    }).eq('id', String(referenceCase.id));
    if (caseUpdate.error) throw new Error(`REFERENCE_CASE_CLOSE_FAILED:${caseUpdate.error.message}`);
  }

  return {
    runId: input.runId,
    outcomeId,
    learningEventId: String(learningInsert.data.id),
    learningState,
    activeModelMutated: false,
    calibrationEligibility: {
      totalClosed: totalAfter,
      nonMusicalClosed: nonMusicAfter,
      requiredClosed: 30,
      eligible: learningState === 'CALIBRATION_CANDIDATE',
    },
    error: {
      residual,
      absoluteError: residual === null ? null : Math.abs(residual),
      squaredError: residual === null ? null : residual * residual,
      class: errorClass,
    },
    parameterCandidate: {
      before: candidate.before,
      delta: candidate.delta,
      after: candidate.after,
    },
    qualityWeight: quality,
    blockers: [
      ...(referenceCase ? [] : ['REFERENCE_CASE_REQUIRED']),
      ...(totalAfter < 30 ? [`CLOSED_CASES_${totalAfter}_OF_30`] : []),
      ...(nonMusicAfter < 1 ? ['NON_MUSICAL_CASE_REQUIRED'] : []),
    ],
  };
}
