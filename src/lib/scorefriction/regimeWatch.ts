import type { OperationalCycleState } from './contracts/operationalCycle';

export type RegimeWatchResult = {
  active: boolean;
  severity: 'none' | 'watch' | 'warning' | 'critical';
  changed_regime: boolean;
  previous_regime: string | null;
  current_regime: string | null;
  direction_shift: boolean;
  degradation_level: number;
  weak_signal_basis: unknown[];
  critical_window: string | null;
  minimal_action: string | null;
  evidence_required: string | null;
};

export function evaluateRegimeWatch(state: OperationalCycleState): RegimeWatchResult {
  const degradation = typeof state.degradation.level === 'number' ? state.degradation.level : 0;
  const changed = Boolean(state.regime.changed);
  const directionShift = Boolean(state.direction.current && state.direction.projected && state.direction.current !== state.direction.projected);
  const persistentWeakSignals = state.weak_signals.slice(0, 5);
  const severity: RegimeWatchResult['severity'] =
    degradation >= 0.8 || (changed && directionShift) ? 'critical'
      : degradation >= 0.58 || changed || directionShift ? 'warning'
        : persistentWeakSignals.length > 0 ? 'watch'
          : 'none';

  return {
    active: severity !== 'none',
    severity,
    changed_regime: changed,
    previous_regime: state.regime.previous ?? null,
    current_regime: state.regime.vector ?? state.regime.world ?? null,
    direction_shift: directionShift,
    degradation_level: Number(degradation.toFixed(4)),
    weak_signal_basis: persistentWeakSignals,
    critical_window: severity === 'critical' ? '0-72h' : severity === 'warning' ? '3-14d' : null,
    minimal_action: severity === 'none' ? null : 'Ejecutar una perturbacion minima y abrir ventana de verificacion.',
    evidence_required: severity === 'none' ? null : 'Registrar evidencia antes/despues y outcome verificable.',
  };
}



/**
 * Reuse Regime Watch + existing ScoreFriction experiment as a bounded
 * adaptive proposal, not a self-authorizing actuator.
 *
 * Elected attractors are never inferred from market/evidence scores. Weak
 * signals trigger new hypotheses/observations, not retroactive verification.
 * No missing source, effect size, causal estimate, or user consent is invented.
 */
export const SFI_ADAPTIVE_TRAJECTORY_CONTRACT = 'SFI-ADAPTIVE-TRAJECTORY-1.0' as const;

export type SfiAdaptiveRoute = {
  id: 'OBSERVE' | 'BOUNDED_TEST' | 'RECONFIGURE';
  eligibility: 'READY_FOR_GOVERNED_PROPOSAL' | 'REQUIRES_EVIDENCE' | 'CONDITIONAL_ONLY';
  action: string;
  trigger: string;
  expectedWorldSignal: string;
  verificationWindow: string;
  stoppingCondition: string;
  reversibility: 'REVERSIBLE' | 'UNASSESSED';
  evidenceRequired: string[];
  expectedDisplacement: null;
  worldReturnVerified: false;
  externalExecutionAuthorized: false;
};

