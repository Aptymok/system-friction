export const SFI_CANONICAL_RESET_CONTRACT = 'SFI-CANONICAL-RESET-CLASSIFICATION-1.1';

// Founder-directed preservation boundary (2026-09-07): World observation and
// hypothesis history is institutional evidence and must never be discarded by
// the canonical reset. Preserve the complete longitudinal World plane needed to
// reconstruct observation -> friction -> hypothesis -> outcome -> learning and
// WorldSpect / World Vector trajectories. Empty World tables remain protected so
// later rows cannot be silently deleted by the same reset contract.
export const PRESERVE_DATA_TABLES = [
  'world_source_observations',
  'world_friction_readings',
  'world_hypotheses',
  'world_hypothesis_outcomes',
  'world_learning_events',
  'worldspect_snapshots',
  'world_vector_cycles',
  'world_vector_observations',
  'world_vector_reports',
  'world_vector_alerts',
];

// These rows do NOT survive as legacy data. They are cleared and deterministically
// re-created from auth/current configuration after the reset so SFI can operate.
export const RESEED_MINIMAL_TABLES = [
  'profiles',
  'sfi_tenants',
  'sfi_tenant_members',
  'sfi_oauth_clients',
  'accounts',
  'account_members',
  'account_balance',
];

// Explicit snapshot of every other public table observed live at the reset-design
// baseline. A newly appearing public table is UNCLASSIFIED and blocks reset until
// this list is intentionally updated. No unknown table is ever purged implicitly.
export const PURGE_DATA_TABLES = [
  'action_proposals',
  'commercial_clients',
  'commercial_opportunities',
  'commercial_proposal_events',
  'commercial_proposal_versions',
  'commercial_proposals',
  'epistemic_events',
  'field_case_evidence',
  'field_cases',
  'field_hypotheses',
  'field_interventions',
  'field_lessons',
  'field_mihm_readings',
  'field_moph_runs',
  'field_outcomes',
  'field_participant_marks',
  'field_participant_windows',
  'field_profiles',
  'field_returns',
  'graph_edges',
  'graph_nodes',
  'institutional_memory_audit_log',
  'logbook_degradation',
  'logbook_frictions',
  'logbook_knowledge',
  'logbook_links',
  'logbook_mutations',
  'logbook_nodes',
  'logbook_regime',
  'logbook_signals',
  'mihm_state_registry',
  'persistent_signals',
  'platform_metric_snapshots',
  'policy_decisions',
  'ppoi_evidence',
  'ppoi_evidence_links',
  'ppoi_hypotheses',
  'ppoi_identity_aliases',
  'ppoi_phenomena',
  'prospect_opportunity_reports',
  'prospect_research_runs',
  'prospect_research_sources',
  'root_agents',
  'root_audit_events',
  'root_evidence_entries',
  'root_telemetry_incidents',
  'scorefriction_case_studies',
  'scorefriction_observations',
  'scorefriction_prototypes',
  'scorefriction_sources',
  'scorefriction_vectors',
  'scorefriction_verifications',
  'sfi_amv_memory',
  'sfi_artifact_trajectory_events',
  'sfi_attractor_evidence_links',
  'sfi_attractor_trajectory_snapshots',
  'sfi_attractors',
  'sfi_audio_render_runs',
  'sfi_audit_events',
  'sfi_capability_checks',
  'sfi_capability_health_checks',
  'sfi_case_action_decisions',
  'sfi_case_action_proposals',
  'sfi_case_audit_events',
  'sfi_case_evidence_links',
  'sfi_case_objects',
  'sfi_case_relations',
  'sfi_case_reports',
  'sfi_cases',
  'sfi_cognitive_lab_analyses',
  'sfi_cognitive_lab_events',
  'sfi_cognitive_lab_sessions',
  'sfi_cognitive_twin_decisions',
  'sfi_cognitive_twin_evaluations',
  'sfi_cognitive_twin_memory',
  'sfi_cognitive_twin_model_registry',
  'sfi_cognitive_twin_runs',
  'sfi_continuity_reports',
  'sfi_continuity_runs',
  'sfi_continuity_state',
  'sfi_cultural_references',
  'sfi_discovery_queries',
  'sfi_discovery_query_runs',
  'sfi_ejectors',
  'sfi_entity_collisions',
  'sfi_evidence_ledger',
  'sfi_evidence_trace',
  'sfi_execution_ledger',
  'sfi_execution_recovery_queue',
  'sfi_external_evidence_observations',
  'sfi_external_representations',
  'sfi_field_perturbations',
  'sfi_founder_decision_queue',
  'sfi_indicator_snapshots',
  'sfi_inference_traces',
  'sfi_institutional_experiments',
  'sfi_institutional_incidents',
  'sfi_instruments',
  'sfi_lab_analyses',
  'sfi_lessons',
  'sfi_moph_sessions',
  'sfi_oauth_authorization_codes',
  'sfi_operating_cycles',
  'sfi_operational_snapshots',
  'sfi_outcomes',
  'sfi_phenomena',
  'sfi_phenomenon_evidence',
  'sfi_phenomenon_trajectory_snapshots',
  'sfi_prediction_entries',
  'sfi_prediction_verifications',
  'sfi_predictive_evidence_requests',
  'sfi_predictive_learning_events',
  'sfi_predictive_models',
  'sfi_predictive_outcomes',
  'sfi_predictive_runs',
  'sfi_projects',
  'sfi_proposal_alignment',
  'sfi_proposal_repair_audit',
  'sfi_public_runtime_snapshots',
  'sfi_publications',
  'sfi_reference_cases',
  'sfi_regime_history',
  'sfi_system_qa',
  'sfi_user_attractors',
  'sfi_user_entitlements',
  'sfi_user_evidence_assessments',
  'sfi_user_graph_edges',
  'sfi_user_graph_nodes',
  'sfi_user_phenotype_profiles',
  'signal_manifestations',
  'studio_analysis_jobs',
  'studio_archive_events',
  'studio_audio_features',
  'studio_community_features',
  'studio_evidence_traces',
  'studio_exports',
  'studio_hypotheses',
  'studio_image_features',
  'studio_interventions',
  'studio_object_features',
  'studio_objects',
  'studio_sessions',
  'studio_text_features',
  'studio_time_coordinates',
  'studio_uploads',
  'studio_video_features',
  'usage_ledger',
];

