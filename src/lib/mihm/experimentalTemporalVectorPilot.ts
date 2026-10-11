/**
 * MIHM-T EXP-001: exploratory *synthetic* vector/clock ablation pilot.
 * Reuses SfiDimensionalTransferV0. No canonical MIHM Phi, source ingestion,
 * institutional action, observed evidence, Reality Chain or RETURN writer.
 *
 * Not the preregistered MIHM-T comparator M0: the no-interaction arm is
 * an ablation only, not a competent conventional incident-response model.
 */
import {
  MIHM_DIMENSIONAL_TRANSFER_MODEL_V0,
  type SfiDimensionalTransferV0,
} from '../../core/contracts/system';

export const MIHM_TEMPORAL_VECTOR_PILOT = 'SFI-MIHM-T-VECTOR-PILOT-0.1' as const;

export type SyntheticReading = {
  id: string;
  dimensionId: string;
  value: number; // normalized scenario input, not measured Phi
  occurredAt: string;
  knownAt: string;
  epistemicClass: 'SIMULATED';
};

export type SyntheticLatentDependency = {
  id: string;
  sourceDimensionId: string;
  targetDimensionId: string;
  knownAt: string;
  strength: number;
  epistemicClass: 'SIMULATED';
  mechanism: string;
};

export type SyntheticIntervention = {
  id: string;
  proposedAt: string;
  intensity: number;
  status: 'PROPOSED_IN_SIMULATION';
};

export type MihmTemporalVectorPilotInput = {
  contract: typeof MIHM_TEMPORAL_VECTOR_PILOT;
  caseId: string;
  dataClass: 'SYNTHETIC_ONLY';
  cutoffAt: string;
  horizonHours: number;
  transfer: SfiDimensionalTransferV0;
  readings: SyntheticReading[];
  latent: SyntheticLatentDependency;
  intervention: SyntheticIntervention;
  predeclaredEquivalenceDelta: number; // lab demonstration ONLY
};

export type SyntheticPilotPrediction = {
  status: 'READY' | 'BLOCKED';
  reasons: string[];
  epistemicClass: 'SIMULATED';
  prospective: false;
  sourceReadingId: string | null;
  targetReadingId: string | null;
  predictedAggravationRisk: {
    noInteractionAblation: number | null;
    fullVectorClockCandidate: number | null;
    noLatentHistoryAblation: number | null;
    noClockAblation: number | null;
  };
  effects: {
    lagHours: number | null;
    horizonHours: number;
    withinHorizon: boolean | null;
    interactionContribution: number | null;
    candidateMinimumRequired: ('source' | 'target' | 'latent_dependency' | 'clock')[] | null;
    isGloballyMinimum: false;
  };
  warnings: string[];
  evidenceRefs: [];
  realExecution: false;
  observedReturn: null;
  realityChainEligible: false;
  canonicalPhi: false;
  canPromoteCanon: false;
};

const finite01 = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;
const isIso = (v: string) =>
  typeof v === 'string' && /(?:Z|[+-]\d\d:\d\d)$/.test(v) && Number.isFinite(Date.parse(v));
const round = (n: number) => Number(n.toFixed(6));
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function blocked(reasons: string[], input: MihmTemporalVectorPilotInput): SyntheticPilotPrediction {
  return {
    status: 'BLOCKED', reasons, epistemicClass: 'SIMULATED', prospective: false,
    sourceReadingId: null, targetReadingId: null,
    predictedAggravationRisk: {
      noInteractionAblation: null, fullVectorClockCandidate: null,
      noLatentHistoryAblation: null, noClockAblation: null,
    },
    effects: {
      lagHours: null, horizonHours: input?.horizonHours ?? 0,
      withinHorizon: null, interactionContribution: null,
      candidateMinimumRequired: null, isGloballyMinimum: false,
    },
    warnings: ['SYNTHETIC_NOT_EVIDENCE', 'DO_NOT_PROJECT_TO_REALITY_CHAIN'],
    evidenceRefs: [], realExecution: false, observedReturn: null,
    realityChainEligible: false, canonicalPhi: false, canPromoteCanon: false,
  };
}

/**
 * Pure diagnostic. No outcome, actual intervention, observed RETURN or future
 * document can enter this function. Cutoff comparisons use BOTH event and
 * knowledge timestamps; missing source history causes abstention.
 */
