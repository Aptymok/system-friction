-- =====================================================
-- 00. Extensiones
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- 01. Tablas base (core)
-- =====================================================
CREATE TABLE IF NOT EXISTS nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'whatsapp')),
  whatsapp_phone TEXT,
  current_ihg NUMERIC DEFAULT 0 CHECK (current_ihg BETWEEN -1 AND 1),
  current_nti NUMERIC DEFAULT 0.5 CHECK (current_nti BETWEEN 0 AND 1),
  current_ldi NUMERIC DEFAULT 0 CHECK (current_ldi BETWEEN 0 AND 100),
  auth_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync TIMESTAMPTZ,
  cognitive_version TEXT DEFAULT 'v1',
  objective TEXT,
  current_severity NUMERIC DEFAULT 0 CHECK (current_severity BETWEEN 0 AND 1),
  active_pattern TEXT,
  last_resolution_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'whatsapp')),
  narrative TEXT,
  ihg NUMERIC CHECK (ihg BETWEEN -1 AND 1),
  nti NUMERIC CHECK (nti BETWEEN 0 AND 1),
  ldi NUMERIC CHECK (ldi BETWEEN 0 AND 100),
  verdict TEXT,
  diagnosis TEXT,
  loop_score NUMERIC,
  divergence NUMERIC,
  pattern TEXT,
  hard_stop BOOLEAN DEFAULT FALSE,
  proposed_action TEXT,
  certainty NUMERIC DEFAULT 0.5 CHECK (certainty BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  whatsapp_session_id TEXT,
  external_id TEXT
);

CREATE TABLE IF NOT EXISTS whatsapp_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  question_number INT,
  question_text TEXT,
  answer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('audit', 'simulation', 'whatsapp_sync', 'hard_stop')),
  payload JSONB DEFAULT '{}'::jsonb,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 02. Tablas de identidad, memoria y perfiles
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY,
  alias TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  role TEXT DEFAULT 'observer' CHECK (role IN ('observer', 'operator', 'controller', 'root')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise')),
  module_access JSONB DEFAULT '{"observatory": true, "planner": false, "simulator": false, "executor": false, "social": false}',
  subscription_expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS intake_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  email TEXT NOT NULL,
  objective TEXT NOT NULL,
  current_friction TEXT NOT NULL,
  initial_ihg NUMERIC DEFAULT 0 CHECK (initial_ihg BETWEEN -1 AND 1),
  initial_nti NUMERIC DEFAULT 0.5 CHECK (initial_nti BETWEEN 0 AND 1),
  initial_ldi NUMERIC DEFAULT 0 CHECK (initial_ldi BETWEEN 0 AND 100),
  initial_pattern TEXT,
  initial_severity NUMERIC DEFAULT 0 CHECK (initial_severity BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intake_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_session_id UUID REFERENCES intake_sessions(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  audit_id UUID REFERENCES audits(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  verification_criterion TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed', 'invalidated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  action_type TEXT DEFAULT 'operational',
  metadata JSONB DEFAULT '{}'::jsonb,
  file_audit_id UUID,
  spectrum_contrast_id UUID,
  approval_status TEXT DEFAULT 'draft' CHECK (approval_status IN ('draft', 'suggested', 'accepted', 'cancelled', 'published_blocked')),
  scheduled_for TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS memory_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  audit_id UUID REFERENCES audits(id) ON DELETE SET NULL,
  fact_type TEXT NOT NULL CHECK (fact_type IN ('objective', 'loop', 'constraint', 'emotion_pattern', 'missed_action', 'direction_change', 'external_signal')),
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence NUMERIC DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  recurrence_count INT DEFAULT 1,
  embedding vector(1536)
);

CREATE TABLE IF NOT EXISTS interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  source TEXT DEFAULT 'web',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telemetry_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('oauth', 'webhook', 'manual_import', 'rss', 'api')),
  handle TEXT,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'revoked', 'error')),
  consent_scope JSONB DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  oauth_expires_at TIMESTAMPTZ,
  external_account_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS external_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telemetry_source_id UUID REFERENCES telemetry_sources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  normalized_text TEXT,
  semantic_tags TEXT[] DEFAULT '{}',
  engagement JSONB DEFAULT '{}'::jsonb,
  signal_strength NUMERIC DEFAULT 0 CHECK (signal_strength BETWEEN 0 AND 1),
  published_at TIMESTAMPTZ,
  ingested_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memory_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS amv_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  question_count INT DEFAULT 0,
  final_reading JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS amv_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES amv_sessions(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  question_index INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_key TEXT NOT NULL,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'trialing', 'past_due', 'canceled')),
  provider TEXT DEFAULT 'manual',
  provider_subscription_id TEXT,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS license_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  entitlement_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  limits JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 03. Telemetría y vectores
