import type { SfiAudioRenderReceipt } from './acoustic/acousticPackageContract';

export const SFI_GOVERNED_AUDIO_CLOSED_LOOP_CONTRACT = 'SFI-GOVERNED-AUDIO-CLOSED-LOOP-1.1' as const;
export const SFI_AUDIO_RESULT_RECEIPT_CONTRACT = 'SFI-AUDIO-RESULT-RECEIPT-1.1' as const;

export const SFI_AUDIO_CAPABILITIES = Object.freeze([
  'audio_observer',
  'audio_reference_resolver',
  'audio_cultural_vector',
  'audio_score_planner',
  'audio_performance_planner',
  'audio_instrument_resolver',
  'audio_renderer',
  'audio_stem_separator',
  'audio_mix_master',
  'audio_candidate_evaluator',
  'audio_intersection_forecaster',
] as const);

export type SfiAudioCapability = (typeof SFI_AUDIO_CAPABILITIES)[number];
export type SfiAudioMetricKey = 'fad' | 'wsv' | 'mihm' | 'cvf';
export type SfiAudioMetricOwner = 'FAD' | 'WORLDSPECT' | 'MIHM' | 'SCOREFRICTION';
export type SfiAudioMetricEpistemicClass = 'OBSERVED' | 'DERIVED';

export type SfiAudioMetricEvidence = {
  owner: SfiAudioMetricOwner;
  epistemicClass: SfiAudioMetricEpistemicClass;
  methodRef: string;
  sourceRef: string;
  evidenceRefs: string[];
};

export type SfiAudioObservation = {
  observationId: string;
  epistemicClass: 'OBSERVATION';
  observedAt: string;
  sourceRef: string;
  metrics: Partial<Record<SfiAudioMetricKey, number>>;
  metricEvidence?: Partial<Record<SfiAudioMetricKey, SfiAudioMetricEvidence>>;
  limitations: string[];
};

export type SfiAudioTargetMetric = {
  min?: number;
  max?: number;
};

export type SfiAudioCulturalTarget = {
  targetId: string;
  evidenceRefs: string[];
  metrics: Partial<Record<SfiAudioMetricKey, SfiAudioTargetMetric>>;
};

export type SfiAudioStemState = {
  stemId: string;
  role: string;
  performanceRef: string;
  instrumentRef: string;
  renderReceipt: SfiAudioRenderReceipt;
  metricOwnership: SfiAudioMetricKey[];
};

export type SfiAudioFailure = {
  metric: SfiAudioMetricKey;
  observed: number | null;
  target: SfiAudioTargetMetric;
  reason: 'MISSING_OBSERVATION' | 'UNBOUND_MEASUREMENT' | 'BELOW_TARGET' | 'ABOVE_TARGET';
  affectedStemIds: string[];
};

export type SfiAudioEvaluation = {
  targetId: string;
  observationId: string;
  state: 'PASS' | 'FAIL';
  failures: SfiAudioFailure[];
};

export type SfiLocalizedRerenderPlan = {
  state: 'NO_RERENDER_REQUIRED' | 'LOCALIZED_RERENDER_REQUIRED';
  rerenderStemIds: string[];
  preservedStemReceipts: Array<{ stemId: string; outputHash: string; runId: string }>;
};

export type SfiAudioResultReceipt = {
  contract: typeof SFI_AUDIO_RESULT_RECEIPT_CONTRACT;
  closedLoopContract: typeof SFI_GOVERNED_AUDIO_CLOSED_LOOP_CONTRACT;
  resultId: string;
  sourceRef: string;
  scoreRef: string;
  performanceRefs: string[];
  instrumentRefs: string[];
  targetRef: string;
  initialObservationRef: string;
  renderedObservationRef: string;
  finalObservationRef: string;
  initialRenderRunIds: string[];
  rerenderRunIds: string[];
  localizedRerender: SfiLocalizedRerenderPlan;
  evaluationBefore: SfiAudioEvaluation;
  evaluationAfter: SfiAudioEvaluation;
  generatedOutputRemainsNonObservation: true;
  metricProvenanceRequired: true;
  unaffectedStemPreservationVerified: boolean;
  state: 'RETURN_PASS' | 'RETURN_FAIL';
  limitations: string[];
};

const EXPECTED_OWNER: Record<SfiAudioMetricKey, SfiAudioMetricOwner> = {
  fad: 'FAD',
  wsv: 'WORLDSPECT',
  mihm: 'MIHM',
  cvf: 'SCOREFRICTION',
};

function requireObservation(observation: SfiAudioObservation) {
  if (observation.epistemicClass !== 'OBSERVATION') throw new Error('SFI_AUDIO_EXTERNAL_OBSERVATION_REQUIRED');
  if (!observation.observationId.trim() || !observation.sourceRef.trim() || !observation.observedAt.trim()) {
    throw new Error('SFI_AUDIO_OBSERVATION_IDENTITY_REQUIRED');
  }
}

function validMetricEvidence(metric: SfiAudioMetricKey, observation: SfiAudioObservation) {
  const evidence = observation.metricEvidence?.[metric];
  if (!evidence) return false;
  if (evidence.owner !== EXPECTED_OWNER[metric]) return false;
  if (evidence.epistemicClass !== 'OBSERVED' && evidence.epistemicClass !== 'DERIVED') return false;
  if (!evidence.methodRef.trim() || !evidence.sourceRef.trim()) return false;
  if (!evidence.evidenceRefs.length || evidence.evidenceRefs.some((ref) => !ref.trim())) return false;
  return true;
}

