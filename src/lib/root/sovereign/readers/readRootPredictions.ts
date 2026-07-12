import 'server-only';
import { dateValue, selectRows, source } from './readerSupport';

export async function readRootPredictions() {
  const [models, runs, requests, outcomes, learning, legacy, verifications] = await Promise.all([
    selectRows({
      table: 'sfi_predictive_models',
      select: 'id,scope,model_key,target_key,target_kind,version,status,feature_schema,weights,intercept,learning_rate,sample_count,verified_sample_count,metrics,parent_model_id,created_by,created_at,updated_at',
      order: 'updated_at',
      limit: 30,
    }),
    selectRows({
      table: 'sfi_predictive_runs',
      select: 'id,owner_id,scope,subject_type,subject_id,model_id,model_version,target_key,target_kind,status,prediction,lower_bound,upper_bound,confidence,calibration_status,input_snapshot,feature_vector,feature_contributions,evidence_refs,missing_evidence,interpretation,amv_assessment,verification_rule,requested_return_window,due_at,legacy_prediction_entry_id,created_by,created_at,updated_at',
      order: 'created_at',
      limit: 60,
    }),
    selectRows({
      table: 'sfi_predictive_evidence_requests',
      select: 'id,run_id,evidence_key,description,reason,source_candidates,auto_collectible,priority,status,fulfilled_evidence,fulfilled_at,created_at,updated_at',
      order: 'created_at',
      limit: 60,
    }),
    selectRows({
      table: 'sfi_predictive_outcomes',
      select: 'id,run_id,return_window,actual_value,outcome_payload,source_type,source_ref,source_quality,intervention_fidelity,observed_at,evaluation_state,error_payload,created_by,created_at',
      order: 'observed_at',
      limit: 60,
    }),
    selectRows({
      table: 'sfi_predictive_learning_events',
      select: 'id,run_id,outcome_id,model_id,learning_state,error_class,error_analysis,parameter_state_before,parameter_delta,parameter_state_after,quality_weight,amv_reflection,rollback_of,created_by,created_at',
      order: 'created_at',
      limit: 60,
    }),
    selectRows({
      table: 'sfi_prediction_entries',
      select: 'id,hypothesis_id,case_id,case_label,prediccion_explicita,probabilidad_estimativa,fenotipo_estimado,evidence_state,estado_observacion,prediction_registered_at,created_at,updated_at',
      order: 'created_at',
      limit: 60,
    }),
    selectRows({
      table: 'sfi_prediction_verifications',
      select: 'id,prediction_entry_id,hypothesis_id,return_window,verification_state,evaluation_result,verification_rule,ground_truth_source_type,ground_truth_source_url,source_checked_at,source_value,evaluation_confidence,evidence_state_after_verification,verification_notes,verified_by,created_at,updated_at',
      order: 'created_at',
      limit: 60,
    }),
  ]);
  const observedAt = dateValue(runs.rows[0]?.updated_at ?? runs.rows[0]?.created_at ?? models.rows[0]?.updated_at ?? legacy.rows[0]?.updated_at ?? legacy.rows[0]?.created_at);
  return source(
    {
      models: models.rows,
      runs: runs.rows,
      evidenceRequests: requests.rows,
      outcomes: outcomes.rows,
      learningEvents: learning.rows,
      legacyEntries: legacy.rows,
      legacyVerifications: verifications.rows,
    },
    'predictive engine + legacy registry',
    [models.error, runs.error, requests.error, outcomes.error, learning.error, legacy.error, verifications.error],
    observedAt,
    !models.rows.length && !legacy.rows.length,
  );
}
