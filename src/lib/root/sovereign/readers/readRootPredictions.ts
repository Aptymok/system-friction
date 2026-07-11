import 'server-only';
import { dateValue, selectRows, source } from './readerSupport';

export async function readRootPredictions() {
  const [models, runs, requests, outcomes, learning, legacy, verifications] = await Promise.all([
    selectRows({ table: 'sfi_predictive_models', select: 'id,model_key,name,version,status,calibration_status,verified_sample_count,brier_score,bias_score,metadata,created_at,updated_at', order: 'updated_at', limit: 30 }),
    selectRows({ table: 'sfi_predictive_runs', select: 'id,model_id,status,subject,prediction,lower_bound,upper_bound,confidence,due_at,evidence_ids,input_snapshot,created_at,updated_at', order: 'created_at', limit: 60 }),
    selectRows({ table: 'sfi_predictive_evidence_requests', select: 'id,run_id,status,request_text,evidence_ids,due_at,created_at,updated_at', order: 'created_at', limit: 60 }),
    selectRows({ table: 'sfi_predictive_outcomes', select: 'id,run_id,observed_value,observed_at,residual,evidence_ids,created_at', order: 'observed_at', limit: 60 }),
    selectRows({ table: 'sfi_predictive_learning_events', select: 'id,model_id,run_id,decision,reason,evidence_ids,created_at', order: 'created_at', limit: 60 }),
    selectRows({ table: 'sfi_prediction_entries', select: 'id,hypothesis_id,case_id,case_label,prediccion_explicita,probabilidad_estimativa,fenotipo_estimado,evidence_state,estado_observacion,prediction_registered_at,verification_window_end,created_at,updated_at', order: 'created_at', limit: 60 }),
    selectRows({ table: 'sfi_prediction_verifications', select: 'id,prediction_entry_id,hypothesis_id,return_window,verification_state,evaluation_result,verification_rule,ground_truth_source_type,ground_truth_source_url,source_checked_at,source_value,evaluation_confidence,evidence_state_after_verification,verification_notes,verified_by,created_at,updated_at', order: 'created_at', limit: 60 }),
  ]);
  const observedAt = dateValue(runs.rows[0]?.updated_at ?? models.rows[0]?.updated_at ?? legacy.rows[0]?.updated_at ?? legacy.rows[0]?.created_at);
  return source({ models: models.rows, runs: runs.rows, evidenceRequests: requests.rows, outcomes: outcomes.rows, learningEvents: learning.rows, legacyEntries: legacy.rows, legacyVerifications: verifications.rows }, 'predictive engine + legacy registry', [models.error, runs.error, requests.error, outcomes.error, learning.error, legacy.error, verifications.error], observedAt, !models.rows.length && !legacy.rows.length);
}
