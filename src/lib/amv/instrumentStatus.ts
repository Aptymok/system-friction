import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

type PhaseState = 'READY' | 'PARTIAL' | 'GATED' | 'MISSING' | 'DEGRADED' | 'ACCUMULATING' | 'READY_TO_REVIEW';

export type AmvInstrumentPhase = {
  id: number;
  label: string;
  state: PhaseState;
  observed: number | null;
  required: number | null;
  explanation: string;
  warning: string | null;
};

export type AmvInstrumentStatus = {
  generatedAt: string;
  maturity: 'AMV-0' | 'AMV-1' | 'AMV-2' | 'AMV-3';
  epistemicLabel: 'PROVISIONAL_NO_HISTORICAL_CALIBRATION' | 'CALIBRATION_CANDIDATE' | 'CALIBRATED';
  publicPredictiveOutputAllowed: boolean;
  phases: AmvInstrumentPhase[];
  counts: {
    cases: number | null;
    closedCases: number | null;
    nonMusicalClosedCases: number | null;
    externalEvidence: number | null;
    predictiveRuns: number | null;
    outcomes: number | null;
    interventions: number | null;
    calibrationCandidates: number | null;
    calibratedModels: number | null;
    audits: number | null;
  };
  warnings: string[];
};

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

async function readTable(table: string, select: string, limit = 1000) {
  const service = createServiceSupabaseClient();
  const result = await service.from(table).select(select).limit(limit);
  return {
    rows: rows(result.data),
    error: result.error ? `${table}:${result.error.message}` : null,
  };
}

function phaseState(value: unknown) {
  return typeof value === 'string' ? value : null;
}

