export type SfiPredictionObservationState =
  | 'pendiente'
  | 'registrada_pre_perturbacion'
  | 'observed'
  | 'verified'
  | 'degraded'
  | 'uncertain'
  | 'archived';

export interface SfiPredictionEntry {
  case_id: string;
  hypothesis_id: string;
  case_label: string;
  operator_mode: string;
  fenotipo_estimado: string | null;
  ep_estado_inicial: string | null;
  ssp_esperada: string | null;
  ssp_observada: string | null;
  perturbacion_tipo: string | null;
  perturbacion_aplicada: string | null;
  prediccion_explicita: string;
  probabilidad_estimativa: number | null;
  friccion_respuesta_campo: string | null;
  resultado_72h: string | null;
  resultado_7d: string | null;
  resultado_30d: string | null;
  resultado_90d: string | null;
  ep_t_registrada: string;
  cp_dias: number | null;
  fallo_hipotesis: boolean | null;
  refinamiento: string | null;
  estado_observacion: SfiPredictionObservationState;
  created_at: string;
  updated_at: string;
}

export interface SfiPredictionAgentComparison {
  prediction_matched: boolean | null;
  prediction_failed: boolean | null;
  evidence_degraded: boolean;
  requires_refinement: boolean;
  phenotype_candidate_strengthened: boolean | null;
  phenotype_candidate_weakened: boolean | null;
  perturbation_family_effective: boolean | null;
  perturbation_family_blocked: boolean | null;
  root_approval_required: true;
}
