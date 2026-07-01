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
  agent: 'evidenceStateAgent' | 'returnWindowAgent' | 'verificationAgent';
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

// ---------------------------------------------------------------------------
// DT-TRUTH-001 â€” Capa B: Verification Layer.
// EvalÃºa una predicciÃ³n de sfi_prediction_entries contra fuente externa
// jerarquizada. No reescribe la predicciÃ³n original: vive en la tabla hija
// sfi_prediction_verifications, una fila por ventana de retorno.
// ---------------------------------------------------------------------------

export type SfiEvaluationResult = 'TRUE' | 'FALSE' | 'PARTIAL' | 'UNVERIFIABLE' | 'NOT_EVALUATED';

export const SFI_EVALUATION_RESULTS: SfiEvaluationResult[] = [
  'TRUE',
  'FALSE',
  'PARTIAL',
  'UNVERIFIABLE',
  'NOT_EVALUATED',
];

export type SfiVerificationState = 'OPEN' | 'DUE' | 'OVERDUE' | 'CLOSED' | 'DISPUTED' | 'SUPERSEDED';

export const SFI_VERIFICATION_STATES: SfiVerificationState[] = [
  'OPEN',
  'DUE',
  'OVERDUE',
  'CLOSED',
  'DISPUTED',
  'SUPERSEDED',
];

/** JerarquÃ­a de fuentes, DT-TRUTH-001 SecciÃ³n 8. 0 = mÃ¡s autorizada. */
export type SfiSourceQualityTier = 0 | 1 | 2 | 3 | 4;

/**
 * Contrato mÃ­nimo de regla verificable (DT-TRUTH-001 SecciÃ³n 12). Debe
 * declararse antes de que la ventana cierre. Sin este objeto, una hipÃ³tesis
 * puede registrarse en la Capa A, pero no entra al cÃ¡lculo de PFI.
 */
export interface SfiVerificationRule {
  observable: string;
  entity: string;
  window: SfiPredictionReturnWindow;
  comparator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'appears' | 'disappears' | 'changes_by';
  threshold: string;
  source_priority: Array<`tier_${SfiSourceQualityTier}`>;
  source_query: string;
  true_condition: string;
  false_condition: string;
  partial_condition: string | null;
  unverifiable_condition: string;
}

export interface SfiPredictionVerification {
  id: string;
  prediction_entry_id: string;
  hypothesis_id: string;
  return_window: SfiPredictionReturnWindow;
  verification_state: SfiVerificationState;
  evaluation_result: SfiEvaluationResult;
  verification_rule: SfiVerificationRule;
  ground_truth_source_type: string;
  ground_truth_source_url: string | null;
  ground_truth_source_query: string | null;
  source_quality_tier: SfiSourceQualityTier;
  source_snapshot_hash: string | null;
  source_checked_at: string | null;
  source_value: unknown;
  evaluation_confidence: number | null;
  evidence_state_after_verification: SfiPredictionEvidenceState | null;
  verification_notes: string | null;
  verified_by: string | null;
  superseded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSfiPredictionVerificationInput {
  prediction_entry_id: string;
  hypothesis_id: string;
  return_window: SfiPredictionReturnWindow;
  verification_rule: SfiVerificationRule;
  ground_truth_source_type: string;
  ground_truth_source_url?: string | null;
  ground_truth_source_query?: string | null;
  source_quality_tier: SfiSourceQualityTier;
}

export interface CloseSfiPredictionVerificationInput {
  id: string;
  evaluation_result: SfiEvaluationResult;
  source_snapshot_hash?: string | null;
  source_value?: unknown;
  evaluation_confidence?: number | null;
  evidence_state_after_verification?: SfiPredictionEvidenceState | null;
  verification_notes?: string | null;
  verified_by?: string | null;
}

/**
 * Resultado del Verification Agent pasivo: agrega el estado de verificaciÃ³n
 * de una predicciÃ³n a travÃ©s de sus ventanas. No inventa fuente, no cierra
 * sin regla, no publica.
 */
export interface SfiPredictionVerificationAgentResult extends SfiPredictionAgentResult {
  agent: 'verificationAgent';
  verifications: SfiPredictionVerification[];
  closed_count: number;
  disputed_count: number;
  unformalized_windows: SfiPredictionReturnWindow[];
  pfi_eligible: boolean;
  pfi_contribution: 'TRUE' | 'FALSE' | null;
  legacy_fallo_hipotesis_present_unformalized: boolean;
}

