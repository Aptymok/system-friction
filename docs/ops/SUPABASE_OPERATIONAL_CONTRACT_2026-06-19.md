# Supabase Operational Contract - 2026-06-19

Generated at: 2026-06-19T07:42:03.268Z

Source queries: information_schema.columns, information_schema.table_constraints/key_column_usage/constraint_column_usage, pg_views.

## Tables and Columns

### account_balance

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | account_id | uuid | NO |  |
| 2 | balance | numeric | NO | 0 |
| 3 | reserved | numeric | NO | 0 |
| 4 | updated_at | timestamp with time zone | NO | now() |

### account_members

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | account_id | uuid | NO |  |
| 3 | user_id | uuid | NO |  |
| 4 | role | text | NO | 'member'::text |
| 5 | created_at | timestamp with time zone | NO | now() |

### accounts

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | slug | text | NO |  |
| 3 | name | text | NO |  |
| 4 | status | text | NO | 'active'::text |
| 5 | metadata | jsonb | NO | '{}'::jsonb |
| 6 | created_at | timestamp with time zone | NO | now() |
| 7 | updated_at | timestamp with time zone | NO | now() |

### action_proposals

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | node_id | uuid | YES |  |
| 3 | policy_decision_id | uuid | YES |  |
| 4 | event_id | uuid | YES |  |
| 5 | status | text | NO | 'draft'::text |
| 6 | title | text | NO |  |
| 7 | description | text | YES |  |
| 8 | expected_field_delta | jsonb | NO | '{}'::jsonb |
| 9 | risk_level | text | NO | 'low'::text |
| 10 | proportionality_check | jsonb | NO | '{}'::jsonb |
| 11 | approval_required | boolean | NO | true |
| 12 | approved_at | timestamp with time zone | YES |  |
| 13 | executed_at | timestamp with time zone | YES |  |
| 14 | outcome | jsonb | YES |  |
| 15 | created_at | timestamp with time zone | NO | now() |
| 16 | proposal_type | text | YES |  |
| 17 | objective | text | YES |  |
| 18 | updated_at | timestamp with time zone | NO | now() |

### backup_epistemic_events_20260618

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | YES |  |
| 2 | sequence | bigint | YES |  |
| 3 | event_id | text | YES |  |
| 4 | event_name | text | YES |  |
| 5 | logbook_id | text | YES |  |
| 6 | epistemic_class | text | YES |  |
| 7 | schema_version | text | YES |  |
| 8 | source | jsonb | YES |  |
| 9 | actor_id | text | YES |  |
| 10 | node_id | uuid | YES |  |
| 11 | confidence | numeric | YES |  |
| 12 | payload | jsonb | YES |  |
| 13 | checksum | text | YES |  |
| 14 | lineage | ARRAY | YES |  |
| 15 | uncertainty | text | YES |  |
| 16 | occurred_at | timestamp with time zone | YES |  |
| 17 | created_at | timestamp with time zone | YES |  |
| 18 | hash_prev | text | YES |  |
| 19 | hash_self | text | YES |  |

### backup_root_evidence_entries_20260618

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | YES |  |
| 2 | evidence_hash | text | YES |  |
| 3 | actor_id | uuid | YES |  |
| 4 | title | text | YES |  |
| 5 | content | text | YES |  |
| 6 | evidence_type | text | YES |  |
| 7 | target_node_id | text | YES |  |
| 8 | payload | jsonb | YES |  |
| 9 | epistemic_event_id | uuid | YES |  |
| 10 | created_at | timestamp with time zone | YES |  |

### backup_scorefriction_observations_20260618

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | YES |  |
| 2 | case_id | text | YES |  |
| 3 | source_name | text | YES |  |
| 4 | source_url | text | YES |  |
| 5 | territory | text | YES |  |
| 6 | raw_payload | jsonb | YES |  |
| 7 | normalized_payload | jsonb | YES |  |
| 8 | evidence_hash | text | YES |  |
| 9 | created_at | timestamp with time zone | YES |  |
| 10 | evidence_type | text | YES |  |
| 11 | reliability_score | numeric | YES |  |
| 12 | provenance_notes | text | YES |  |
| 13 | source_coverage_contribution | numeric | YES |  |

### backup_scorefriction_vectors_20260618

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | YES |  |
| 2 | observation_id | uuid | YES |  |
| 3 | acoustic_vector | jsonb | YES |  |
| 4 | semantic_vector | jsonb | YES |  |
| 5 | memetic_vector | jsonb | YES |  |
| 6 | platform_vector | jsonb | YES |  |
| 7 | mihm_cultural_vector | jsonb | YES |  |
| 8 | created_at | timestamp with time zone | YES |  |

### backup_worldspect_snapshots_20260618

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | YES |  |
| 2 | observed_at | timestamp with time zone | YES |  |
| 3 | created_at | timestamp with time zone | YES |  |
| 4 | source_state | text | YES |  |
| 5 | evidence_level | text | YES |  |
| 6 | confidence | numeric | YES |  |
| 7 | wsi | numeric | YES |  |
| 8 | nti | numeric | YES |  |
| 9 | degraded_sources | ARRAY | YES |  |
| 10 | sources | jsonb | YES |  |
| 11 | source_health | jsonb | YES |  |
| 12 | raw_payload | jsonb | YES |  |
| 13 | field_state_signal | jsonb | YES |  |
| 14 | adapter_status | text | YES |  |
| 15 | adapter_error | text | YES |  |
| 16 | ingest_mode | text | YES |  |
| 17 | snapshot_hash | text | YES |  |
| 18 | unique_date | date | YES |  |

### delta_decisions

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | kernel_cycle_id | uuid | YES |  |
| 3 | mihm_analysis_id | uuid | YES |  |
| 4 | event_id | uuid | YES |  |
| 5 | delta_vector | jsonb | NO | '{}'::jsonb |
| 6 | recommended_mode | text | NO |  |
| 7 | intensity | numeric | NO | 0 |
| 8 | explanation | text | YES |  |
| 9 | created_at | timestamp with time zone | NO | now() |

### epistemic_events

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | sequence | bigint | NO |  |
| 3 | event_id | text | NO |  |
| 4 | event_name | text | NO |  |
| 5 | logbook_id | text | NO |  |
| 6 | epistemic_class | text | NO |  |
| 7 | schema_version | text | NO |  |
| 8 | source | jsonb | NO | '{}'::jsonb |
| 9 | actor_id | text | YES |  |
| 10 | node_id | uuid | YES |  |
| 11 | confidence | numeric | NO | 0 |
| 12 | payload | jsonb | NO | '{}'::jsonb |
| 13 | checksum | text | NO |  |
| 14 | lineage | ARRAY | NO | '{}'::text[] |
| 15 | uncertainty | text | YES |  |
| 16 | occurred_at | timestamp with time zone | NO | now() |
| 17 | created_at | timestamp with time zone | NO | now() |
| 18 | hash_prev | text | YES |  |
| 19 | hash_self | text | NO |  |

### graph_edges

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | source_node_key | text | NO |  |
| 3 | target_node_key | text | NO |  |
| 4 | relation_type | text | NO |  |
| 5 | w_ij | numeric | NO | 0 |
| 6 | confidence | numeric | NO | 0 |
| 7 | evidence_ids | ARRAY | NO | '{}'::text[] |
| 8 | payload | jsonb | NO | '{}'::jsonb |
| 9 | created_at | timestamp with time zone | NO | now() |
| 10 | edge_id | text | YES |  |
| 11 | source_node_id | text | YES |  |
| 12 | target_node_id | text | YES |  |
| 13 | relation | text | YES |  |
| 14 | weight | numeric | NO | 0 |
| 15 | lineage | ARRAY | YES | '{}'::text[] |
| 16 | attributes | jsonb | NO | '{}'::jsonb |
| 17 | updated_at | timestamp with time zone | NO | now() |

### graph_nodes

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | node_key | text | NO |  |
| 3 | label | text | NO |  |
| 4 | node_type | text | NO |  |
| 5 | profile | text | NO | 'sfi'::text |
| 6 | q_n | numeric | NO | 0 |
| 7 | d_n | numeric | NO | 0 |
| 8 | co_n | numeric | NO | 1 |
| 9 | u_n | numeric | NO | 0 |
| 10 | origin | text | NO | 'system'::text |
| 11 | epistemic_class | text | NO | 'declared'::text |
| 12 | confidence | numeric | NO | 1 |
| 13 | payload | jsonb | NO | '{}'::jsonb |
| 14 | created_at | timestamp with time zone | NO | now() |
| 15 | updated_at | timestamp with time zone | NO | now() |
| 16 | node_id | text | YES |  |
| 17 | ontology_type | text | YES |  |
| 18 | lineage | ARRAY | YES | '{}'::text[] |
| 19 | attributes | jsonb | NO | '{}'::jsonb |