export function evaluateSyntheticTemporalVector(input: MihmTemporalVectorPilotInput): SyntheticPilotPrediction {
  const fail: string[] = [];
  if (input?.contract !== MIHM_TEMPORAL_VECTOR_PILOT || input.dataClass !== 'SYNTHETIC_ONLY' ||
    !input.caseId?.startsWith('LAB-SYN-')) fail.push('NOT_AN_AUTHORIZED_SYNTHETIC_FIXTURE');
  if (!isIso(input.cutoffAt)) fail.push('INVALID_CUTOFF');
  if (!Number.isFinite(input.horizonHours) || input.horizonHours <= 0) fail.push('INVALID_HORIZON');
  if (!finite01(input.predeclaredEquivalenceDelta)) fail.push('INVALID_DEMONSTRATION_MARGIN');
  const t = input.transfer;
  if (!t || t.contract !== MIHM_DIMENSIONAL_TRANSFER_MODEL_V0 || t.status !== 'EXPERIMENTAL' ||
      t.conservationAssumed !== false || t.epistemicClass !== 'SIMULATION' ||
      !Array.isArray(t.evidenceRefs) || t.evidenceRefs.length !== 0 ||
      !Array.isArray(t.constraintRefs) || !Array.isArray(t.contextRefs)) {
    fail.push('TRANSFER_MUST_BE_UNVALIDATED_SYNTHETIC_AND_EVIDENCE_FREE');
  }
  const source = t?.sourceDimensionRef?.id;
  const target = t?.targetDimensionRef?.id;
  if (!source || !target || source === target) fail.push('DIMENSION_PAIR_INVALID');
  if (!t || t.lagUnit !== 'hours' || t.lag === null || !Number.isFinite(t.lag) || t.lag < 0 ||
      t.gain === null || !finite01(t.gain) || t.magnitude === null || !finite01(t.magnitude) ||
      t.attenuation === null || !finite01(t.attenuation) ||
      t.uncertainty !== null && !finite01(t.uncertainty)) {
    fail.push('UNSUPPORTED_OR_UNMEASURED_TRANSFER_PARAMETERS');
  }
  if (!input.latent || input.latent.epistemicClass !== 'SIMULATED' || !finite01(input.latent.strength) ||
      input.latent.sourceDimensionId !== source || input.latent.targetDimensionId !== target ||
      !input.latent.mechanism?.trim() || !isIso(input.latent.knownAt) ||
      Date.parse(input.latent.knownAt) > Date.parse(input.cutoffAt)) {
    fail.push('LATENT_DEPENDENCY_NOT_DECLARED_BEFORE_T0');
  }
  if (!input.intervention || input.intervention.status !== 'PROPOSED_IN_SIMULATION' ||
      !finite01(input.intervention.intensity) || !isIso(input.intervention.proposedAt) ||
      Date.parse(input.intervention.proposedAt) > Date.parse(input.cutoffAt)) {
    fail.push('INTERVENTION_NOT_PROPOSED_BEFORE_T0');
  }
  if (!Array.isArray(input.readings) || input.readings.length < 2 ||
      input.readings.some(v=>!v || v.epistemicClass !== 'SIMULATED' || !finite01(v.value) ||
        !isIso(v.occurredAt) || !isIso(v.knownAt) || !v.id?.startsWith('LAB-SYN-'))) {
    fail.push('READINGS_NOT_SYNTHETIC_OR_TEMPORALLY_VALID');
  }
  if (fail.length) return blocked(fail, input);
  const allowed = input.readings.filter(r =>
    Date.parse(r.occurredAt) <= Date.parse(input.cutoffAt) &&
    Date.parse(r.knownAt) <= Date.parse(input.cutoffAt));
  const latest = (id: string) => allowed.filter(r=>r.dimensionId === id)
    .sort((a,b)=>Date.parse(b.occurredAt)-Date.parse(a.occurredAt) ||
      Date.parse(b.knownAt)-Date.parse(a.knownAt))[0] ?? null;
  const s = latest(source), d = latest(target);
  if (!s || !d) return blocked(['REQUIRED_PRE_T0_READING_MISSING'],input);
  const baseline = d.value;
  const effect = round(s.value * t.gain! * t.magnitude! * (1-t.attenuation!) *
      input.latent.strength * input.intervention.intensity);
  const active = t.lag! <= input.horizonHours;
  const full = round(clamp01(baseline + (active ? effect : 0)));
  const noClock = round(clamp01(baseline + effect));
  const equivalence = input.predeclaredEquivalenceDelta;
  const needed: ('source'|'target'|'latent_dependency'|'clock')[] = ['target'];
  // Not an exact global subset search. This is a diagnostic for two specified ablations only.
  if (Math.abs(full - baseline) > equivalence) needed.push('source','latent_dependency');
  if (Math.abs(full - noClock) > equivalence) needed.push('clock');
  return {
    status:'READY',reasons:[],epistemicClass:'SIMULATED',prospective:false,
    sourceReadingId:s.id,targetReadingId:d.id,
    predictedAggravationRisk:{
      noInteractionAblation:round(baseline),
      fullVectorClockCandidate:full,
      noLatentHistoryAblation:round(baseline),
      noClockAblation:noClock,
    },
    effects:{
      lagHours:t.lag,horizonHours:input.horizonHours,withinHorizon:active,
      interactionContribution:active ? effect : 0,
      candidateMinimumRequired:needed,isGloballyMinimum:false,
    },
    warnings:['SYNTHETIC_NOT_EVIDENCE','ABLATION_BASELINE_NOT_COMPETENT_M0',
      'DEMO_DELTA_NOT_CALIBRATED','NOT_A_CAUSAL_OR_PROSPECTIVE_VALIDATION'],
    evidenceRefs:[],realExecution:false,observedReturn:null,
    realityChainEligible:false,canonicalPhi:false,canPromoteCanon:false,
  };
}

/** Score ONLY after sealing prediction; never pass outcome into predictor. */
export function scoreSyntheticOutcome(prediction: SyntheticPilotPrediction,
  outcome: {caseId:string; outcomeClass:'SIMULATED'; aggravation: boolean}) {
  if (prediction.status !== 'READY' || outcome.outcomeClass !== 'SIMULATED' ||
      typeof outcome.aggravation !== 'boolean') throw Error('SCORING_REQUIRES_READY_SYNTHETIC_PREDICTION_AND_OUTCOME');
  const score = (p:number|null) => p===null?null:round((p-Number(outcome.aggravation))**2);
  return {
    scoringClass:'SYNTHETIC_DEMONSTRATION_ONLY' as const,
    objective:'Brier loss, lower is better; no empirical validation',
    noInteractionAblation:score(prediction.predictedAggravationRisk.noInteractionAblation),
    fullVectorClockCandidate:score(prediction.predictedAggravationRisk.fullVectorClockCandidate),
    noLatentHistoryAblation:score(prediction.predictedAggravationRisk.noLatentHistoryAblation),
    noClockAblation:score(prediction.predictedAggravationRisk.noClockAblation),
    evidenceRefs:[] as [],
    resultIsScientificValidation:false as const,
    realityChainEligible:false as const,
  };
}