export async function readAmvInstrumentStatus(): Promise<AmvInstrumentStatus> {
  const [casesResult, externalResult, runsResult, outcomesResult, learningResult, interventionsResult, modelsResult, auditsResult] = await Promise.all([
    readTable('sfi_reference_cases', 'id,object_class,status,phase_status,consent_required,consent_evidence_id,model_key,outcome_id'),
    readTable('sfi_external_evidence_observations', 'id,object_id,metric_key,normalized_value,reliability,epistemic_class'),
    readTable('sfi_predictive_runs', 'id,status,calibration_status,subject_type,subject_id'),
    readTable('sfi_predictive_outcomes', 'id,run_id,actual_value,evaluation_state,source_quality'),
    readTable('sfi_predictive_learning_events', 'id,model_id,learning_state'),
    readTable('studio_interventions', 'id,state,payload'),
    readTable('sfi_predictive_models', 'id,model_key,version,status,verified_sample_count,metrics'),
    readTable('root_audit_events', 'id,action,target,created_at'),
  ]);

  const warnings = [
    casesResult.error,
    externalResult.error,
    runsResult.error,
    outcomesResult.error,
    learningResult.error,
    interventionsResult.error,
    modelsResult.error,
    auditsResult.error,
  ].filter((item): item is string => Boolean(item));

  const cases = casesResult.rows;
  const closedCases = cases.filter((item) => item.status === 'CLOSED');
  const nonMusicalClosedCases = closedCases.filter((item) => item.object_class !== 'music');
  const phase1Complete = cases.filter((item) => phaseState(record(item.phase_status).phase1) === 'COMPLETE').length;
  const phase2Complete = cases.filter((item) => phaseState(record(item.phase_status).phase2) === 'COMPLETE').length;
  const predictiveRuns = runsResult.rows;
  const outcomes = outcomesResult.rows;
  const interventions = interventionsResult.rows;
  const candidates = learningResult.rows.filter((item) => item.learning_state === 'CALIBRATION_CANDIDATE');
  const calibratedModels = modelsResult.rows.filter((item) => item.status === 'ACTIVE' && Number(item.verified_sample_count ?? 0) >= 30);
  const gatedConsent = cases.filter((item) => item.consent_required === true && !item.consent_evidence_id).length;

  const infrastructureReady = !casesResult.error && !externalResult.error && !runsResult.error && !outcomesResult.error;
  const calibrationEligible = closedCases.length >= 30 && nonMusicalClosedCases.length >= 1;
  const publicPredictiveOutputAllowed = calibratedModels.length > 0 && calibrationEligible;
  const maturity: AmvInstrumentStatus['maturity'] = publicPredictiveOutputAllowed
    ? 'AMV-2'
    : predictiveRuns.length > 0 || cases.length > 0
      ? 'AMV-1'
      : 'AMV-0';
  const epistemicLabel: AmvInstrumentStatus['epistemicLabel'] = publicPredictiveOutputAllowed
    ? 'CALIBRATED'
    : candidates.length > 0
      ? 'CALIBRATION_CANDIDATE'
      : 'PROVISIONAL_NO_HISTORICAL_CALIBRATION';

  const phases: AmvInstrumentPhase[] = [
    {
      id: 0,
      label: 'INFRASTRUCTURE',
      state: infrastructureReady ? 'READY' : warnings.length ? 'DEGRADED' : 'MISSING',
      observed: infrastructureReady ? 1 : 0,
      required: 1,
      explanation: 'Persistent cases, external evidence, predictive runs and outcomes are queryable.',
      warning: infrastructureReady ? null : warnings.join(' | ') || 'instrument_tables_missing',
    },
    {
      id: 1,
      label: 'INTERNAL SIGNAL',
      state: phase1Complete > 0 ? 'READY' : cases.length ? 'GATED' : 'MISSING',
      observed: phase1Complete,
      required: Math.max(1, cases.length),
      explanation: 'Cases with complete Phase 1 MIHM/core coverage.',
      warning: phase1Complete > 0 ? null : 'NO_PHASE_1_COMPLETE_CASES',
    },
    {
      id: 2,
      label: 'EXTERNAL EVIDENCE',
      state: phase2Complete > 0 ? 'READY' : externalResult.rows.length ? 'PARTIAL' : 'GATED',
      observed: externalResult.rows.length,
      required: null,
      explanation: 'Audited external observations and cases with complete Phase 2 coverage.',
      warning: phase2Complete > 0 ? null : 'NO_PHASE_2_COMPLETE_CASES',
    },
    {
      id: 3,
      label: 'PROVISIONAL PREDICTION',
      state: predictiveRuns.length > 0 ? 'PARTIAL' : 'GATED',
      observed: predictiveRuns.length,
      required: null,
      explanation: 'Persisted predictive runs. Until Phase 6, outputs remain provisional.',
      warning: predictiveRuns.length ? 'PROVISIONAL_NO_HISTORICAL_CALIBRATION' : 'NO_PREDICTIVE_RUNS',
    },
    {
      id: 4,
      label: 'MINIMAL INTERVENTION',
      state: interventions.length > 0 ? 'PARTIAL' : 'GATED',
      observed: interventions.length,
      required: null,
      explanation: 'Persisted intervention candidates; execution remains operator-confirmed.',
      warning: interventions.length ? null : 'NO_INTERVENTIONS_REGISTERED',
    },
    {
      id: 5,
      label: 'OUTCOME / ERROR',
      state: outcomes.length > 0 ? 'READY' : predictiveRuns.length ? 'ACCUMULATING' : 'GATED',
      observed: outcomes.length,
      required: predictiveRuns.length || null,
      explanation: 'Observed outcomes and prediction errors linked to cases.',
      warning: outcomes.length ? null : 'NO_CLOSED_OUTCOMES',
    },
    {
      id: 6,
      label: 'HISTORICAL CALIBRATION',
      state: publicPredictiveOutputAllowed ? 'READY' : candidates.length ? 'READY_TO_REVIEW' : closedCases.length ? 'ACCUMULATING' : 'GATED',
      observed: closedCases.length,
      required: 30,
      explanation: `Closed comparable corpus. Non-musical closed cases: ${nonMusicalClosedCases.length}.`,
      warning: publicPredictiveOutputAllowed ? null : `CORPUS_${closedCases.length}_OF_30`,
    },
    {
      id: 7,
      label: 'OPERATIVE UI',
      state: casesResult.error ? 'DEGRADED' : 'READY',
      observed: cases.length,
      required: null,
      explanation: 'ROOT surfaces case status and public surfaces receive only aggregate maturity.',
      warning: null,
    },
    {
      id: 8,
      label: 'GOVERNANCE / COST',
      state: auditsResult.rows.length > 0 ? 'PARTIAL' : 'GATED',
      observed: auditsResult.rows.length,
      required: null,
      explanation: 'Authentication, audit and explicit mutations exist; budget/rate governance remains independently observable.',
      warning: gatedConsent ? `CONSENT_BLOCKED_CASES:${gatedConsent}` : 'COST_LIMITS_REQUIRE_RUNTIME_POLICY',
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    maturity,
    epistemicLabel,
    publicPredictiveOutputAllowed,
    phases,
    counts: {
      cases: casesResult.error ? null : cases.length,
      closedCases: casesResult.error ? null : closedCases.length,
      nonMusicalClosedCases: casesResult.error ? null : nonMusicalClosedCases.length,
      externalEvidence: externalResult.error ? null : externalResult.rows.length,
      predictiveRuns: runsResult.error ? null : predictiveRuns.length,
      outcomes: outcomesResult.error ? null : outcomes.length,
      interventions: interventionsResult.error ? null : interventions.length,
      calibrationCandidates: learningResult.error ? null : candidates.length,
      calibratedModels: modelsResult.error ? null : calibratedModels.length,
      audits: auditsResult.error ? null : auditsResult.rows.length,
    },
    warnings,
  };
}

export async function readPublicAmvInstrumentStatus() {
  const status = await readAmvInstrumentStatus();
  return {
    generatedAt: status.generatedAt,
    maturity: status.maturity,
    epistemicLabel: status.epistemicLabel,
    publicPredictiveOutputAllowed: status.publicPredictiveOutputAllowed,
    calibration: {
      closedCases: status.counts.closedCases,
      requiredClosedCases: 30,
      nonMusicalClosedCases: status.counts.nonMusicalClosedCases,
    },
    phases: status.phases.map((phase) => ({
      id: phase.id,
      label: phase.label,
      state: phase.state,
      observed: phase.id === 6 ? phase.observed : null,
      required: phase.id === 6 ? phase.required : null,
      explanation: phase.explanation,
      warning: phase.id === 6 || phase.id === 3 ? phase.warning : null,
    })),
  };
}
