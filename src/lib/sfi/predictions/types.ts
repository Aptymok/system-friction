export type SfiPredictionObservationState =
  | 'pendiente'
  | 'registrada_pre_perturbacion'
  | 'retrospective_observation'
  | 'observed'
  | 'verified'
  | 'degraded'
  | 'uncertain'
  | 'archived';

export type SfiPredictionEvidenceState =
  | 'PENDING'
  | 'OBSERVED'
  | 'VERIFIED'
  | 'DEGRADED'
  | 'UNCERTAIN'
  | 'ARCHIVED';

export type SfiPredictionReturnWindow = '72h' | '7d' | '30d' | '90d';

export const SFI_PREDICTION_OBSERVATION_STATES: SfiPredictionObservationState[] = [
  'pendiente',
  'registrada_pre_perturbacion',
  'retrospective_observation',
  'observed',
  'verified',
  'degraded',
  'uncertain',
  'archived',
];

export const SFI_PREDICTION_EVIDENCE_STATES: SfiPredictionEvidenceState[] = [
  'PENDING',
  'OBSERVED',
  'VERIFIED',
  'DEGRADED',
  'UNCERTAIN',
  'ARCHIVED',
];

export const SFI_PREDICTION_RETURN_WINDOWS: SfiPredictionReturnWindow[] = ['72h', '7d', '30d', '90d'];

export interface SfiPredictionEntry {
  id: string;
  case_id: string;
  hypothesis_id: string;
  case_label: string | null;
  operator_mode: string | null;
  fenotipo_estimado: string;
  ep_estado_inicial: string;
  ssp_esperada: string;
  ssp_observada: string | null;
  perturbacion_tipo: string;
  perturbacion_aplicada: string;
  prediccion_explicita: string;
  probabilidad_estimativa: number;
  friccion_respuesta_campo: string | null;
  resultado_72h: string | null;
  resultado_7d: string | null;
  resultado_30d: string | null;
  resultado_90d: string | null;
  ep_t_registrada: string | null;
  cp_dias: number | null;
  fallo_hipotesis: string | null;
  refinamiento: string | null;
  estado_observacion: SfiPredictionObservationState;
  prediction_registered_at: string;
  perturbation_applied_at: string | null;
  is_predictive_evidence: boolean;
  evidence_state: SfiPredictionEvidenceState;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSfiPredictionInput {
  case_id: string;
  hypothesis_id: string;
  fenotipo_estimado: string;
  ep_estado_inicial: string;
  ssp_esperada: string;
  perturbacion_tipo: string;
  perturbacion_aplicada: string;
  prediccion_explicita: string;
  probabilidad_estimativa: number;
  case_label?: string | null;
  operator_mode?: string | null;
  perturbation_applied_at?: string | null;
  friccion_respuesta_campo?: string | null;
  ssp_observada?: string | null;
  created_by?: string | null;
}

export interface UpdateSfiPredictionReturnInput {
  resultado_72h?: string | null;
  resultado_7d?: string | null;
  resultado_30d?: string | null;
  resultado_90d?: string | null;
  ssp_observada?: string | null;
  friccion_respuesta_campo?: string | null;
  ep_t_registrada?: string | null;
  cp_dias?: number | null;
  fallo_hipotesis?: string | null;
  refinamiento?: string | null;
  evidence_state?: SfiPredictionEvidenceState;
  estado_observacion?: SfiPredictionObservationState;
}

export interface SfiPredictionReturnWindowStatus {
  window: SfiPredictionReturnWindow;
  field: 'resultado_72h' | 'resultado_7d' | 'resultado_30d' | 'resultado_90d';
  due_at: string | null;
  complete: boolean;
  pending: boolean;
  due: boolean;
  overdue: boolean;
}

export interface SfiPredictionAgentResult {
  agent: 'evidenceStateAgent' | 'returnWindowAgent';
  mode: 'passive_deterministic';
  ok: boolean;
  hypothesis_id: string | null;
  blocked: string[];
  warnings: string[];
  root_approval_required: true;
}

export interface SfiPredictionEvidenceAgentResult extends SfiPredictionAgentResult {
  agent: 'evidenceStateAgent';
  prediction_registered_before_perturbation: boolean;
  prediction_matched: boolean | null;
  prediction_failed: boolean | null;
  evidence_degraded: boolean;
  requires_refinement: boolean;
  retrospective_only: boolean;
}

export interface SfiPredictionReturnWindowAgentResult extends SfiPredictionAgentResult {
  agent: 'returnWindowAgent';
  windows: SfiPredictionReturnWindowStatus[];
  pending_count: number;
  complete_count: number;
  due_count: number;
  overdue_count: number;
}

export interface SfiPredictionHealth {
  ok: boolean;
  table_available: boolean;
  entries_count: number | null;
  pending_returns_count: number | null;
  blocked: string[];
  warnings: string[];
  agents: {
    evidenceStateAgent: {
      ok: boolean;
      checked: number;
      blocked: string[];
      warnings: string[];
    };
    returnWindowAgent: {
      ok: boolean;
      checked: number;
      pending_returns_count: number;
      overdue_returns_count: number;
      blocked: string[];
      warnings: string[];
    };
  };
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