### kernel_cycles

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | worldspect_snapshot_id | uuid | YES |  |
| 3 | event_id | uuid | YES |  |
| 4 | status | text | NO | 'completed'::text |
| 5 | campo_state | jsonb | NO | '{}'::jsonb |
| 6 | mihm_state | jsonb | NO | '{}'::jsonb |
| 7 | delta_state | jsonb | NO | '{}'::jsonb |
| 8 | policy_state | jsonb | NO | '{}'::jsonb |
| 9 | created_at | timestamp with time zone | NO | now() |

### logbook_degradation

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | event_id | uuid | YES |  |
| 3 | node_key | text | NO |  |
| 4 | d_n | numeric | NO |  |
| 5 | co_n | numeric | YES |  |
| 6 | threshold_crossed | text | YES |  |
| 7 | intervention_required | boolean | NO | false |
| 8 | payload | jsonb | NO | '{}'::jsonb |
| 9 | created_at | timestamp with time zone | NO | now() |

### logbook_frictions

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | event_id | uuid | YES |  |
| 3 | friction_key | text | NO |  |
| 4 | involved_nodes | ARRAY | NO | '{}'::text[] |
| 5 | magnitude | numeric | NO | 0 |
| 6 | propagation | jsonb | NO | '{}'::jsonb |
| 7 | resolution_status | text | NO | 'open'::text |
| 8 | created_at | timestamp with time zone | NO | now() |

### logbook_knowledge

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | event_id | uuid | YES |  |
| 3 | knowledge_key | text | NO |  |
| 4 | pattern_type | text | NO |  |
| 5 | verified | boolean | NO | false |
| 6 | confidence | numeric | NO | 0 |
| 7 | supporting_events | ARRAY | NO | '{}'::text[] |
| 8 | payload | jsonb | NO | '{}'::jsonb |
| 9 | created_at | timestamp with time zone | NO | now() |

### logbook_links

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | event_id | uuid | YES |  |
| 3 | source_node_key | text | NO |  |
| 4 | target_node_key | text | NO |  |
| 5 | relation_type | text | NO |  |
| 6 | w_ij | numeric | NO | 0 |
| 7 | confidence | numeric | NO | 0 |
| 8 | evidence_ids | ARRAY | NO | '{}'::text[] |
| 9 | payload | jsonb | NO | '{}'::jsonb |
| 10 | created_at | timestamp with time zone | NO | now() |

### logbook_mutations

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | event_id | uuid | YES |  |
| 3 | mutation_key | text | NO |  |
| 4 | target | text | NO |  |
| 5 | current_state | jsonb | NO | '{}'::jsonb |
| 6 | proposed_state | jsonb | NO | '{}'::jsonb |
| 7 | coherence_delta | numeric | YES |  |
| 8 | status | text | NO | 'proposed'::text |
| 9 | created_at | timestamp with time zone | NO | now() |
| 10 | proposal_id | uuid | YES |  |
| 11 | actor_id | uuid | YES |  |
| 12 | mutation_type | text | YES |  |
| 13 | payload | jsonb | NO | '{}'::jsonb |
| 14 | updated_at | timestamp with time zone | NO | now() |

### logbook_nodes

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | event_id | uuid | YES |  |
| 3 | node_key | text | NO |  |
| 4 | node_type | text | NO |  |
| 5 | q_n | numeric | NO | 0 |
| 6 | co_n | numeric | NO | 1 |
| 7 | d_n | numeric | NO | 0 |
| 8 | status | text | NO | 'active'::text |
| 9 | payload | jsonb | NO | '{}'::jsonb |
| 10 | created_at | timestamp with time zone | NO | now() |

### logbook_regime

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | event_id | uuid | YES |  |
| 3 | regime_key | text | NO |  |
| 4 | previous_state | text | YES |  |
| 5 | next_state | text | NO |  |
| 6 | phi_campo | numeric | YES |  |
| 7 | causal_factor | text | YES |  |
| 8 | payload | jsonb | NO | '{}'::jsonb |
| 9 | created_at | timestamp with time zone | NO | now() |

### logbook_signals

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | event_id | uuid | YES |  |
| 3 | signal_key | text | NO |  |
| 4 | source_id | text | NO |  |
| 5 | plane | text | NO |  |
| 6 | node_type | text | NO |  |
| 7 | raw_signal | jsonb | NO | '{}'::jsonb |
| 8 | recurrence_count | integer | NO | 1 |
| 9 | status | text | NO | 'latent'::text |
| 10 | created_at | timestamp with time zone | NO | now() |

### mihm_analyses

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | node_id | uuid | YES |  |
| 3 | worldspect_snapshot_id | uuid | YES |  |
| 4 | kernel_cycle_id | uuid | YES |  |
| 5 | event_id | uuid | YES |  |
| 6 | input_kind | text | NO |  |
| 7 | input_ref | text | YES |  |
| 8 | visible_variables | jsonb | NO | '{}'::jsonb |
| 9 | sensitive_variables | jsonb | NO | '{}'::jsonb |
| 10 | homeostatic_vector | jsonb | NO | '{}'::jsonb |
| 11 | confidence | numeric | NO | 0 |
| 12 | uncertainty | text | YES |  |
| 13 | created_at | timestamp with time zone | NO | now() |

### nodes

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | user_id | uuid | YES |  |
| 3 | label | text | NO |  |
| 4 | node_type | text | NO |  |
| 5 | is_acp | boolean | NO | false |
| 6 | objective | text | YES |  |
| 7 | current_ihg | numeric | NO | 0 |
| 8 | current_nti | numeric | NO | 0.5 |
| 9 | current_ldi | numeric | NO | 0 |
| 10 | current_phi | numeric | NO | 0.5 |
| 11 | current_degradation | numeric | NO | 0 |
| 12 | current_capacity | numeric | NO | 1 |
| 13 | payload | jsonb | NO | '{}'::jsonb |
| 14 | created_at | timestamp with time zone | NO | now() |
| 15 | updated_at | timestamp with time zone | NO | now() |
| 16 | source | text | NO | 'web'::text |

### persistent_signals

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | signal_hash | text | NO |  |
| 3 | label | text | YES |  |
| 4 | description | text | YES |  |
| 5 | scope | text | NO | 'sfi'::text |
| 6 | state | text | NO | 'latent'::text |
| 7 | first_seen | timestamp with time zone | NO | now() |
| 8 | last_seen | timestamp with time zone | NO | now() |
| 9 | occurrence_count | integer | NO | 0 |
| 10 | modalities | jsonb | NO | '[]'::jsonb |
| 11 | persistence_score | numeric | NO | 0 |
| 12 | cross_modal_score | numeric | NO | 0 |
| 13 | drift_score | numeric | NO | 0 |
| 14 | entropy_score | numeric | NO | 0 |
| 15 | mihm_snapshot | jsonb | YES |  |
| 16 | worldspect_snapshot | jsonb | YES |  |
| 17 | supporting_vectors | jsonb | NO | '[]'::jsonb |
| 18 | metadata | jsonb | NO | '{}'::jsonb |
| 19 | created_at | timestamp with time zone | NO | now() |
| 20 | updated_at | timestamp with time zone | NO | now() |

### policy_decisions

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | delta_decision_id | uuid | YES |  |
| 3 | event_id | uuid | YES |  |
| 4 | allow_llm | boolean | NO | false |
| 5 | allow_proposal | boolean | NO | false |
| 6 | allow_execution | boolean | NO | false |
| 7 | requires_approval | boolean | NO | true |
| 8 | max_tokens | integer | NO | 0 |
| 9 | reason | text | YES |  |
| 10 | payload | jsonb | NO | '{}'::jsonb |
| 11 | created_at | timestamp with time zone | NO | now() |

### profiles

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | user_id | uuid | NO |  |
| 2 | email | text | YES |  |
| 3 | alias | text | YES |  |
| 4 | role | text | NO | 'operator'::text |
| 5 | subscription_tier | text | NO | 'solo'::text |
| 6 | module_access | jsonb | NO | '{}'::jsonb |
| 7 | last_seen_at | timestamp with time zone | YES |  |
| 8 | created_at | timestamp with time zone | NO | now() |
| 9 | updated_at | timestamp with time zone | NO | now() |

### root_audit_events

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | actor_id | uuid | YES |  |
| 3 | action | text | NO |  |
| 4 | target | text | YES |  |
| 5 | payload | jsonb | NO | '{}'::jsonb |
| 6 | ip_address | text | YES |  |
| 7 | user_agent | text | YES |  |
| 8 | created_at | timestamp with time zone | NO | now() |