export function evaluateAudioCandidate(
  target: SfiAudioCulturalTarget,
  observation: SfiAudioObservation,
  stems: SfiAudioStemState[],
): SfiAudioEvaluation {
  requireObservation(observation);
  const failures: SfiAudioFailure[] = [];
  for (const metric of Object.keys(target.metrics) as SfiAudioMetricKey[]) {
    const rule = target.metrics[metric];
    if (!rule) continue;
    const observed = observation.metrics[metric];
    const affectedStemIds = stems.filter((stem) => stem.metricOwnership.includes(metric)).map((stem) => stem.stemId);
    if (observed === undefined || !Number.isFinite(observed)) {
      failures.push({ metric, observed: null, target: rule, reason: 'MISSING_OBSERVATION', affectedStemIds });
      continue;
    }
    if (!validMetricEvidence(metric, observation)) {
      failures.push({ metric, observed, target: rule, reason: 'UNBOUND_MEASUREMENT', affectedStemIds });
      continue;
    }
    if (rule.min !== undefined && observed < rule.min) {
      failures.push({ metric, observed, target: rule, reason: 'BELOW_TARGET', affectedStemIds });
      continue;
    }
    if (rule.max !== undefined && observed > rule.max) {
      failures.push({ metric, observed, target: rule, reason: 'ABOVE_TARGET', affectedStemIds });
    }
  }
  return {
    targetId: target.targetId,
    observationId: observation.observationId,
    state: failures.length ? 'FAIL' : 'PASS',
    failures,
  };
}

export function planLocalizedAudioRerender(stems: SfiAudioStemState[], evaluation: SfiAudioEvaluation): SfiLocalizedRerenderPlan {
  const rerenderStemIds = [...new Set(evaluation.failures.flatMap((failure) => failure.affectedStemIds))].sort();
  const rerenderSet = new Set(rerenderStemIds);
  return {
    state: rerenderStemIds.length ? 'LOCALIZED_RERENDER_REQUIRED' : 'NO_RERENDER_REQUIRED',
    rerenderStemIds,
    preservedStemReceipts: stems
      .filter((stem) => !rerenderSet.has(stem.stemId))
      .map((stem) => ({ stemId: stem.stemId, outputHash: stem.renderReceipt.output.sha256, runId: stem.renderReceipt.runId })),
  };
}

export function verifyUnaffectedStemPreservation(
  plan: SfiLocalizedRerenderPlan,
  finalStems: SfiAudioStemState[],
) {
  const byId = new Map(finalStems.map((stem) => [stem.stemId, stem]));
  return plan.preservedStemReceipts.every((preserved) => {
    const stem = byId.get(preserved.stemId);
    return Boolean(stem)
      && stem?.renderReceipt.output.sha256 === preserved.outputHash
      && stem?.renderReceipt.runId === preserved.runId;
  });
}

export function createAudioResultReceipt(input: {
  resultId: string;
  sourceRef: string;
  scoreRef: string;
  target: SfiAudioCulturalTarget;
  sourceObservation: SfiAudioObservation;
  renderedObservation: SfiAudioObservation;
  finalObservation: SfiAudioObservation;
  initialStems: SfiAudioStemState[];
  finalStems: SfiAudioStemState[];
  rerenderReceipts: SfiAudioRenderReceipt[];
  limitations?: string[];
}): SfiAudioResultReceipt {
  requireObservation(input.sourceObservation);
  requireObservation(input.renderedObservation);
  requireObservation(input.finalObservation);

  const evaluationBefore = evaluateAudioCandidate(input.target, input.renderedObservation, input.initialStems);
  const localizedRerender = planLocalizedAudioRerender(input.initialStems, evaluationBefore);
  const evaluationAfter = evaluateAudioCandidate(input.target, input.finalObservation, input.finalStems);
  const unaffectedStemPreservationVerified = verifyUnaffectedStemPreservation(localizedRerender, input.finalStems);

  const rerenderedStemCount = localizedRerender.rerenderStemIds.length;
  if (rerenderedStemCount > 0 && input.rerenderReceipts.length < 1) {
    throw new Error('SFI_AUDIO_LOCALIZED_RERENDER_RECEIPT_REQUIRED');
  }
  if (!unaffectedStemPreservationVerified) throw new Error('SFI_AUDIO_UNAFFECTED_STEM_CHANGED');

  const state = evaluationAfter.state === 'PASS' ? 'RETURN_PASS' : 'RETURN_FAIL';
  return {
    contract: SFI_AUDIO_RESULT_RECEIPT_CONTRACT,
    closedLoopContract: SFI_GOVERNED_AUDIO_CLOSED_LOOP_CONTRACT,
    resultId: input.resultId,
    sourceRef: input.sourceRef,
    scoreRef: input.scoreRef,
    performanceRefs: [...new Set(input.finalStems.map((stem) => stem.performanceRef))],
    instrumentRefs: [...new Set(input.finalStems.map((stem) => stem.instrumentRef))],
    targetRef: input.target.targetId,
    initialObservationRef: input.sourceObservation.observationId,
    renderedObservationRef: input.renderedObservation.observationId,
    finalObservationRef: input.finalObservation.observationId,
    initialRenderRunIds: input.initialStems.map((stem) => stem.renderReceipt.runId),
    rerenderRunIds: input.rerenderReceipts.map((receipt) => receipt.runId),
    localizedRerender,
    evaluationBefore,
    evaluationAfter,
    generatedOutputRemainsNonObservation: true,
    metricProvenanceRequired: true,
    unaffectedStemPreservationVerified,
    state,
    limitations: [...(input.limitations ?? [])],
  };
}