-- =====================================================
CREATE TABLE IF NOT EXISTS interaction_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  session_id UUID,
  total_seconds NUMERIC,
  typing_speed_cps NUMERIC,
  backspaces INT DEFAULT 0,
  rewrites_estimated INT DEFAULT 0,
  focus_switches INT DEFAULT 0,
  abandoned BOOLEAN DEFAULT FALSE,
  topic_durations JSONB,
  raw_event_stream JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telemetry_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  source TEXT,
  session_metadata JSONB
);

CREATE TABLE IF NOT EXISTS attentional_drift (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  drift_score NUMERIC DEFAULT 0,
  fragmentation NUMERIC DEFAULT 0,
  persistence NUMERIC DEFAULT 0,
  backspace_rate_mean NUMERIC DEFAULT 0,
  source_telemetry UUID REFERENCES interaction_telemetry(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS semantic_pressure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  expansion_pressure NUMERIC,
  closure_pressure NUMERIC,
  dominant_mode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 04. Espectro de mundo y snapshots
-- =====================================================
CREATE TABLE IF NOT EXISTS world_spectrum_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ihg NUMERIC DEFAULT 0 CHECK (ihg BETWEEN -1 AND 1),
  nti NUMERIC DEFAULT 0.5 CHECK (nti BETWEEN 0 AND 1),
  ldi NUMERIC DEFAULT 0 CHECK (ldi BETWEEN 0 AND 100),
  cultural_ihg NUMERIC DEFAULT 0 CHECK (cultural_ihg BETWEEN -1 AND 1),
  cultural_nti NUMERIC DEFAULT 0.5 CHECK (cultural_nti BETWEEN 0 AND 1),
  cultural_ldi NUMERIC DEFAULT 0 CHECK (cultural_ldi BETWEEN 0 AND 100),
  feeling_ihg NUMERIC DEFAULT 0 CHECK (feeling_ihg BETWEEN -1 AND 1),
  feeling_nti NUMERIC DEFAULT 0.5 CHECK (feeling_nti BETWEEN 0 AND 1),
  feeling_ldi NUMERIC DEFAULT 0 CHECK (feeling_ldi BETWEEN 0 AND 100),
  payload JSONB DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 05. Tablas del gemelo cognitivo
-- =====================================================
CREATE TABLE IF NOT EXISTS cognitive_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    snapshot_type TEXT DEFAULT 'system' CHECK (snapshot_type IN ('system', 'audit', 'manual', 'phase_transition', 'simulation')),
    cognitive_state JSONB NOT NULL,
    invariant_state JSONB,
    identity_distribution JSONB,
    energy_state JSONB,
    friction_state JSONB,
    confidence_score NUMERIC DEFAULT 0.5 CHECK (confidence_score BETWEEN 0 AND 1),
    coherence_score NUMERIC DEFAULT 0.5 CHECK (coherence_score BETWEEN 0 AND 1),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS episodic_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    episode_type TEXT,
    salience NUMERIC DEFAULT 0.5 CHECK (salience BETWEEN 0 AND 1),
    emotional_weight NUMERIC DEFAULT 0.5 CHECK (emotional_weight BETWEEN 0 AND 1),
    title TEXT,
    summary TEXT,
    triggering_context JSONB,
    linked_memories UUID[],
    embedding vector(1536),
    occurred_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cognitive_contradictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    contradiction_type TEXT CHECK (contradiction_type IN ('semantic', 'operational', 'temporal', 'axiological')),
    statement_a TEXT,
    statement_b TEXT,
    source_a UUID,
    source_b UUID,
    contradiction_strength NUMERIC DEFAULT 0.5 CHECK (contradiction_strength BETWEEN 0 AND 1),
    resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cognitive_energy_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    energy NUMERIC CHECK (energy BETWEEN 0 AND 1),
    fatigue NUMERIC CHECK (fatigue BETWEEN 0 AND 1),
    expansion NUMERIC,
    saturation NUMERIC,
    inferred_from JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_masks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    mask_type TEXT CHECK (mask_type IN ('authentic', 'idealized', 'defensive', 'compensatory')),
    intensity NUMERIC DEFAULT 0 CHECK (intensity BETWEEN 0 AND 1),
    discrepancy_score NUMERIC DEFAULT 0,
    evidence JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS identity_state_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    operational NUMERIC DEFAULT 0,
    aspirational NUMERIC DEFAULT 0,
    defensive NUMERIC DEFAULT 0,
    symbolic NUMERIC DEFAULT 0,
    stressed NUMERIC DEFAULT 0,
    social NUMERIC DEFAULT 0,
    dominant_state TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS causal_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    cause_label TEXT NOT NULL,
    effect_label TEXT NOT NULL,
    context TEXT,
    causal_weight NUMERIC DEFAULT 0.5 CHECK (causal_weight BETWEEN 0 AND 1),
    reversible BOOLEAN DEFAULT FALSE,
    evidence_count INT DEFAULT 1,
    last_reinforced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phase_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    transition_type TEXT,
    metric_before NUMERIC,
    metric_after NUMERIC,
    trigger_event UUID,
    attractor_before JSONB,
    attractor_after JSONB,
    confidence NUMERIC DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS epistemic_confidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    module_name TEXT NOT NULL,
    confidence NUMERIC DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
    observation_count INT DEFAULT 0,
    consistency NUMERIC DEFAULT 0.5 CHECK (consistency BETWEEN 0 AND 1),
    false_positive_risk NUMERIC DEFAULT 0.5 CHECK (false_positive_risk BETWEEN 0 AND 1),
    notes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meta_observer_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    overall_certainty NUMERIC DEFAULT 0.5 CHECK (overall_certainty BETWEEN 0 AND 1),
    low_confidence_modules TEXT[],
    conflict_zones JSONB,
    predictive_degradation NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS counterfactual_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    inference_type TEXT,
    original_confidence NUMERIC CHECK (original_confidence BETWEEN 0 AND 1),
    adjusted_confidence NUMERIC CHECK (adjusted_confidence BETWEEN 0 AND 1),
    counterfactual_risk NUMERIC CHECK (counterfactual_risk BETWEEN 0 AND 1),
    alternative_explanations JSONB,
    evidence JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS execution_gap_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    gap_score NUMERIC CHECK (gap_score BETWEEN 0 AND 1),
    completed_ratio NUMERIC CHECK (completed_ratio BETWEEN 0 AND 1),
    abandoned_ratio NUMERIC CHECK (abandoned_ratio BETWEEN 0 AND 1),
    missing_proposals INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS environmental_load (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    economic_load NUMERIC DEFAULT 0 CHECK (economic_load BETWEEN 0 AND 1),
    social_load NUMERIC DEFAULT 0 CHECK (social_load BETWEEN 0 AND 1),
    uncertainty_load NUMERIC DEFAULT 0 CHECK (uncertainty_load BETWEEN 0 AND 1),
    operational_complexity NUMERIC DEFAULT 0,
    total_load NUMERIC DEFAULT 0,
    source_context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS twin_simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    simulation_prompt TEXT,
    inferred_state JSONB,
    generated_response TEXT,
    coherence_score NUMERIC,
    similarity_score NUMERIC,
    model_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cognitive_invariants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    invariant_label TEXT,
    invariant_strength NUMERIC DEFAULT 0.5 CHECK (invariant_strength BETWEEN 0 AND 1),
    recurrence_count INT DEFAULT 1,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    supporting_evidence JSONB
);

CREATE TABLE IF NOT EXISTS cognitive_state_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    vector_label TEXT,
    embedding vector(1536),
    certainty NUMERIC DEFAULT 0.5 CHECK (certainty BETWEEN 0 AND 1),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 06. Capa epistémica
-- =====================================================
CREATE TABLE IF NOT EXISTS epistemic_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('observed', 'declared', 'inferred', 'simulated', 'projected', 'derived')),
    evidence_level TEXT NOT NULL CHECK (evidence_level IN ('direct', 'behavioral', 'statistical', 'semantic', 'speculative')),
    source_module TEXT NOT NULL,
    payload JSONB NOT NULL,
    confidence NUMERIC DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
    parent_event_id UUID REFERENCES epistemic_events(id),
    inference_chain TEXT[] DEFAULT '{}',
    invalidated BOOLEAN DEFAULT FALSE,
    invalidation_reason TEXT,
    checksum TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inference_lineage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    parent_inference UUID REFERENCES epistemic_events(id) ON DELETE CASCADE,
    child_inference UUID REFERENCES epistemic_events(id) ON DELETE CASCADE,
    relation_type TEXT,
    propagated_confidence NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inference_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    inference_a UUID REFERENCES epistemic_events(id),
    inference_b UUID REFERENCES epistemic_events(id),
    conflict_reason TEXT,
    severity NUMERIC DEFAULT 0.5 CHECK (severity BETWEEN 0 AND 1),
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS epistemic_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    warning_type TEXT NOT NULL,
    message TEXT NOT NULL,
    severity NUMERIC DEFAULT 0.5 CHECK (severity BETWEEN 0 AND 1),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 07. Orquestador y schedulers
-- =====================================================
CREATE TABLE IF NOT EXISTS orchestrator_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    global_state JSONB,
    certainty NUMERIC DEFAULT 0.5 CHECK (certainty BETWEEN 0 AND 1),
    active_modules TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS module_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    module_name TEXT NOT NULL,
    health_score NUMERIC DEFAULT 1.0 CHECK (health_score BETWEEN 0 AND 1),
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    degradation_flags JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduler_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    action_id UUID REFERENCES actions(id) ON DELETE SET NULL,
    provider TEXT,
    job_name TEXT NOT NULL,
    schedule_cron TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    attempts INT DEFAULT 0,
    last_error TEXT,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS persistence_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation TEXT,
    payload JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 08. Event sourcing
-- =====================================================
CREATE TABLE IF NOT EXISTS cognitive_event_stream (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    stream_type TEXT NOT NULL,
    event_name TEXT NOT NULL,
    payload JSONB NOT NULL,
    caused_by UUID,
    correlation_id UUID,
    sequence_number BIGSERIAL,
    emitted_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS replay_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    last_replayed_sequence BIGINT DEFAULT 0,
    current_state JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_projections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projection_name TEXT NOT NULL,
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    snapshot JSONB,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 09. Degradación y linaje
-- =====================================================
CREATE TABLE IF NOT EXISTS cognitive_degradation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    degradation_score NUMERIC DEFAULT 0 CHECK (degradation_score BETWEEN 0 AND 1),
    narrative_saturation NUMERIC DEFAULT 0,
    symbolic_overfit NUMERIC DEFAULT 0,
    temporal_fragmentation NUMERIC DEFAULT 0,
    predictive_decay NUMERIC DEFAULT 0,
    recommended_recalibration JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS identity_lineage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    previous_state UUID,
    current_state UUID,
    transition_reason TEXT,
    structural_shift BOOLEAN DEFAULT FALSE,
    entropy_delta NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attractor_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    attractor_label TEXT,
    stability NUMERIC,
    dominant_variables JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS narrative_saturation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    saturation_index NUMERIC,
    repetitive_phrases JSONB,
    novelty_score NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. Social y OAuth
-- =====================================================
CREATE TABLE IF NOT EXISTS social_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('twitter', 'facebook', 'instagram', 'linkedin', 'tiktok')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  provider_user_id TEXT,
  scope TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  node_id UUID REFERENCES nodes(id),
  provider TEXT NOT NULL,
  content TEXT,
  media_urls TEXT[],
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed', 'cancelled')),
  external_post_id TEXT,
  engagement_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 11. Capa de intenciones y planificación
-- =====================================================
CREATE TABLE IF NOT EXISTS intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  success_criteria JSONB NOT NULL,
  version INT DEFAULT 1,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  current_ihg NUMERIC DEFAULT 0 CHECK (current_ihg BETWEEN -1 AND 1),
  current_nti NUMERIC DEFAULT 0.5 CHECK (current_nti BETWEEN 0 AND 1),
  current_ldi NUMERIC DEFAULT 0 CHECK (current_ldi BETWEEN 0 AND 100),
  operational_coordinates JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS planning_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id UUID REFERENCES intents(id) ON DELETE CASCADE,
  plan_label TEXT,
  description TEXT,
  steps JSONB,
  probability NUMERIC CHECK (probability BETWEEN 0 AND 1),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  cost_estimate JSONB,
  assumptions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS decision_gate_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  plan_id TEXT,
  planning_plan_id UUID REFERENCES planning_plans(id) ON DELETE SET NULL,
  decision_source TEXT CHECK (decision_source IN ('human', 'auto_high_confidence', 'auto_rejected')),
  confidence_threshold NUMERIC,
  actual_confidence NUMERIC,
  approved BOOLEAN,
  approved_by UUID REFERENCES auth.users(id),
  justification TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 12. Multitenant y módulos
-- =====================================================
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO modules (module_key, name, description, base_price) VALUES
  ('observatory', 'Observatorio', 'Lectura de métricas y estado del sistema', 0),
  ('planner', 'Planificador', 'Generación de planes A/B/C', 10),
  ('simulator', 'Simulador', 'Sandbox con Monte Carlo', 15),
  ('executor', 'Ejecutor', 'Ejecución de acciones', 20),
  ('social', 'Redes Sociales', 'Publicación automática', 25)
ON CONFLICT (module_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  modules JSONB NOT NULL,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 13. Archivos y contrastes de espectro
-- =====================================================
CREATE TABLE IF NOT EXISTS file_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  audit_id UUID REFERENCES audits(id) ON DELETE SET NULL,
  file_name TEXT,
  file_type TEXT NOT NULL,
  mime_type TEXT,
  byte_length BIGINT DEFAULT 0,
  content_hash TEXT,
  extracted_text TEXT,
  extracted_metadata JSONB DEFAULT '{}'::jsonb,
  mihm_vector JSONB NOT NULL DEFAULT '{}'::jsonb,
  ihg NUMERIC NOT NULL DEFAULT 0 CHECK (ihg BETWEEN -1 AND 1),
  nti NUMERIC NOT NULL DEFAULT 0.5 CHECK (nti BETWEEN 0 AND 1),
  ldi NUMERIC NOT NULL DEFAULT 0 CHECK (ldi BETWEEN 0 AND 100),
  threshold_distance NUMERIC NOT NULL DEFAULT 0,
  narrative TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spectrum_contrasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  file_audit_id UUID REFERENCES file_audits(id) ON DELETE SET NULL,
  audit_id UUID REFERENCES audits(id) ON DELETE SET NULL,
  world_ihg NUMERIC DEFAULT 0 CHECK (world_ihg BETWEEN -1 AND 1),
  world_nti NUMERIC DEFAULT 0.5 CHECK (world_nti BETWEEN 0 AND 1),
  world_ldi NUMERIC DEFAULT 0 CHECK (world_ldi BETWEEN 0 AND 100),
  cultural_ihg NUMERIC DEFAULT 0 CHECK (cultural_ihg BETWEEN -1 AND 1),
  cultural_nti NUMERIC DEFAULT 0.5 CHECK (cultural_nti BETWEEN 0 AND 1),
  cultural_ldi NUMERIC DEFAULT 0 CHECK (cultural_ldi BETWEEN 0 AND 100),
  feeling_ihg NUMERIC DEFAULT 0 CHECK (feeling_ihg BETWEEN -1 AND 1),
  feeling_nti NUMERIC DEFAULT 0.5 CHECK (feeling_nti BETWEEN 0 AND 1),
  feeling_ldi NUMERIC DEFAULT 0 CHECK (feeling_ldi BETWEEN 0 AND 100),
  contrast_ihg NUMERIC DEFAULT 0,
  contrast_nti NUMERIC DEFAULT 0.5,
  contrast_ldi NUMERIC DEFAULT 0,
  threshold_distance NUMERIC DEFAULT 0,
  tendency TEXT,
  annotation TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actualizar acciones con FK a file_audits y spectrum_contrasts (ya agregadas en la definición de actions, pero aseguramos)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actions' AND column_name='file_audit_id') THEN
    ALTER TABLE actions ADD COLUMN file_audit_id UUID REFERENCES file_audits(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actions' AND column_name='spectrum_contrast_id') THEN
    ALTER TABLE actions ADD COLUMN spectrum_contrast_id UUID REFERENCES spectrum_contrasts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- 14. Índices (rendimiento)
-- =====================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_nodes_whatsapp_phone_unique ON nodes(whatsapp_phone) WHERE whatsapp_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nodes_user_id ON nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_audits_node_id ON audits(node_id);
CREATE INDEX IF NOT EXISTS idx_audits_created_at ON audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_token ON links(token);
CREATE INDEX IF NOT EXISTS idx_links_node_id ON links(node_id);
CREATE INDEX IF NOT EXISTS idx_events_node_id ON events(node_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_responses_audit ON whatsapp_responses(audit_id);
CREATE INDEX IF NOT EXISTS idx_intake_sessions_node_id ON intake_sessions(node_id);
CREATE INDEX IF NOT EXISTS idx_actions_node_id ON actions(node_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_action_type ON actions(action_type);
CREATE INDEX IF NOT EXISTS idx_actions_due_pending ON actions(due_at, status);
CREATE INDEX IF NOT EXISTS idx_actions_approval_status ON actions(approval_status);
CREATE INDEX IF NOT EXISTS idx_actions_scheduled_for ON actions(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_memory_facts_node_id ON memory_facts(node_id);
CREATE INDEX IF NOT EXISTS idx_memory_facts_type ON memory_facts(fact_type);
CREATE INDEX IF NOT EXISTS idx_interaction_events_node_id ON interaction_events(node_id);
CREATE INDEX IF NOT EXISTS idx_interaction_events_type ON interaction_events(event_type);
CREATE INDEX IF NOT EXISTS idx_amv_sessions_node_id ON amv_sessions(node_id);
CREATE INDEX IF NOT EXISTS idx_amv_messages_session_id ON amv_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_sources_node_id ON telemetry_sources(node_id);
CREATE INDEX IF NOT EXISTS idx_external_signals_node_id ON external_signals(node_id);
CREATE INDEX IF NOT EXISTS idx_external_signals_provider ON external_signals(provider);
CREATE INDEX IF NOT EXISTS idx_interaction_telemetry_node ON interaction_telemetry(node_id);
CREATE INDEX IF NOT EXISTS idx_attentional_drift_node ON attentional_drift(node_id);
CREATE INDEX IF NOT EXISTS idx_semantic_pressure_node ON semantic_pressure(node_id);
CREATE INDEX IF NOT EXISTS idx_world_spectrum_node ON world_spectrum_snapshots(node_id);
CREATE INDEX IF NOT EXISTS idx_world_spectrum_user ON world_spectrum_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_world_spectrum_observed ON world_spectrum_snapshots(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cognitive_snapshots_node ON cognitive_snapshots(node_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_snapshots_created ON cognitive_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_episodic_memory_node ON episodic_memory(node_id);
CREATE INDEX IF NOT EXISTS idx_episodic_memory_salience ON episodic_memory(salience DESC);
CREATE INDEX IF NOT EXISTS idx_contradictions_node ON cognitive_contradictions(node_id);
CREATE INDEX IF NOT EXISTS idx_causal_relationships_node ON causal_relationships(node_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_invariants_node ON cognitive_invariants(node_id);
CREATE INDEX IF NOT EXISTS idx_epistemic_events_node ON epistemic_events(node_id);
CREATE INDEX IF NOT EXISTS idx_epistemic_events_signal ON epistemic_events(signal_type);
CREATE INDEX IF NOT EXISTS idx_epistemic_events_confidence ON epistemic_events(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_inference_lineage_node ON inference_lineage(node_id);
CREATE INDEX IF NOT EXISTS idx_inference_conflicts_node ON inference_conflicts(node_id);
CREATE INDEX IF NOT EXISTS idx_epistemic_warnings_node ON epistemic_warnings(node_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_jobs_due ON scheduler_jobs(next_run, status);
CREATE INDEX IF NOT EXISTS idx_scheduler_jobs_action_id ON scheduler_jobs(action_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_jobs_node ON scheduler_jobs(node_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_event_stream_node ON cognitive_event_stream(node_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_event_stream_sequence ON cognitive_event_stream(sequence_number);
CREATE INDEX IF NOT EXISTS idx_social_tokens_user ON social_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_node ON social_posts(node_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_decision_gate_user ON decision_gate_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_decision_gate_node ON decision_gate_logs(node_id);
CREATE INDEX IF NOT EXISTS idx_decision_gate_plan_id ON decision_gate_logs(plan_id);
CREATE INDEX IF NOT EXISTS idx_decision_gate_planning_plan_id ON decision_gate_logs(planning_plan_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_file_audits_node ON file_audits(node_id);
CREATE INDEX IF NOT EXISTS idx_file_audits_user ON file_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_file_audits_hash ON file_audits(content_hash);
CREATE INDEX IF NOT EXISTS idx_spectrum_contrasts_node ON spectrum_contrasts(node_id);
CREATE INDEX IF NOT EXISTS idx_spectrum_contrasts_file ON spectrum_contrasts(file_audit_id);
CREATE INDEX IF NOT EXISTS idx_actions_file_audit ON actions(file_audit_id);
CREATE INDEX IF NOT EXISTS idx_actions_spectrum_contrast ON actions(spectrum_contrast_id);

-- Índices vectoriales
CREATE INDEX IF NOT EXISTS idx_memory_facts_embedding ON memory_facts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_memory_vectors_embedding ON memory_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_episodic_memory_embedding ON episodic_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_cognitive_state_vectors_embedding ON cognitive_state_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =====================================================
-- 15. RLS y Políticas de Seguridad (después de todas las tablas)
-- =====================================================
-- Habilitar RLS
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE amv_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE amv_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE attentional_drift ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_pressure ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_spectrum_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodic_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_contradictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_energy_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_masks ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE causal_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE epistemic_confidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_observer_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE counterfactual_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_gap_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE environmental_load ENABLE ROW LEVEL SECURITY;
ALTER TABLE twin_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_invariants ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_state_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE epistemic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE inference_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE inference_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE epistemic_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_event_stream ENABLE ROW LEVEL SECURITY;
ALTER TABLE replay_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_degradation ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE attractor_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE narrative_saturation ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_gate_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectrum_contrasts ENABLE ROW LEVEL SECURITY;

-- Políticas (solo las esenciales; se pueden añadir más según necesidad)
-- Nota: Las políticas usan auth.uid() y asumen que el user_id de nodes está alineado con auth.users

-- Nodos: solo el dueño
CREATE POLICY nodes_own ON nodes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auditorías: a través del nodo
CREATE POLICY audits_own_node ON audits FOR ALL USING (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = audits.node_id AND nodes.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = audits.node_id AND nodes.user_id = auth.uid()));

-- Perfiles: solo el propio usuario
CREATE POLICY profiles_own ON profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Intake sessions: por user_id
CREATE POLICY intake_sessions_own ON intake_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Acciones: a través del nodo
CREATE POLICY actions_own_node ON actions FOR ALL USING (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = actions.node_id AND nodes.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = actions.node_id AND nodes.user_id = auth.uid()));

-- Memory facts: a través del nodo
CREATE POLICY memory_facts_own_node ON memory_facts FOR ALL USING (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = memory_facts.node_id AND nodes.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = memory_facts.node_id AND nodes.user_id = auth.uid()));

-- Interaction events: por user_id
CREATE POLICY interaction_events_own ON interaction_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Telemetry sources: por user_id
CREATE POLICY telemetry_sources_own ON telemetry_sources FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- External signals: solo lectura por user_id
CREATE POLICY external_signals_own ON external_signals FOR SELECT USING (auth.uid() = user_id);

-- Social tokens y posts
CREATE POLICY social_tokens_own ON social_tokens FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY social_posts_own ON social_posts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Intents
CREATE POLICY intents_own ON intents FOR ALL USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM nodes WHERE nodes.id = intents.node_id AND nodes.user_id = auth.uid())) WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM nodes WHERE nodes.id = intents.node_id AND nodes.user_id = auth.uid()));

-- Decision gate logs
CREATE POLICY decision_gate_logs_own ON decision_gate_logs FOR ALL USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM nodes WHERE nodes.id = decision_gate_logs.node_id AND nodes.user_id = auth.uid())) WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM nodes WHERE nodes.id = decision_gate_logs.node_id AND nodes.user_id = auth.uid()));

-- File audits
CREATE POLICY file_audits_own ON file_audits FOR ALL USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM nodes WHERE nodes.id = file_audits.node_id AND nodes.user_id = auth.uid())) WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM nodes WHERE nodes.id = file_audits.node_id AND nodes.user_id = auth.uid()));

-- Spectrum contrasts
CREATE POLICY spectrum_contrasts_own ON spectrum_contrasts FOR ALL USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM nodes WHERE nodes.id = spectrum_contrasts.node_id AND nodes.user_id = auth.uid())) WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM nodes WHERE nodes.id = spectrum_contrasts.node_id AND nodes.user_id = auth.uid()));

-- Política genérica para tablas cognitivas (todas las que tienen node_id)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('cognitive_snapshots','episodic_memory','cognitive_contradictions','cognitive_energy_states','performance_masks','identity_state_history','causal_relationships','phase_transitions','epistemic_confidence','meta_observer_state','counterfactual_analysis','execution_gap_history','environmental_load','twin_simulations','cognitive_invariants','cognitive_state_vectors','epistemic_events','inference_lineage','inference_conflicts','epistemic_warnings','orchestrator_state','module_health','cognitive_event_stream','replay_state','event_projections','cognitive_degradation','identity_lineage','attractor_history','narrative_saturation')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS cognitive_own_node ON %I', tbl);
    EXECUTE format('CREATE POLICY cognitive_own_node ON %I FOR ALL USING (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = %I.node_id AND nodes.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = %I.node_id AND nodes.user_id = auth.uid()))', tbl, tbl, tbl);
  END LOOP;
END;
$$;

-- =====================================================
-- 16. Trigger para updated_at en nodes
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_nodes_updated_at ON nodes;
CREATE TRIGGER update_nodes_updated_at
  BEFORE UPDATE ON nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Fin del script
-- =====================================================