export function deriveAdaptiveTrajectoryPlan(input: {
  state: OperationalCycleState;
  electedAttractor: string;
  hypothesisPrimary?: string | null;
  hypothesisRival?: string | null;
  verifiedPreviousReturn?: {
    classification:'CONFIRMED'|'PARTIAL'|'CONTRADICTED';
    eventId:string;
    evidenceRefs:string[];
  } | null;
}) {
  const state = input.state;
  const electedAttractor = input.electedAttractor.trim();
  const watch = evaluateRegimeWatch(state);
  const candidate = state.recommended_experiments?.find((item) => item.status === 'ready_for_test');
  const hasObject = state.object_presence === 'provided';
  const sourcesReady = Boolean(state.technical_state.worldspect_ok &&
    state.technical_state.scorefriction_ok && state.technical_state.supabase_ok &&
    !state.technical_state.fallback_used);
  const technicalWarnings = state.technical_state.warnings.slice(0, 8);
  const availableCaseEvidence = Array.isArray(state.evidence) && state.evidence.length > 0;
  const blockers = [
    !electedAttractor ? 'ELECTED_ATTRACTOR_REQUIRED' : null,
    !hasObject ? 'CASE_OBJECT_REQUIRED' : null,
    !sourcesReady ? 'WORLD_SOURCE_READ_NOT_VERIFIED' : null,
    !availableCaseEvidence ? 'PERSISTED_CASE_EVIDENCE_REQUIRED' : null,
    !input.hypothesisPrimary?.trim() ? 'PREREGISTRATION_CANDIDATE_REQUIRED' : null,
    !input.hypothesisRival?.trim() ? 'RIVAL_HYPOTHESIS_REQUIRED' : null,
  ].filter((value):value is string=>Boolean(value));
  // Weak signals and even critical warnings cannot self-verify action efficacy.
  const previous=input.verifiedPreviousReturn;
  const previousReturnVerified=Boolean(previous?.eventId.trim() && previous.evidenceRefs.length &&
    ['CONFIRMED','PARTIAL','CONTRADICTED'].includes(previous.classification));
  const previousContradicted=previousReturnVerified && previous?.classification==='CONTRADICTED';
  const previousConfirmed=previousReturnVerified && previous?.classification==='CONFIRMED';
  const drift = Boolean(previousContradicted || watch.direction_shift || watch.changed_regime ||
    watch.severity === 'critical' || watch.severity === 'warning');
  const weakSignalCount = Array.isArray(state.weak_signals) ? state.weak_signals.length : 0;
  const observation:SfiAdaptiveRoute = {
    id:'OBSERVE',
    eligibility:electedAttractor ? 'REQUIRES_EVIDENCE' : 'CONDITIONAL_ONLY',
    action:'Collect time-stamped, source-attributed evidence on the affected nodes without intervening.',
    trigger:weakSignalCount > 0 ? 'WEAK_SIGNALS_PRESENT' : 'BASELINE_OR_PROVENANCE_MISSING',
    expectedWorldSignal:'A comparable next snapshot makes the direction/regime and rival discriminators observable.',
    verificationWindow:'Next three comparable snapshots or 72 hours; revise only before T0 freeze.',
    stoppingCondition:'Stop if collection violates consent, source policy or observation boundaries.',
    reversibility:'REVERSIBLE',evidenceRequired:['source lineage','before/after timestamps','elected attractor'],
    expectedDisplacement:null,worldReturnVerified:false,externalExecutionAuthorized:false,
  };
  const bounded:SfiAdaptiveRoute = {
    id:'BOUNDED_TEST',
    eligibility:!blockers.length && candidate && !drift ? 'READY_FOR_GOVERNED_PROPOSAL' : 'CONDITIONAL_ONLY',
    action:candidate?.action ?? 'Design a low-perturbation internal experiment only after a valid candidate exists.',
    trigger:'SIGNAL_STABLE_AND_EXPERIMENT_READY',
    expectedWorldSignal:candidate?.expected_effect ?? 'A discriminating observed signal against the frozen test contract.',
    verificationWindow:candidate?.verification_window ?? 'Prospective bounded window to be preregistered.',
    stoppingCondition:candidate?.failure_condition ?? 'Stop at a preregistered contradiction or boundary breach.',
    reversibility:'REVERSIBLE',
    evidenceRequired:[...(candidate?.evidence_required ?? []),'registered H1/H2 test','independent world RETURN'],
    expectedDisplacement:null,worldReturnVerified:false,externalExecutionAuthorized:false,
  };
  const reconfigure:SfiAdaptiveRoute = {
    id:'RECONFIGURE',
    eligibility:!blockers.length && drift && Boolean(candidate) ? 'READY_FOR_GOVERNED_PROPOSAL' : 'CONDITIONAL_ONLY',
    action:candidate
      ? 'Replace the previous test sequence with one bounded reversible trial: '+candidate.action
      : 'Reformulate the experiment when discriminating evidence becomes available; do not execute a new intervention yet.',
    trigger:drift ? 'REGIME_OR_DIRECTION_CHANGE' : 'NO_OBSERVED_DRIFT',
    expectedWorldSignal:candidate?.expected_effect ?? 'A later-world observation distinguishes the reconfigured route from its rival.',
    verificationWindow:candidate?.verification_window ?? 'New prospective T0 and observation interval required.',
    stoppingCondition:candidate?.failure_condition ?? 'Stop if outcome is unobservable or constraints are breached.',
    reversibility:candidate ? 'REVERSIBLE' : 'UNASSESSED',
    evidenceRequired:[...(candidate?.evidence_required??[]),'frozen criteria','independent outcome evidence'],
    expectedDisplacement:null,worldReturnVerified:false,externalExecutionAuthorized:false,
  };
  const routes:SfiAdaptiveRoute[]=[observation,bounded,reconfigure];
  const selected=(!blockers.length && drift && candidate) ? reconfigure
    : (previousConfirmed && !drift) ? observation
    : (!blockers.length && candidate) ? bounded : observation;
  const canPropose = selected.eligibility === 'READY_FOR_GOVERNED_PROPOSAL';
  return {
    contract:SFI_ADAPTIVE_TRAJECTORY_CONTRACT,
    caseId:state.case_id,electedAttractor:electedAttractor||null,
    hypothesis:{primary:input.hypothesisPrimary?.trim()||null,
      rival:input.hypothesisRival?.trim()||null,
      status:'CANDIDATE_NOT_OBSERVED_OR_VERIFIED' as const},
    observation:{watch,weakSignalCount,caseEvidenceAvailable:availableCaseEvidence,
      technicalWarnings,sourceReadReady:sourcesReady,
      previousWorldReturnVerified,
      previousReturn:previousReturnVerified ? previous : null},
    routes,selectedRouteId:selected.id,blockers,
    state:canPropose?'PROPOSABLE_GOVERNED_RECONFIGURATION': 'OBSERVE_OR_REPREREGISTER',
    canCreateDraftProposal:canPropose,
    execution:{automaticExternalExecution:false as const,internalExecutionPerformed:false as const,
      existingGovernanceQueueRequired:true as const,requiresFutureIndependentReturn:true as const,
      learningPromoted:false as const},
    boundary:'Routes are candidate actions only. Weak signals do not refute H1, prove H2, establish displacement, or change the elected attractor. No draft/approval can mutate Canon or authorize an external act without existing SFI governance.',
  };
}
