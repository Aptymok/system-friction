export type MiniMophInput = {
  stuckSystem: string;
  objective?: string;
  attempts?: string;
  evidence?: string;
  consequence?: string;
};

export type MiniMophResultLike = {
  risk: 'low' | 'medium' | 'high';
  sfi_dr01_fit: 'low' | 'medium' | 'high';
  confidence: number;
  friction_reading: string;
  conversion_break: string;
  minimal_perturbation: string;
};

export type PhenotypeProfile = {
  code: 'EVIDENCE_THIN' | 'COORDINATION_FRAGMENTED' | 'RISK_SATURATED' | 'PERTURBATION_READY';
  label: string;
  summary: string;
  dimensions: {
    evidenceDensity: number;
    changeCapacity: number;
    fieldRisk: number;
    longitudinalReadiness: number;
  };
  confidence: number;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function textWeight(value?: string) {
  const size = value?.trim().length ?? 0;
  if (size >= 320) return 1;
  if (size >= 160) return 0.75;
  if (size >= 60) return 0.5;
  if (size >= 16) return 0.25;
  return 0;
}

export function derivePhenotype(input: MiniMophInput, result: MiniMophResultLike): PhenotypeProfile {
  const evidenceDensity = clamp((textWeight(input.evidence) * 70) + (result.sfi_dr01_fit === 'high' ? 30 : result.sfi_dr01_fit === 'medium' ? 18 : 6));
  const attemptWeight = textWeight(input.attempts);
  const objectiveWeight = textWeight(input.objective);
  const changeCapacity = clamp(24 + objectiveWeight * 38 + attemptWeight * 18 + result.confidence * 20);
  const fieldRisk = clamp(result.risk === 'high' ? 84 : result.risk === 'medium' ? 56 : 28);
  const longitudinalReadiness = clamp((evidenceDensity * 0.38) + (changeCapacity * 0.36) + ((100 - fieldRisk) * 0.14) + (result.confidence * 12));

  let code: PhenotypeProfile['code'];
  let label: string;
  let summary: string;

  if (fieldRisk >= 75) {
    code = 'RISK_SATURATED';
    label = 'Fenotipo de saturación de riesgo';
    summary = 'El campo contiene consecuencias o restricciones suficientes para impedir una perturbación directa sin control humano y evidencia adicional.';
  } else if (evidenceDensity < 38) {
    code = 'EVIDENCE_THIN';
    label = 'Fenotipo de evidencia insuficiente';
    summary = 'La fricción es observable, pero la densidad de evidencia todavía no permite sostener una intervención longitudinal con trazabilidad suficiente.';
  } else if (attemptWeight >= 0.5 && longitudinalReadiness < 62) {
    code = 'COORDINATION_FRAGMENTED';
    label = 'Fenotipo de coordinación fragmentada';
    summary = 'Existen intentos de cambio, pero no están integrados en una única hipótesis, una ventana de verificación y una secuencia de retorno.';
  } else {
    code = 'PERTURBATION_READY';
    label = 'Fenotipo de perturbación viable';
    summary = 'El sistema presenta evidencia, objetivo y reversibilidad suficientes para iniciar una perturbación mínima observada durante 72 horas.';
  }

  return {
    code,
    label,
    summary,
    dimensions: {
      evidenceDensity,
      changeCapacity,
      fieldRisk,
      longitudinalReadiness,
    },
    confidence: Math.max(0, Math.min(1, result.confidence)),
  };
}