### root_evidence_entries

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | evidence_hash | text | NO |  |
| 3 | actor_id | uuid | YES |  |
| 4 | title | text | NO |  |
| 5 | content | text | NO |  |
| 6 | evidence_type | text | NO | 'root_evidence'::text |
| 7 | target_node_id | text | YES |  |
| 8 | payload | jsonb | NO | '{}'::jsonb |
| 9 | epistemic_event_id | uuid | YES |  |
| 10 | created_at | timestamp with time zone | NO | now() |

### scorefriction_case_studies

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | case_id | text | NO |  |
| 2 | name | text | NO |  |
| 3 | phenomenon | text | YES |  |
| 4 | friction | text | YES |  |
| 5 | hypothesis | text | YES |  |
| 6 | status | text | YES | 'active'::text |
| 7 | created_at | timestamp with time zone | YES | now() |

### scorefriction_observations

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | case_id | text | YES |  |
| 3 | source_name | text | YES |  |
| 4 | source_url | text | YES |  |
| 5 | territory | text | YES | 'MX'::text |
| 6 | raw_payload | jsonb | YES |  |
| 7 | normalized_payload | jsonb | YES |  |
| 8 | evidence_hash | text | YES |  |
| 9 | created_at | timestamp with time zone | YES | now() |
| 10 | evidence_type | text | YES |  |
| 11 | reliability_score | numeric | YES | 0.5 |
| 12 | provenance_notes | text | YES |  |
| 13 | source_coverage_contribution | numeric | YES | 0.05 |
| 14 | object_presence | text | YES | 'unknown'::text |
| 15 | analysis_status | text | YES | 'unreviewed'::text |
| 16 | canonical_status | text | YES | 'unreviewed'::text |
| 17 | rejection_reason | text | YES |  |
| 18 | trace | jsonb | YES | '{}'::jsonb |

### scorefriction_prototypes

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | case_id | text | YES |  |
| 3 | prototype_name | text | YES |  |
| 4 | prompt | jsonb | YES |  |
| 5 | lyrics | text | YES |  |
| 6 | production_brief | jsonb | YES |  |
| 7 | generated_artifact_url | text | YES |  |
| 8 | created_at | timestamp with time zone | YES | now() |

### scorefriction_sources

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | source_name | text | NO |  |
| 3 | source_type | text | NO |  |
| 4 | access_mode | text | NO |  |
| 5 | reliability_score | numeric | YES | 0.5 |
| 6 | rate_limit_notes | text | YES |  |
| 7 | legal_notes | text | YES |  |
| 8 | created_at | timestamp with time zone | YES | now() |

### scorefriction_vectors

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | observation_id | uuid | YES |  |
| 3 | acoustic_vector | jsonb | YES |  |
| 4 | semantic_vector | jsonb | YES |  |
| 5 | memetic_vector | jsonb | YES |  |
| 6 | platform_vector | jsonb | YES |  |
| 7 | mihm_cultural_vector | jsonb | YES |  |
| 8 | created_at | timestamp with time zone | YES | now() |

### scorefriction_verifications

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | prototype_id | uuid | YES |  |
| 3 | platform | text | YES |  |
| 4 | metrics | jsonb | YES |  |
| 5 | interpretation | jsonb | YES |  |
| 6 | verified_at | timestamp with time zone | YES | now() |

### sfi_amv_memory

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | session_id | text | YES |  |
| 3 | module | text | NO |  |
| 4 | input_hash | text | NO |  |
| 5 | input_summary | text | NO |  |
| 6 | inference | jsonb | NO | '{}'::jsonb |
| 7 | decision | jsonb | NO | '{}'::jsonb |
| 8 | output_summary | text | NO |  |
| 9 | evaluation | jsonb | NO | '{}'::jsonb |
| 10 | memory_delta | jsonb | NO | '{}'::jsonb |
| 11 | uncertainty | numeric | NO | 1 |
| 12 | source_trust | numeric | NO | 0 |
| 13 | requires_human_validation | boolean | NO | false |
| 14 | created_at | timestamp with time zone | NO | now() |

### sfi_capability_checks

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | perturbation_id | uuid | YES |  |
| 3 | case_id | text | YES |  |
| 4 | capabilities_required | jsonb | NO | '[]'::jsonb |
| 5 | capabilities_available | jsonb | NO | '[]'::jsonb |
| 6 | capabilities_missing | jsonb | NO | '[]'::jsonb |
| 7 | capability_gap | numeric | NO | 0 |
| 8 | executable | boolean | NO | false |
| 9 | notes | text | YES |  |
| 10 | created_at | timestamp with time zone | NO | now() |

### sfi_declared_attractors

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | title | text | NO |  |
| 3 | desired_future_state | text | NO |  |
| 4 | active | boolean | NO | true |
| 5 | priority | numeric | NO | 1 |
| 6 | horizon | text | YES |  |
| 7 | success_markers | jsonb | NO | '[]'::jsonb |
| 8 | constraints | jsonb | NO | '{}'::jsonb |
| 9 | created_at | timestamp with time zone | NO | now() |
| 10 | updated_at | timestamp with time zone | NO | now() |

### sfi_evidence_trace

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | domain | text | NO |  |
| 3 | evidence_side | text | NO |  |
| 4 | source_table | text | NO |  |
| 5 | source_id | text | NO |  |
| 6 | source_label | text | YES |  |
| 7 | evidence_hash | text | YES |  |
| 8 | observed_at | timestamp with time zone | YES |  |
| 9 | payload | jsonb | YES | '{}'::jsonb |
| 10 | created_at | timestamp with time zone | YES | now() |

### sfi_execution_ledger

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | perturbation_id | uuid | YES |  |
| 3 | case_id | text | NO |  |
| 4 | actor | text | NO | 'system'::text |
| 5 | artifact_type | text | NO |  |
| 6 | artifact_url | text | YES |  |
| 7 | artifact_hash | text | YES |  |
| 8 | execution_status | text | NO | 'generated'::text |
| 9 | verification_status | text | NO | 'unverified'::text |
| 10 | executed_at | timestamp with time zone | YES |  |
| 11 | source_payload | jsonb | NO | '{}'::jsonb |
| 12 | created_at | timestamp with time zone | NO | now() |

### sfi_execution_recovery_queue

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | proposal_id | uuid | YES |  |
| 3 | title | text | YES |  |
| 4 | status | text | YES |  |
| 5 | proposal_type | text | YES |  |
| 6 | objective | text | YES |  |
| 7 | risk_level | text | YES |  |
| 8 | approved_at | timestamp with time zone | YES |  |
| 9 | executed_at | timestamp with time zone | YES |  |
| 10 | recovery_status | text | YES | 'pending_review'::text |
| 11 | recovery_reason | text | YES |  |
| 12 | created_at | timestamp with time zone | YES | now() |

### sfi_field_perturbations

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | case_id | text | NO |  |
| 3 | source_observation_id | text | YES |  |
| 4 | source_vector_id | text | YES |  |
| 5 | proposal_id | text | YES |  |
| 6 | perturbation_type | text | NO | 'campaign'::text |
| 7 | target_domain | text | YES |  |
| 8 | target_audience | text | YES |  |
| 9 | minimal_action | text | NO |  |
| 10 | expected_effect | text | YES |  |
| 11 | risk_level | text | NO | 'medium'::text |
| 12 | status | text | NO | 'candidate'::text |
| 13 | source_pipeline | jsonb | NO | '{}'::jsonb |
| 14 | created_at | timestamp with time zone | NO | now() |

### sfi_lessons

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | outcome_id | uuid | YES |  |
| 3 | case_id | text | YES |  |
| 4 | lesson | text | NO |  |
| 5 | updates_direction_engine | boolean | NO | false |
| 6 | updates_risk_engine | boolean | NO | false |
| 7 | updates_capability_engine | boolean | NO | false |
| 8 | atlas_update | boolean | NO | true |
| 9 | created_at | timestamp with time zone | NO | now() |

### sfi_media_assets

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | case_id | text | NO |  |
| 3 | provider_used | text | NO |  |
| 4 | fallback_used | boolean | NO | false |
| 5 | asset_type | text | NO |  |
| 6 | file_url | text | NO |  |
| 7 | file_path | text | YES |  |
| 8 | prompt | text | YES |  |
| 9 | source_pipeline | jsonb | NO | '{}'::jsonb |
| 10 | created_at | timestamp with time zone | NO | now() |

### sfi_operational_snapshots

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | observed_at | timestamp with time zone | NO | now() |
| 3 | signal_events | integer | YES |  |
| 4 | technical_events | integer | YES |  |
| 5 | signal_ratio | numeric | YES |  |
| 6 | technical_ratio | numeric | YES |  |
| 7 | operational_regime | text | YES |  |
| 8 | worldspect_snapshots | integer | YES |  |
| 9 | scorefriction_observations | integer | YES |  |
| 10 | scorefriction_vectors | integer | YES |  |
| 11 | proposals_approved | integer | YES |  |
| 12 | executions_prepared | integer | YES |  |
| 13 | outcomes_recorded | integer | YES |  |
| 14 | internal_evidence_count | integer | YES |  |
| 15 | external_evidence_count | integer | YES |  |
| 16 | interpretation | text | YES |  |

