import type { HypothesisConditionalBranch } from './hypothesisConditionalBranches';

/**
 * Local, reversible exploration of a frozen test criterion.
 * No input here is a real measurement, observed RETURN, probability,
 * causal estimate, governance decision, or persisted research result.
 */
export type PossibilityInput = {
  value: string;
  presence: 'UNKNOWN' | 'PRESENT' | 'ABSENT';
  observations: string;
  evidence: string;
  sourceFamilies: string;
};

export type PossibilityResult = {
  state: 'VALUE_UNSPECIFIED' | 'CRITERION_NOT_MET' | 'SAMPLING_INSUFFICIENT' | 'PROVENANCE_UNVERIFIED' | 'CONDITION_POSSIBLE_IN_SCENARIO';
  matchesCriterion: boolean | null;
  missing: string[];
  label: string;
  boundary: string;
};

const finiteNumber = (value: string): number | null => {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const nonnegativeInteger = (value: string): number | null => {
  const parsed = finiteNumber(value);
  return parsed !== null && Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

export function evaluatePossibility(
  criterion: HypothesisConditionalBranch,
  minimumEvidence: number,
  minimumSourceFamilies: number,
  input: PossibilityInput,
): PossibilityResult {
  const value = finiteNumber(input.value);
  const requiredNumeric = criterion.operator !== 'PRESENCE' && criterion.operator !== 'ABSENCE';
  const threshold = criterion.threshold;
  let matchesCriterion: boolean | null = null;

  if (!requiredNumeric) {
    if (input.presence !== 'UNKNOWN') {
      matchesCriterion = criterion.operator === 'PRESENCE'
        ? input.presence === 'PRESENT'
        : input.presence === 'ABSENT';
    }
  } else if (value !== null && threshold !== null && Number.isFinite(threshold)) {
    switch (criterion.operator) {
      case 'GT': matchesCriterion = value > threshold; break;
      case 'GTE':
      case 'DELTA_GTE':
      case 'COUNT_GTE': matchesCriterion = value >= threshold; break;
      case 'LT': matchesCriterion = value < threshold; break;
      case 'LTE':
      case 'DELTA_LTE': matchesCriterion = value <= threshold; break;
      case 'EQ': matchesCriterion = value === threshold; break;
      default: matchesCriterion = null;
    }
  }

  const observations = nonnegativeInteger(input.observations);
  const evidence = nonnegativeInteger(input.evidence);
  const families = nonnegativeInteger(input.sourceFamilies);
  const missing: string[] = [];
  if (observations === null || observations < criterion.minimumObservations) {
    missing.push('Observaciones admisibles: mínimo ' + criterion.minimumObservations);
  }
  if (evidence === null || evidence < minimumEvidence) {
    missing.push('Evidencia posterior al corte: mínimo ' + minimumEvidence);
  }
  if (families === null || families < minimumSourceFamilies) {
    missing.push('Familias de fuente: mínimo ' + minimumSourceFamilies);
  }
  const sourceFamilyUnverified = criterion.sourceFamilies.length > 0;

  const boundary = 'Ensayo condicional local. No verifica la hipótesis completa, no observa el mundo, no reabre la prueba histórica y no registra un RETURN.';
  if (matchesCriterion === null) {
    return { state:'VALUE_UNSPECIFIED', matchesCriterion, missing,
      label:'Especifica una señal hipotética para examinar este criterio.', boundary };
  }
  if (!matchesCriterion) {
    return { state:'CRITERION_NOT_MET', matchesCriterion, missing,
      label:'Con este valor hipotético, el criterio seleccionado no se cumple.', boundary };
  }
  if (missing.length) {
    return { state:'SAMPLING_INSUFFICIENT', matchesCriterion, missing,
      label:'El valor cumpliría el criterio, pero todavía faltan las observaciones o fuentes mínimas.', boundary };
  }
  if (sourceFamilyUnverified) {
    return { state:'PROVENANCE_UNVERIFIED', matchesCriterion,
      missing:['Comprobar observaciones de las fuentes declaradas: ' + criterion.sourceFamilies.join(', ')],
      label:'El criterio se cumpliría bajo los valores planteados; la procedencia todavía necesita verificación.', boundary };
  }
  return { state:'CONDITION_POSSIBLE_IN_SCENARIO', matchesCriterion, missing,
    label:'El escenario cumple el umbral y los mínimos numéricos declarados. La procedencia y la comparación real siguen sin verificar.', boundary };
}


/** A bounded, non-persistent two-hypothesis scenario, not a factual verdict. */
export function compareRivalConditions(input:{
  primary:HypothesisConditionalBranch;
  rival:HypothesisConditionalBranch;
  primaryScenario:PossibilityInput;
  rivalScenario:PossibilityInput;
  primaryWindowRef:string;
  rivalWindowRef:string;
  minimumEvidence:number;
  minimumSourceFamilies:number;
  electedAttractor:string;
  recovery?:{action:string;condition:string;expectedWorldSignal:string;reversible:boolean}|null;
  participantReturn?:{claimedAction:string;evidenceRefs:string[]}|null;
  worldReturn?:{observedAt:string;evidenceRefs:string[];independentlyVerified:boolean;predictedSignalMatched:'YES'|'NO'|'UNKNOWN';attractorObserved:'YES'|'NO'|'UNKNOWN'}|null;
  sealedPrediction?:{hash:string;frozenAt:string;actionAt:string}|null;
}) {
  if (!input.electedAttractor.trim()) throw new Error('ELECTED_ATTRACTOR_REQUIRED');
  const primary=evaluatePossibility(input.primary,input.minimumEvidence,input.minimumSourceFamilies,input.primaryScenario);
  const rival=evaluatePossibility(input.rival,input.minimumEvidence,input.minimumSourceFamilies,input.rivalScenario);
  const comparable=Boolean(input.primaryWindowRef.trim() && input.primaryWindowRef===input.rivalWindowRef);
  // Only a criterion-level conditional advantage, never victory of a whole hypothesis.
  const p=primary.state==='CONDITION_POSSIBLE_IN_SCENARIO' && input.primary.relation==='SUPPORT_IF';
  const r=rival.state==='CONDITION_POSSIBLE_IN_SCENARIO' && input.rival.relation==='SUPPORT_IF';
  const pFails=primary.state==='CRITERION_NOT_MET';
  const rFails=rival.state==='CRITERION_NOT_MET';
  const advantage=!comparable?'NOT_COMPARABLE':p&&rFails?'PRIMARY_CONDITION_ADVANTAGE':
    r&&pFails?'RIVAL_CONDITION_ADVANTAGE':'UNDETERMINED';
  const recovery=input.recovery;
  const routeReady=Boolean(recovery?.reversible && recovery.action.trim() &&
    recovery.condition.trim() && recovery.expectedWorldSignal.trim());
  const claimed=Boolean(input.participantReturn?.claimedAction.trim());
  const world=input.worldReturn;
  const sealed=input.sealedPrediction;
  const frozenBeforeAction=Boolean(sealed?.hash.trim() && Number.isFinite(Date.parse(sealed.frozenAt)) &&
    Number.isFinite(Date.parse(sealed.actionAt)) && Date.parse(sealed.frozenAt)<Date.parse(sealed.actionAt));
  const worldVerifiable=Boolean(world?.independentlyVerified && world.evidenceRefs.length>0 &&
    Number.isFinite(Date.parse(world.observedAt)) && frozenBeforeAction &&
    sealed && Date.parse(world!.observedAt)>=Date.parse(sealed.actionAt));
  const worldPrediction=worldVerifiable?(world?.predictedSignalMatched==='YES'?'SUPPORTED':
    world?.predictedSignalMatched==='NO'?'CONTRADICTED':'INCONCLUSIVE'):'NOT_VERIFIED';
  const attractorState=worldVerifiable && world?.attractorObserved==='YES'
    ? 'OBSERVED_DESTINATION_REACHED' : 'NOT_VERIFIED';
  return {
    contract:'SFI-RIVAL-CONDITIONAL-ATTRACTOR-1.0',
    electedAttractor:input.electedAttractor,
    primary:{criterionId:input.primary.criterionId,scenario:primary},
    rival:{criterionId:input.rival.criterionId,scenario:rival},
    comparison:{comparable,advantage,epistemicClass:'CONDITIONAL_NOT_OBSERVED' as const},
    recovery:{state:attractorState==='OBSERVED_DESTINATION_REACHED'?'WORLD_RETURN_SUPPORTS_ATTRACTOR':
      routeReady?'CONDITIONAL_REENTRY_NOT_EXECUTED':'NO_ADMISSIBLE_ROUTE',
      condition:recovery?.condition??null,expectedWorldSignal:recovery?.expectedWorldSignal??null,
      possibleDespitePrimaryLoss:advantage==='RIVAL_CONDITION_ADVANTAGE' && routeReady,
      destinationVerified:attractorState==='OBSERVED_DESTINATION_REACHED'},
    returns:{
      participant:{state:claimed?'USER_REPORTED':'NOT_REPORTED',evidenceRefs:input.participantReturn?.evidenceRefs??[],epistemicClass:'DECLARED'},
      world:{state:worldPrediction,attractorState,evidenceRefs:world?.evidenceRefs??[],epistemicClass:worldVerifiable?'VERIFIED_OBSERVATION':'NOT_VERIFIED'},
    },
    internalContrast:{predictionSealedBeforeAction:frozenBeforeAction,detailsWithheld:true,
      notice:'An internal preregistered prediction is assessed separately. Its existence and use must be disclosed to the participant.'},
    learning:{eligibleForGovernedReview:worldVerifiable && worldPrediction!=='INCONCLUSIVE',promoted:false},
    boundary:'Condition-level what-if, not observed hypothesis victory. Never infer consent, automatic project action, verified causality, real-world return or canon promotion from hypothetical inputs.',
  };
}