export const CLASSIFIED_PUBLIC_TABLES = [
  ...PRESERVE_DATA_TABLES,
  ...RESEED_MINIMAL_TABLES,
  ...PURGE_DATA_TABLES,
];

const duplicateTables = CLASSIFIED_PUBLIC_TABLES.filter((table, index, all) => all.indexOf(table) !== index);
if (duplicateTables.length) {
  throw new Error(`Duplicate canonical reset classification: ${[...new Set(duplicateTables)].join(', ')}`);
}

export function classifyPublicTable(table) {
  if (PRESERVE_DATA_TABLES.includes(table)) return 'PRESERVE_DATA';
  if (RESEED_MINIMAL_TABLES.includes(table)) return 'RESEED_MINIMAL';
  if (PURGE_DATA_TABLES.includes(table)) return 'PURGE_DATA';
  return 'UNCLASSIFIED';
}

export function auditPublicTableClassification(liveTables) {
  const observed = [...new Set((liveTables ?? []).map(String))].sort();
  const known = new Set(CLASSIFIED_PUBLIC_TABLES);
  return {
    contract: SFI_CANONICAL_RESET_CONTRACT,
    observedTableCount: observed.length,
    classifiedTableCount: CLASSIFIED_PUBLIC_TABLES.length,
    preserveData: observed.filter((table) => classifyPublicTable(table) === 'PRESERVE_DATA'),
    reseedMinimal: observed.filter((table) => classifyPublicTable(table) === 'RESEED_MINIMAL'),
    purgeData: observed.filter((table) => classifyPublicTable(table) === 'PURGE_DATA'),
    unclassified: observed.filter((table) => !known.has(table)),
    classifiedButNotObserved: CLASSIFIED_PUBLIC_TABLES.filter((table) => !observed.includes(table)),
  };
}
