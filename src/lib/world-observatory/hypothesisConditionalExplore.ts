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
