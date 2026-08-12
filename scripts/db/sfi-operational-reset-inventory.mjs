export const HISTORICAL_PRESERVE_TABLES = [
  // Preserve the temporal spine and provenance-rich world observations only.
  // Derived world hypotheses/readings/learning are rebuilt from these sources after reset.
  'sfi_world_day_ledger',
  'world_source_observations',
  'worldspect_snapshots',
];

export const PROTECTED_TABLES = [
  // Identity / access / billing / authority survive an operational clean start.
  'profiles',
  'system_accounts',
  'system_roles',
  'system_actor_roles',
  'system_resources',
  'system_permissions',
  'system_access_grants',
  'system_entitlements',
  'system_subscriptions',
  'system_payment_events',
  'system_api_clients',
  // Schema migrations and canonical code/corpus are repository/Supabase metadata and are never reset here.
  'schema_migrations',
  ...HISTORICAL_PRESERVE_TABLES,
];

export const OPERATIONAL_RESET_LAYERS = [
  {
    id:'operating-cycle-analysis',
    reason:'Derived cycle layers must be deleted before the cycle identity they reference.',
    tables:['sfi_artifact_trajectory_events','sfi_inference_traces'],
  },
  {
    id:'field-return',
    reason:'Field child records before cases; removes observed test/runtime history only after proof export.',
    tables:['field_outcomes','field_returns','field_interventions','field_hypotheses','field_mihm_readings','field_moph_runs','field_case_evidence'],
  },
  {
    id:'field-participant',
    reason:'Participant operational capture is longitudinal runtime, not identity/authority.',
    tables:['field_participant_actions','field_participant_sessions','field_participant_intakes','field_participant_consents','field_participant_profiles'],
  },
  {
    id:'field-cases',
    reason:'Parent Field cases after all child records.',
    tables:['field_cases'],
  },
  {
    id:'studio-derived',
    reason:'Studio analysis/results before object/session parents.',
    tables:[
      'studio_exports','studio_archive_events','studio_evidence_traces','studio_interventions','studio_hypotheses','studio_time_coordinates',
      'studio_community_features','studio_text_features','studio_image_features','studio_video_features','studio_audio_features','studio_object_features',
      'studio_analysis_jobs','studio_uploads',
    ],
  },
  {
    id:'studio-parents',
    reason:'Studio object/session identity after derived analysis rows.',
    tables:['studio_objects','studio_sessions'],
  },
  {
    id:'method-lab',
    reason:'Laboratory executions are runtime evidence; protocol definitions remain in code/canon.',
    tables:['sfi_lab_analyses'],
  },
  {
    id:'cognitive-twin-runtime',
    reason:'Clears institutional memory/decisions/evaluations/runs including CT-A01 epochs; the executable Twin contract remains in code and can generate a new genesis.',
    tables:['sfi_cognitive_twin_evaluations','sfi_cognitive_twin_runs','sfi_cognitive_twin_memory','sfi_cognitive_twin_decisions'],
  },
  {
    id:'predictions-attractors-learning',
    reason:'Clears accumulated prediction/outcome/learning state so the clean system does not inherit test history.',
    tables:[
      'sfi_prediction_verifications','sfi_predictive_learning_events','sfi_prediction_entries',
      'sfi_amv_memory','sfi_amv_learning','sfi_ejectors','sfi_attractors','sfi_phenomena','sfi_ppoi_runs',
    ],
  },
  {
    id:'world-derived-runtime',
    reason:'Clears recomputable/parallel world runtime while preserving source observations, provenance-rich WorldSpect snapshots and the persistent world-day ledger.',
    tables:[
      'world_friction_readings','world_hypotheses','world_hypothesis_outcomes','world_learning_events',
      'world_vector_cycles','world_vector_observations','world_vector_reports','world_vector_alerts',
      'world_observatory_learning','world_observatory_events','external_evidence_vector',
      'kernel_cycles','root_observation_events','sfi_indicator_snapshots',
    ],
  },
  {
    id:'reports-commercial-runtime',
    reason:'Clears generated reports/prospect/commercial runtime, not product definitions.',
    tables:['sfi_agent_reports','sfi_reports','sfi_prospect_radar','root_commercial_proposals','root_commercial_events'],
  },
  {
    id:'governance-runtime',
    reason:'Clears test proposals, receipts, audit and mutation events while ROOT/ACP authority and access survive.',
    tables:['sfi_promotion_receipts','sfi_governance_events','logbook_mutations','action_proposals','root_audit_events'],
  },
  {
    id:'graph-evidence-runtime',
    reason:'Graph is a projection of evidence and is cleared before the reconstructed historical evidence ledger is re-seeded.',
    tables:['graph_edges','graph_nodes','root_neural_edges','root_neural_nodes','root_evidence_entries','sfi_evidence_ledger','epistemic_events'],
  },
  {
    id:'operating-cycle-parent',
    reason:'Cross-organ workflow identities are deleted last after every referenced runtime layer.',
    tables:['sfi_operating_cycles'],
  },
];

export const OPERATIONAL_DELETE_ORDER = OPERATIONAL_RESET_LAYERS.flatMap(layer=>layer.tables);

const duplicates=OPERATIONAL_DELETE_ORDER.filter((table,index,all)=>all.indexOf(table)!==index);
if(duplicates.length) throw new Error(`Duplicate operational reset table(s): ${[...new Set(duplicates)].join(', ')}`);
for(const table of PROTECTED_TABLES){
  if(OPERATIONAL_DELETE_ORDER.includes(table)) throw new Error(`Protected table present in purge inventory: ${table}`);
}