### sfi_outcomes

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | execution_id | uuid | YES |  |
| 3 | case_id | text | YES |  |
| 4 | outcome_status | text | NO | 'pending'::text |
| 5 | observed_effect | jsonb | NO | '{}'::jsonb |
| 6 | unexpected_effects | jsonb | NO | '[]'::jsonb |
| 7 | prediction_accuracy | numeric | YES |  |
| 8 | created_at | timestamp with time zone | NO | now() |

### sfi_proposal_alignment

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | proposal_id | uuid | YES |  |
| 3 | attractor_id | uuid | YES |  |
| 4 | alignment_score | numeric | YES |  |
| 5 | evidence_score | numeric | YES |  |
| 6 | regime_fit_score | numeric | YES |  |
| 7 | execution_value_score | numeric | YES |  |
| 8 | recovery_cost_score | numeric | YES |  |
| 9 | risk_score | numeric | YES |  |
| 10 | recommended_status | text | YES |  |
| 11 | recommendation | text | YES |  |
| 12 | alternative_perturbation | text | YES |  |
| 13 | rationale | text | YES |  |
| 14 | override_reason | text | YES |  |
| 15 | expected_cost | text | YES |  |
| 16 | created_at | timestamp with time zone | NO | now() |

### sfi_regime_history

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | observed_at | timestamp with time zone | YES | now() |
| 3 | regime | text | YES |  |
| 4 | stability_index | numeric | YES |  |

### sfi_scorefriction_observability

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | observation_id | uuid | YES |  |
| 2 | case_id | text | YES |  |
| 3 | source_name | text | YES |  |
| 4 | territory | text | YES |  |
| 5 | evidence_hash | text | YES |  |
| 6 | created_at | timestamp with time zone | YES |  |
| 7 | mihm_cultural_vector | jsonb | YES |  |
| 8 | platform_vector | jsonb | YES |  |
| 9 | lcp | numeric | YES |  |
| 10 | pac | numeric | YES |  |
| 11 | vfe | numeric | YES |  |
| 12 | scr | numeric | YES |  |
| 13 | fs_c | numeric | YES |  |

### sfi_system_qa

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | qa_name | text | NO |  |
| 3 | ok | boolean | NO |  |
| 4 | failures | jsonb | YES | '[]'::jsonb |
| 5 | metrics | jsonb | YES | '{}'::jsonb |
| 6 | created_at | timestamp with time zone | YES | now() |

### signal_manifestations

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | signal_id | uuid | NO |  |
| 3 | source_type | text | NO |  |
| 4 | source_id | text | YES |  |
| 5 | modality | text | NO |  |
| 6 | content_hash | text | YES |  |
| 7 | embedding | jsonb | YES |  |
| 8 | similarity | numeric | NO | 0 |
| 9 | observed_at | timestamp with time zone | NO | now() |
| 10 | payload | jsonb | NO | '{}'::jsonb |
| 11 | created_at | timestamp with time zone | NO | now() |

### usage_ledger

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | account_id | uuid | NO |  |
| 3 | actor_id | uuid | YES |  |
| 4 | event_id | uuid | YES |  |
| 5 | kind | text | NO |  |
| 6 | amount | numeric | NO | 0 |
| 7 | unit | text | NO | 'credit'::text |
| 8 | metadata | jsonb | NO | '{}'::jsonb |
| 9 | created_at | timestamp with time zone | NO | now() |

### vw_epistemic_signal

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | event_name | text | YES |  |
| 2 | epistemic_class | text | YES |  |
| 3 | source_id | text | YES |  |
| 4 | source_type | text | YES |  |
| 5 | total | bigint | YES |  |
| 6 | first_at | timestamp with time zone | YES |  |
| 7 | last_at | timestamp with time zone | YES |  |
| 8 | avg_confidence | numeric | YES |  |

### vw_operational_regime

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | regime | text | YES |  |
| 2 | observed_at | timestamp with time zone | YES |  |

### vw_pipeline_stability

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | signal_events | bigint | YES |  |
| 2 | technical_events | bigint | YES |  |
| 3 | signal_ratio | numeric | YES |  |
| 4 | technical_ratio | numeric | YES |  |
| 5 | observed_at | timestamp with time zone | YES |  |

### vw_root_technical_audit

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | event_name | text | YES |  |
| 2 | epistemic_class | text | YES |  |
| 3 | source_id | text | YES |  |
| 4 | source_type | text | YES |  |
| 5 | total | bigint | YES |  |
| 6 | first_at | timestamp with time zone | YES |  |
| 7 | last_at | timestamp with time zone | YES |  |
| 8 | avg_confidence | numeric | YES |  |

### vw_scorefriction_real

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | YES |  |
| 2 | case_id | text | YES |  |
| 3 | created_at | timestamp with time zone | YES |  |
| 4 | source_name | text | YES |  |
| 5 | source_url | text | YES |  |
| 6 | territory | text | YES |  |
| 7 | evidence_type | text | YES |  |
| 8 | reliability_score | numeric | YES |  |
| 9 | object_presence | text | YES |  |
| 10 | analysis_status | text | YES |  |
| 11 | canonical_status | text | YES |  |
| 12 | rejection_reason | text | YES |  |
| 13 | evidence_hash | text | YES |  |
| 14 | acoustic_vector | jsonb | YES |  |
| 15 | semantic_vector | jsonb | YES |  |
| 16 | memetic_vector | jsonb | YES |  |
| 17 | platform_vector | jsonb | YES |  |
| 18 | mihm_cultural_vector | jsonb | YES |  |

### vw_sfi_attractor_alignment_queue

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | proposal_id | uuid | YES |  |
| 2 | proposal_title | text | YES |  |
| 3 | proposal_objective | text | YES |  |
| 4 | active_attractor | text | YES |  |
| 5 | attractor_id | uuid | YES |  |
| 6 | alignment_score | numeric | YES |  |
| 7 | evidence_score | numeric | YES |  |
| 8 | regime_fit_score | numeric | YES |  |
| 9 | recovery_cost_score | numeric | YES |  |
| 10 | recommended_status | text | YES |  |
| 11 | recommendation | text | YES |  |
| 12 | alternative_perturbation | text | YES |  |
| 13 | rationale | text | YES |  |

### vw_sfi_closed_loop_state

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | proposals_approved | numeric | YES |  |
| 2 | execution_plans_created | numeric | YES |  |
| 3 | executions_executed | numeric | YES |  |
| 4 | outcomes_recorded | numeric | YES |  |
| 5 | proposal_to_execution_ratio | numeric | YES |  |
| 6 | execution_to_outcome_ratio | numeric | YES |  |
| 7 | closed_loop_ratio | numeric | YES |  |
| 8 | current_bottleneck | text | YES |  |
| 9 | interpretation | text | YES |  |

### vw_sfi_evidence_map

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | domain | text | YES |  |
| 2 | evidence_side | text | YES |  |
| 3 | source_table | text | YES |  |
| 4 | source_label | text | YES |  |
| 5 | evidence_count | bigint | YES |  |
| 6 | first_seen | timestamp with time zone | YES |  |
| 7 | last_seen | timestamp with time zone | YES |  |

### vw_sfi_execution_recovery_queue

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | YES |  |
| 2 | proposal_id | uuid | YES |  |
| 3 | title | text | YES |  |
| 4 | status | text | YES |  |
| 5 | proposal_type | text | YES |  |
| 6 | objective | text | YES |  |
| 7 | risk_level | text | YES |  |
| 8 | approved_at | timestamp with time zone | YES |  |
| 9 | executed_at | timestamp with time zone | YES |  |
| 10 | recovery_status | text | YES |  |
| 11 | recovery_reason | text | YES |  |
| 12 | created_at | timestamp with time zone | YES |  |

### vw_sfi_operational_cycle

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | observed_at | timestamp with time zone | YES |  |
| 2 | signal_events | bigint | YES |  |
| 3 | technical_events | bigint | YES |  |
| 4 | signal_ratio | numeric | YES |  |
| 5 | technical_ratio | numeric | YES |  |
| 6 | operational_regime | text | YES |  |
| 7 | worldspect_snapshots | bigint | YES |  |
| 8 | worldspect_avg_source_coverage | numeric | YES |  |
| 9 | worldspect_last_observed_at | timestamp with time zone | YES |  |
| 10 | scorefriction_observations | bigint | YES |  |
| 11 | scorefriction_vectors | bigint | YES |  |
| 12 | scorefriction_last_observed_at | timestamp with time zone | YES |  |
| 13 | cognitive_events | numeric | YES |  |
| 14 | acp_events | numeric | YES |  |
| 15 | mutation_events | numeric | YES |  |
| 16 | governance_events | numeric | YES |  |
| 17 | proposals_approved | numeric | YES |  |
| 18 | executions_prepared | numeric | YES |  |
| 19 | outcomes_recorded | numeric | YES |  |
| 20 | internal_evidence_count | bigint | YES |  |
| 21 | external_evidence_count | bigint | YES |  |
| 22 | interpretation | text | YES |  |

### vw_sfi_perturbation_history

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | perturbation_id | uuid | YES |  |
| 2 | case_id | text | YES |  |
| 3 | minimal_action | text | YES |  |
| 4 | expected_effect | text | YES |  |
| 5 | perturbation_status | text | YES |  |
| 6 | execution_id | uuid | YES |  |
| 7 | execution_status | text | YES |  |
| 8 | verification_status | text | YES |  |
| 9 | outcome_id | uuid | YES |  |
| 10 | outcome_status | text | YES |  |
| 11 | observed_effect | jsonb | YES |  |
| 12 | created_at | timestamp with time zone | YES |  |

### vw_sfi_pipeline_loss

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | observed_at | timestamp with time zone | YES |  |
| 2 | approved | numeric | YES |  |
| 3 | prepared | numeric | YES |  |
| 4 | outcome_recorded | numeric | YES |  |
| 5 | loss_approved_to_prepared | numeric | YES |  |
| 6 | loss_prepared_to_outcome | numeric | YES |  |
| 7 | prepared_ratio | numeric | YES |  |
| 8 | outcome_ratio | numeric | YES |  |
| 9 | bottleneck | text | YES |  |
| 10 | interpretation | text | YES |  |

### vw_sfi_reality_console_state

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | read_at | timestamp with time zone | YES |  |
| 2 | operational_cycle | json | YES |  |
| 3 | stability | json | YES |  |
| 4 | pipeline_loss | json | YES |  |
| 5 | closed_loop | json | YES |  |
| 6 | active_attractor | json | YES |  |

### vw_sfi_rehydration_status

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | epistemic_events | bigint | YES |  |
| 2 | worldspect_snapshots | bigint | YES |  |
| 3 | scorefriction_observations | bigint | YES |  |
| 4 | scorefriction_vectors | bigint | YES |  |
| 5 | evidence_trace | bigint | YES |  |
| 6 | backup_epistemic_events | bigint | YES |  |
| 7 | checked_at | timestamp with time zone | YES |  |

### vw_sfi_stability

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | observed_at | timestamp with time zone | YES |  |
| 2 | signal_ratio | numeric | YES |  |
| 3 | technical_ratio | numeric | YES |  |
| 4 | proposals_approved | numeric | YES |  |
| 5 | executions_prepared | numeric | YES |  |
| 6 | outcomes_recorded | numeric | YES |  |
| 7 | stability_index | numeric | YES |  |
| 8 | stability_regime | text | YES |  |

### vw_worldspect_real

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | YES |  |
| 2 | observed_at | timestamp with time zone | YES |  |
| 3 | created_at | timestamp with time zone | YES |  |
| 4 | source_state | text | YES |  |
| 5 | evidence_level | text | YES |  |
| 6 | regime | text | YES |  |
| 7 | wsi | numeric | YES |  |
| 8 | nti | numeric | YES |  |
| 9 | source_coverage | numeric | YES |  |
| 10 | source_mix | jsonb | YES |  |
| 11 | degraded_sources | ARRAY | YES |  |
| 12 | sources | jsonb | YES |  |
| 13 | source_health | jsonb | YES |  |
| 14 | interpretation | text | YES |  |

### worldspect_snapshots

| ordinal_position | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | observed_at | timestamp with time zone | NO |  |
| 3 | created_at | timestamp with time zone | NO | now() |
| 4 | source_state | text | NO |  |
| 5 | evidence_level | text | NO |  |
| 6 | confidence | numeric | NO | 0 |
| 7 | wsi | numeric | YES |  |
| 8 | nti | numeric | YES |  |
| 9 | degraded_sources | ARRAY | NO | '{}'::text[] |
| 10 | sources | jsonb | NO | '[]'::jsonb |
| 11 | source_health | jsonb | NO | '[]'::jsonb |
| 12 | raw_payload | jsonb | NO | '{}'::jsonb |
| 13 | field_state_signal | jsonb | YES |  |
| 14 | adapter_status | text | NO | 'observed'::text |
| 15 | adapter_error | text | YES |  |
| 16 | ingest_mode | text | NO | 'daily_cron'::text |
| 17 | snapshot_hash | text | NO |  |
| 18 | unique_date | date | YES |  |
| 19 | regime | text | YES |  |
| 20 | vectors | jsonb | YES | '[]'::jsonb |
| 21 | source_coverage | numeric | YES |  |
| 22 | source_mix | jsonb | YES | '{}'::jsonb |
| 23 | trace_coverage | jsonb | YES | '{}'::jsonb |
| 24 | interpretation | text | YES |  |

## Foreign Keys

| table_name | column_name | foreign_table_name | foreign_column_name | constraint_name |
| --- | --- | --- | --- | --- |
| account_balance | account_id | accounts | id | account_balance_account_id_fkey |
| account_members | account_id | accounts | id | account_members_account_id_fkey |
| action_proposals | event_id | epistemic_events | id | action_proposals_event_id_fkey |
| action_proposals | node_id | nodes | id | action_proposals_node_id_fkey |
| action_proposals | policy_decision_id | policy_decisions | id | action_proposals_policy_decision_id_fkey |
| delta_decisions | event_id | epistemic_events | id | delta_decisions_event_id_fkey |
| delta_decisions | kernel_cycle_id | kernel_cycles | id | delta_decisions_kernel_cycle_id_fkey |
| delta_decisions | mihm_analysis_id | mihm_analyses | id | delta_decisions_mihm_analysis_id_fkey |
| graph_edges | source_node_key | graph_nodes | node_key | graph_edges_source_node_key_fkey |
| graph_edges | target_node_key | graph_nodes | node_key | graph_edges_target_node_key_fkey |
| kernel_cycles | event_id | epistemic_events | id | kernel_cycles_event_id_fkey |
| kernel_cycles | worldspect_snapshot_id | worldspect_snapshots | id | kernel_cycles_worldspect_snapshot_id_fkey |
| logbook_degradation | event_id | epistemic_events | id | logbook_degradation_event_id_fkey |
| logbook_frictions | event_id | epistemic_events | id | logbook_frictions_event_id_fkey |
| logbook_knowledge | event_id | epistemic_events | id | logbook_knowledge_event_id_fkey |
| logbook_links | event_id | epistemic_events | id | logbook_links_event_id_fkey |
| logbook_mutations | event_id | epistemic_events | id | logbook_mutations_event_id_fkey |
| logbook_nodes | event_id | epistemic_events | id | logbook_nodes_event_id_fkey |
| logbook_regime | event_id | epistemic_events | id | logbook_regime_event_id_fkey |
| logbook_signals | event_id | epistemic_events | id | logbook_signals_event_id_fkey |
| mihm_analyses | event_id | epistemic_events | id | mihm_analyses_event_id_fkey |
| mihm_analyses | kernel_cycle_id | kernel_cycles | id | mihm_analyses_kernel_cycle_id_fkey |
| mihm_analyses | node_id | nodes | id | mihm_analyses_node_id_fkey |
| mihm_analyses | worldspect_snapshot_id | worldspect_snapshots | id | mihm_analyses_worldspect_snapshot_id_fkey |
| policy_decisions | delta_decision_id | delta_decisions | id | policy_decisions_delta_decision_id_fkey |
| policy_decisions | event_id | epistemic_events | id | policy_decisions_event_id_fkey |
| scorefriction_prototypes | case_id | scorefriction_case_studies | case_id | scorefriction_prototypes_case_id_fkey |
| scorefriction_vectors | observation_id | scorefriction_observations | id | scorefriction_vectors_observation_id_fkey |
| scorefriction_verifications | prototype_id | scorefriction_prototypes | id | scorefriction_verifications_prototype_id_fkey |
| sfi_capability_checks | perturbation_id | sfi_field_perturbations | id | sfi_capability_checks_perturbation_id_fkey |
| sfi_execution_ledger | perturbation_id | sfi_field_perturbations | id | sfi_execution_ledger_perturbation_id_fkey |
| sfi_lessons | outcome_id | sfi_outcomes | id | sfi_lessons_outcome_id_fkey |
| sfi_outcomes | execution_id | sfi_execution_ledger | id | sfi_outcomes_execution_id_fkey |
| sfi_proposal_alignment | attractor_id | sfi_declared_attractors | id | sfi_proposal_alignment_attractor_id_fkey |
| sfi_proposal_alignment | proposal_id | action_proposals | id | sfi_proposal_alignment_proposal_id_fkey |
| signal_manifestations | signal_id | persistent_signals | id | signal_manifestations_signal_id_fkey |
| usage_ledger | account_id | accounts | id | usage_ledger_account_id_fkey |

## Views

### sfi_scorefriction_observability

```sql
 SELECT o.id AS observation_id,
    o.case_id,
    o.source_name,
    o.territory,
    o.evidence_hash,
    o.created_at,
    v.mihm_cultural_vector,
    v.platform_vector,
        CASE
            WHEN ((v.mihm_cultural_vector ->> 'LCP'::text) ~ '^-?[0-9]+(\.[0-9]+)?$'::text) THEN ((v.mihm_cultural_vector ->> 'LCP'::text))::numeric
            ELSE NULL::numeric
        END AS lcp,
        CASE
            WHEN ((v.mihm_cultural_vector ->> 'PAC'::text) ~ '^-?[0-9]+(\.[0-9]+)?$'::text) THEN ((v.mihm_cultural_vector ->> 'PAC'::text))::numeric
            ELSE NULL::numeric
        END AS pac,
        CASE
            WHEN ((v.mihm_cultural_vector ->> 'VFE'::text) ~ '^-?[0-9]+(\.[0-9]+)?$'::text) THEN ((v.mihm_cultural_vector ->> 'VFE'::text))::numeric
            ELSE NULL::numeric
        END AS vfe,
        CASE
            WHEN ((v.mihm_cultural_vector ->> 'SCR'::text) ~ '^-?[0-9]+(\.[0-9]+)?$'::text) THEN ((v.mihm_cultural_vector ->> 'SCR'::text))::numeric
            ELSE NULL::numeric
        END AS scr,
        CASE
            WHEN ((v.mihm_cultural_vector ->> 'FS_C'::text) ~ '^-?[0-9]+(\.[0-9]+)?$'::text) THEN ((v.mihm_cultural_vector ->> 'FS_C'::text))::numeric
            ELSE NULL::numeric
        END AS fs_c
   FROM (scorefriction_observations o
     LEFT JOIN scorefriction_vectors v ON ((v.observation_id = o.id)));
```

### vw_epistemic_signal

```sql
 SELECT event_name,
    epistemic_class,
    (source ->> 'sourceId'::text) AS source_id,
    (source ->> 'sourceType'::text) AS source_type,
    count(*) AS total,
    min(created_at) AS first_at,
    max(created_at) AS last_at,
    avg(confidence) AS avg_confidence
   FROM epistemic_events
  WHERE (event_name !~~ 'root.%'::text)
  GROUP BY event_name, epistemic_class, (source ->> 'sourceId'::text), (source ->> 'sourceType'::text)
  ORDER BY (count(*)) DESC;
```

### vw_operational_regime

```sql
 SELECT
        CASE
            WHEN (( SELECT count(*) AS count
               FROM epistemic_events
              WHERE (epistemic_events.event_name = 'governance.blind_mode.blocked'::text)) > ( SELECT count(*) AS count
               FROM epistemic_events
              WHERE (epistemic_events.event_name = 'mutation.accepted'::text))) THEN 'GOVERNANCE_DOMINANT'::text
            WHEN (( SELECT count(*) AS count
               FROM epistemic_events
              WHERE (epistemic_events.event_name = 'mutation.accepted'::text)) > ( SELECT count(*) AS count
               FROM epistemic_events
              WHERE (epistemic_events.event_name = 'acp.proposal.approved'::text))) THEN 'MUTATION_DOMINANT'::text
            ELSE 'EXECUTION_DOMINANT'::text
        END AS regime,
    now() AS observed_at;
```

### vw_pipeline_stability

```sql
 WITH signals AS (
         SELECT count(*) AS n
           FROM epistemic_events
          WHERE (epistemic_events.event_name !~~ 'root.%'::text)
        ), technical AS (
         SELECT count(*) AS n
           FROM epistemic_events
          WHERE (epistemic_events.event_name ~~ 'root.%'::text)
        )
 SELECT signals.n AS signal_events,
    technical.n AS technical_events,
    round(((signals.n)::numeric / (NULLIF((signals.n + technical.n), 0))::numeric), 4) AS signal_ratio,
    round(((technical.n)::numeric / (NULLIF((signals.n + technical.n), 0))::numeric), 4) AS technical_ratio,
    now() AS observed_at
   FROM signals,
    technical;
```

### vw_root_technical_audit

```sql
 SELECT event_name,
    epistemic_class,
    (source ->> 'sourceId'::text) AS source_id,
    (source ->> 'sourceType'::text) AS source_type,
    count(*) AS total,
    min(created_at) AS first_at,
    max(created_at) AS last_at,
    avg(confidence) AS avg_confidence
   FROM epistemic_events
  WHERE (event_name ~~ 'root.%'::text)
  GROUP BY event_name, epistemic_class, (source ->> 'sourceId'::text), (source ->> 'sourceType'::text)
  ORDER BY (count(*)) DESC;
```

### vw_scorefriction_real

```sql
 SELECT o.id,
    o.case_id,
    o.created_at,
    o.source_name,
    o.source_url,
    o.territory,
    o.evidence_type,
    o.reliability_score,
    o.object_presence,
    o.analysis_status,
    o.canonical_status,
    o.rejection_reason,
    o.evidence_hash,
    v.acoustic_vector,
    v.semantic_vector,
    v.memetic_vector,
    v.platform_vector,
    v.mihm_cultural_vector
   FROM (scorefriction_observations o
     LEFT JOIN scorefriction_vectors v ON ((v.observation_id = o.id)))
  WHERE (o.canonical_status = ANY (ARRAY['candidate'::text, 'accepted'::text, 'unreviewed'::text]))
  ORDER BY o.created_at DESC;
```

### vw_sfi_attractor_alignment_queue

```sql
 WITH active_attractor AS (
         SELECT sfi_declared_attractors.id,
            sfi_declared_attractors.title,
            sfi_declared_attractors.desired_future_state,
            sfi_declared_attractors.active,
            sfi_declared_attractors.priority,
            sfi_declared_attractors.horizon,
            sfi_declared_attractors.success_markers,
            sfi_declared_attractors.constraints,
            sfi_declared_attractors.created_at,
            sfi_declared_attractors.updated_at
           FROM sfi_declared_attractors
          WHERE (sfi_declared_attractors.active IS TRUE)
          ORDER BY sfi_declared_attractors.priority DESC, sfi_declared_attractors.created_at DESC
         LIMIT 1
        ), latest_alignment AS (
         SELECT DISTINCT ON (sfi_proposal_alignment.proposal_id) sfi_proposal_alignment.id,
            sfi_proposal_alignment.proposal_id,
            sfi_proposal_alignment.attractor_id,
            sfi_proposal_alignment.alignment_score,
            sfi_proposal_alignment.evidence_score,
            sfi_proposal_alignment.regime_fit_score,
            sfi_proposal_alignment.execution_value_score,
            sfi_proposal_alignment.recovery_cost_score,
            sfi_proposal_alignment.risk_score,
            sfi_proposal_alignment.recommended_status,
            sfi_proposal_alignment.recommendation,
            sfi_proposal_alignment.alternative_perturbation,
            sfi_proposal_alignment.rationale,
            sfi_proposal_alignment.override_reason,
            sfi_proposal_alignment.expected_cost,
            sfi_proposal_alignment.created_at
           FROM sfi_proposal_alignment
          ORDER BY sfi_proposal_alignment.proposal_id, sfi_proposal_alignment.created_at DESC
        )
 SELECT ap.id AS proposal_id,
    COALESCE(ap.title, ap.objective, ap.description, 'not enough trace'::text) AS proposal_title,
    COALESCE(ap.objective, ap.description, (ap.expected_field_delta ->> 'objective'::text), 'not enough trace'::text) AS proposal_objective,
    aa.title AS active_attractor,
    aa.id AS attractor_id,
    la.alignment_score,
    la.evidence_score,
    la.regime_fit_score,
    la.recovery_cost_score,
    COALESCE(la.recommended_status,
        CASE
            WHEN (aa.id IS NULL) THEN 'request_attractor'::text
            WHEN (COALESCE(ap.objective, ap.description, (ap.expected_field_delta ->> 'objective'::text)) IS NULL) THEN 'request_evidence'::text
            ELSE 'keep_observing'::text
        END) AS recommended_status,
    COALESCE(la.recommendation,
        CASE
            WHEN (aa.id IS NULL) THEN 'Declare active attractor before recommending execution.'::text
            WHEN (COALESCE(ap.objective, ap.description, (ap.expected_field_delta ->> 'objective'::text)) IS NULL) THEN 'Request evidence because proposal objective is missing.'::text
            ELSE 'Classify this proposal against the active attractor before execution.'::text
        END) AS recommendation,
    la.alternative_perturbation,
    COALESCE(la.rationale, 'not enough trace'::text) AS rationale
   FROM ((action_proposals ap
     LEFT JOIN latest_alignment la ON ((la.proposal_id = ap.id)))
     LEFT JOIN active_attractor aa ON (true))
  WHERE (ap.status = ANY (ARRAY['draft'::text, 'proposed'::text, 'approved'::text, 'design_approved'::text, 'queued'::text]));
```

### vw_sfi_closed_loop_state

```sql
 WITH proposals AS (
         SELECT (count(*))::numeric AS proposals_approved
           FROM action_proposals
          WHERE ((action_proposals.status = ANY (ARRAY['approved'::text, 'design_approved'::text, 'queued'::text, 'accepted'::text])) OR (action_proposals.approved_at IS NOT NULL))
        ), plans AS (
         SELECT (count(*))::numeric AS execution_plans_created
           FROM sfi_execution_ledger
        ), executions AS (
         SELECT (count(*))::numeric AS executions_executed
           FROM sfi_execution_ledger
          WHERE ((sfi_execution_ledger.executed_at IS NOT NULL) OR (sfi_execution_ledger.execution_status = ANY (ARRAY['executed'::text, 'generated'::text, 'pending'::text, 'recorded'::text])))
        ), outcomes AS (
         SELECT (count(*))::numeric AS outcomes_recorded
           FROM sfi_outcomes
        )
 SELECT p.proposals_approved,
    pl.execution_plans_created,
    e.executions_executed,
    o.outcomes_recorded,
        CASE
            WHEN (p.proposals_approved = (0)::numeric) THEN (0)::numeric
            ELSE round((pl.execution_plans_created / p.proposals_approved), 4)
        END AS proposal_to_execution_ratio,
        CASE
            WHEN (e.executions_executed = (0)::numeric) THEN (0)::numeric
            ELSE round((o.outcomes_recorded / e.executions_executed), 4)
        END AS execution_to_outcome_ratio,
        CASE
            WHEN (p.proposals_approved = (0)::numeric) THEN (0)::numeric
            ELSE round((o.outcomes_recorded / p.proposals_approved), 4)
        END AS closed_loop_ratio,
        CASE
            WHEN (p.proposals_approved = (0)::numeric) THEN 'missing approved proposals'::text
            WHEN (pl.execution_plans_created < p.proposals_approved) THEN 'proposal_to_execution'::text
            WHEN (o.outcomes_recorded < e.executions_executed) THEN 'execution_to_outcome'::text
            ELSE 'closed_loop_stable'::text
        END AS current_bottleneck,
        CASE
            WHEN (p.proposals_approved = (0)::numeric) THEN 'missing execution plan'::text
            WHEN (pl.execution_plans_created < p.proposals_approved) THEN 'approved proposals require concrete execution ledger records'::text
            WHEN (o.outcomes_recorded < e.executions_executed) THEN 'executions require outcome evidence and lesson capture'::text
            ELSE 'closed loop has proposal, execution and outcome trace'::text
        END AS interpretation
   FROM (((proposals p
     CROSS JOIN plans pl)
     CROSS JOIN executions e)
     CROSS JOIN outcomes o);
```

### vw_sfi_evidence_map

```sql
 SELECT domain,
    evidence_side,
    source_table,
    source_label,
    count(*) AS evidence_count,
    min(observed_at) AS first_seen,
    max(observed_at) AS last_seen
   FROM sfi_evidence_trace
  GROUP BY domain, evidence_side, source_table, source_label;
```

### vw_sfi_execution_recovery_queue

```sql
 SELECT id,
    proposal_id,
    title,
    status,
    proposal_type,
    objective,
    risk_level,
    approved_at,
    executed_at,
    recovery_status,
    recovery_reason,
    created_at
   FROM sfi_execution_recovery_queue
  ORDER BY approved_at DESC NULLS LAST, created_at DESC;
```

### vw_sfi_operational_cycle

```sql
 SELECT now() AS observed_at,
    ( SELECT vw_pipeline_stability.signal_events
           FROM vw_pipeline_stability) AS signal_events,
    ( SELECT vw_pipeline_stability.technical_events
           FROM vw_pipeline_stability) AS technical_events,
    ( SELECT vw_pipeline_stability.signal_ratio
           FROM vw_pipeline_stability) AS signal_ratio,
    ( SELECT vw_pipeline_stability.technical_ratio
           FROM vw_pipeline_stability) AS technical_ratio,
    ( SELECT vw_operational_regime.regime
           FROM vw_operational_regime) AS operational_regime,
    ( SELECT count(*) AS count
           FROM worldspect_snapshots) AS worldspect_snapshots,
    ( SELECT avg(worldspect_snapshots.source_coverage) AS avg
           FROM worldspect_snapshots) AS worldspect_avg_source_coverage,
    ( SELECT max(worldspect_snapshots.observed_at) AS max
           FROM worldspect_snapshots) AS worldspect_last_observed_at,
    ( SELECT count(*) AS count
           FROM scorefriction_observations) AS scorefriction_observations,
    ( SELECT count(*) AS count
           FROM scorefriction_vectors) AS scorefriction_vectors,
    ( SELECT max(scorefriction_observations.created_at) AS max
           FROM scorefriction_observations) AS scorefriction_last_observed_at,
    ( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name ~~ 'cognitive_twin.%'::text)) AS cognitive_events,
    ( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name ~~ 'acp.%'::text)) AS acp_events,
    ( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name ~~ 'mutation.%'::text)) AS mutation_events,
    ( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name ~~ 'governance.%'::text)) AS governance_events,
    ( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name = 'acp.proposal.approved'::text)) AS proposals_approved,
    ( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name = 'acp.proposal.execution_prepared'::text)) AS executions_prepared,
    ( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name = 'acp.proposal.outcome_recorded'::text)) AS outcomes_recorded,
    ( SELECT count(*) AS count
           FROM sfi_evidence_trace
          WHERE (sfi_evidence_trace.evidence_side = 'internal'::text)) AS internal_evidence_count,
    ( SELECT count(*) AS count
           FROM sfi_evidence_trace
          WHERE (sfi_evidence_trace.evidence_side = 'external'::text)) AS external_evidence_count,
        CASE
            WHEN (( SELECT vw_pipeline_stability.signal_ratio
               FROM vw_pipeline_stability) < 0.5) THEN 'El sistema sigue en estabilización: la actividad técnica/gobernanza supera la señal operativa.'::text
            WHEN (( SELECT vw_operational_regime.regime
               FROM vw_operational_regime) = 'GOVERNANCE_DOMINANT'::text) THEN 'El sistema observa y decide, pero la gobernanza domina sobre la ejecución.'::text
            ELSE 'El sistema muestra régimen operativo funcional.'::text
        END AS interpretation;
```

### vw_sfi_perturbation_history

```sql
 SELECT p.id AS perturbation_id,
    p.case_id,
    p.minimal_action,
    p.expected_effect,
    p.status AS perturbation_status,
    l.id AS execution_id,
    l.execution_status,
    l.verification_status,
    o.id AS outcome_id,
    o.outcome_status,
    o.observed_effect,
    p.created_at
   FROM ((sfi_field_perturbations p
     LEFT JOIN sfi_execution_ledger l ON ((l.perturbation_id = p.id)))
     LEFT JOIN sfi_outcomes o ON ((o.execution_id = l.id)))
  ORDER BY p.created_at DESC;
```

### vw_sfi_pipeline_loss

```sql
 SELECT now() AS observed_at,
    ( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name = 'acp.proposal.approved'::text)) AS approved,
    ( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name = 'acp.proposal.execution_prepared'::text)) AS prepared,
    ( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name = 'acp.proposal.outcome_recorded'::text)) AS outcome_recorded,
    (( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name = 'acp.proposal.approved'::text)) - ( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name = 'acp.proposal.execution_prepared'::text))) AS loss_approved_to_prepared,
    (( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name = 'acp.proposal.execution_prepared'::text)) - ( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name = 'acp.proposal.outcome_recorded'::text))) AS loss_prepared_to_outcome,
    round((( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name = 'acp.proposal.execution_prepared'::text)) / NULLIF(( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name = 'acp.proposal.approved'::text)), (0)::numeric)), 4) AS prepared_ratio,
    round((( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name = 'acp.proposal.outcome_recorded'::text)) / NULLIF(( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
           FROM vw_epistemic_signal
          WHERE (vw_epistemic_signal.event_name = 'acp.proposal.approved'::text)), (0)::numeric)), 4) AS outcome_ratio,
        CASE
            WHEN ((( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
               FROM vw_epistemic_signal
              WHERE (vw_epistemic_signal.event_name = 'acp.proposal.approved'::text)) - ( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
               FROM vw_epistemic_signal
              WHERE (vw_epistemic_signal.event_name = 'acp.proposal.execution_prepared'::text))) > (0)::numeric) THEN 'BOTTLENECK_APPROVAL_TO_EXECUTION'::text
            WHEN ((( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
               FROM vw_epistemic_signal
              WHERE (vw_epistemic_signal.event_name = 'acp.proposal.execution_prepared'::text)) - ( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
               FROM vw_epistemic_signal
              WHERE (vw_epistemic_signal.event_name = 'acp.proposal.outcome_recorded'::text))) > (0)::numeric) THEN 'BOTTLENECK_EXECUTION_TO_OUTCOME'::text
            ELSE 'NO_MAJOR_LOSS'::text
        END AS bottleneck,
        CASE
            WHEN ((( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
               FROM vw_epistemic_signal
              WHERE (vw_epistemic_signal.event_name = 'acp.proposal.approved'::text)) - ( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
               FROM vw_epistemic_signal
              WHERE (vw_epistemic_signal.event_name = 'acp.proposal.execution_prepared'::text))) > (0)::numeric) THEN 'Hay demasiadas propuestas aprobadas que no se convierten en ejecución preparada.'::text
            WHEN ((( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
               FROM vw_epistemic_signal
              WHERE (vw_epistemic_signal.event_name = 'acp.proposal.execution_prepared'::text)) - ( SELECT COALESCE(sum(vw_epistemic_signal.total), (0)::numeric) AS "coalesce"
               FROM vw_epistemic_signal
              WHERE (vw_epistemic_signal.event_name = 'acp.proposal.outcome_recorded'::text))) > (0)::numeric) THEN 'Hay ejecuciones preparadas sin outcome registrado.'::text
            ELSE 'El pipeline no muestra pérdida mayor entre aprobación, ejecución y outcome.'::text
        END AS interpretation;
```

### vw_sfi_reality_console_state

```sql
 SELECT now() AS read_at,
    ( SELECT row_to_json(x.*) AS row_to_json
           FROM ( SELECT vw_sfi_operational_cycle.observed_at,
                    vw_sfi_operational_cycle.signal_events,
                    vw_sfi_operational_cycle.technical_events,
                    vw_sfi_operational_cycle.signal_ratio,
                    vw_sfi_operational_cycle.technical_ratio,
                    vw_sfi_operational_cycle.operational_regime,
                    vw_sfi_operational_cycle.worldspect_snapshots,
                    vw_sfi_operational_cycle.worldspect_avg_source_coverage,
                    vw_sfi_operational_cycle.worldspect_last_observed_at,
                    vw_sfi_operational_cycle.scorefriction_observations,
                    vw_sfi_operational_cycle.scorefriction_vectors,
                    vw_sfi_operational_cycle.scorefriction_last_observed_at,
                    vw_sfi_operational_cycle.cognitive_events,
                    vw_sfi_operational_cycle.acp_events,
                    vw_sfi_operational_cycle.mutation_events,
                    vw_sfi_operational_cycle.governance_events,
                    vw_sfi_operational_cycle.proposals_approved,
                    vw_sfi_operational_cycle.executions_prepared,
                    vw_sfi_operational_cycle.outcomes_recorded,
                    vw_sfi_operational_cycle.internal_evidence_count,
                    vw_sfi_operational_cycle.external_evidence_count,
                    vw_sfi_operational_cycle.interpretation
                   FROM vw_sfi_operational_cycle
                 LIMIT 1) x) AS operational_cycle,
    ( SELECT row_to_json(x.*) AS row_to_json
           FROM ( SELECT vw_sfi_stability.observed_at,
                    vw_sfi_stability.signal_ratio,
                    vw_sfi_stability.technical_ratio,
                    vw_sfi_stability.proposals_approved,
                    vw_sfi_stability.executions_prepared,
                    vw_sfi_stability.outcomes_recorded,
                    vw_sfi_stability.stability_index,
                    vw_sfi_stability.stability_regime
                   FROM vw_sfi_stability
                 LIMIT 1) x) AS stability,
    ( SELECT row_to_json(x.*) AS row_to_json
           FROM ( SELECT vw_sfi_pipeline_loss.observed_at,
                    vw_sfi_pipeline_loss.approved,
                    vw_sfi_pipeline_loss.prepared,
                    vw_sfi_pipeline_loss.outcome_recorded,
                    vw_sfi_pipeline_loss.loss_approved_to_prepared,
                    vw_sfi_pipeline_loss.loss_prepared_to_outcome,
                    vw_sfi_pipeline_loss.prepared_ratio,
                    vw_sfi_pipeline_loss.outcome_ratio,
                    vw_sfi_pipeline_loss.bottleneck,
                    vw_sfi_pipeline_loss.interpretation
                   FROM vw_sfi_pipeline_loss
                 LIMIT 1) x) AS pipeline_loss,
    ( SELECT row_to_json(x.*) AS row_to_json
           FROM ( SELECT vw_sfi_closed_loop_state.proposals_approved,
                    vw_sfi_closed_loop_state.execution_plans_created,
                    vw_sfi_closed_loop_state.executions_executed,
                    vw_sfi_closed_loop_state.outcomes_recorded,
                    vw_sfi_closed_loop_state.proposal_to_execution_ratio,
                    vw_sfi_closed_loop_state.execution_to_outcome_ratio,
                    vw_sfi_closed_loop_state.closed_loop_ratio,
                    vw_sfi_closed_loop_state.current_bottleneck,
                    vw_sfi_closed_loop_state.interpretation
                   FROM vw_sfi_closed_loop_state
                 LIMIT 1) x) AS closed_loop,
    ( SELECT row_to_json(x.*) AS row_to_json
           FROM ( SELECT sfi_declared_attractors.id,
                    sfi_declared_attractors.title,
                    sfi_declared_attractors.desired_future_state,
                    sfi_declared_attractors.active,
                    sfi_declared_attractors.priority,
                    sfi_declared_attractors.horizon,
                    sfi_declared_attractors.success_markers,
                    sfi_declared_attractors.constraints,
                    sfi_declared_attractors.created_at,
                    sfi_declared_attractors.updated_at
                   FROM sfi_declared_attractors
                  WHERE (sfi_declared_attractors.active IS TRUE)
                  ORDER BY sfi_declared_attractors.priority DESC, sfi_declared_attractors.created_at DESC
                 LIMIT 1) x) AS active_attractor;
```

### vw_sfi_rehydration_status

```sql
 SELECT ( SELECT count(*) AS count
           FROM epistemic_events) AS epistemic_events,
    ( SELECT count(*) AS count
           FROM worldspect_snapshots) AS worldspect_snapshots,
    ( SELECT count(*) AS count
           FROM scorefriction_observations) AS scorefriction_observations,
    ( SELECT count(*) AS count
           FROM scorefriction_vectors) AS scorefriction_vectors,
    ( SELECT count(*) AS count
           FROM sfi_evidence_trace) AS evidence_trace,
    ( SELECT count(*) AS count
           FROM sfi_backup_20260618.epistemic_events) AS backup_epistemic_events,
    now() AS checked_at;
```

### vw_sfi_stability

```sql
 SELECT now() AS observed_at,
    signal_ratio,
    technical_ratio,
    proposals_approved,
    executions_prepared,
    outcomes_recorded,
    round(((COALESCE(signal_ratio, (0)::numeric) + (outcomes_recorded / NULLIF(proposals_approved, (0)::numeric))) / (2)::numeric), 4) AS stability_index,
        CASE
            WHEN (round(((COALESCE(signal_ratio, (0)::numeric) + (outcomes_recorded / NULLIF(proposals_approved, (0)::numeric))) / (2)::numeric), 4) < 0.30) THEN 'COLLAPSED'::text
            WHEN (round(((COALESCE(signal_ratio, (0)::numeric) + (outcomes_recorded / NULLIF(proposals_approved, (0)::numeric))) / (2)::numeric), 4) < 0.50) THEN 'EXPERIMENTAL'::text
            WHEN (round(((COALESCE(signal_ratio, (0)::numeric) + (outcomes_recorded / NULLIF(proposals_approved, (0)::numeric))) / (2)::numeric), 4) < 0.70) THEN 'STABILIZING'::text
            WHEN (round(((COALESCE(signal_ratio, (0)::numeric) + (outcomes_recorded / NULLIF(proposals_approved, (0)::numeric))) / (2)::numeric), 4) < 0.90) THEN 'OPERATIONAL'::text
            ELSE 'INSTITUTIONAL'::text
        END AS stability_regime
   FROM vw_sfi_operational_cycle;
```

### vw_worldspect_real

```sql
 SELECT id,
    observed_at,
    created_at,
    source_state,
    evidence_level,
    regime,
    wsi,
    nti,
    source_coverage,
    source_mix,
    degraded_sources,
    sources,
    source_health,
    interpretation
   FROM worldspect_snapshots
  WHERE (source_coverage > (0)::numeric)
  ORDER BY observed_at DESC;
```

