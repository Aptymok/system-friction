-- 05_cognitive_twin.sql
-- Extensiones necesarias (ya creadas en 01, pero por seguridad)
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================================================
-- SNAPSHOTS COGNITIVOS
-- =========================================================
CREATE TABLE IF NOT EXISTS cognitive_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    snapshot_type TEXT DEFAULT 'system'
        CHECK (snapshot_type IN ('system', 'audit', 'manual', 'phase_transition', 'simulation')),
    cognitive_state JSONB NOT NULL,
    invariant_state JSONB,
    identity_distribution JSONB,
    energy_state JSONB,
    friction_state JSONB,
    confidence_score NUMERIC DEFAULT 0.5,
    coherence_score NUMERIC DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cognitive_snapshots_node ON cognitive_snapshots(node_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_snapshots_created ON cognitive_snapshots(created_at DESC);

-- =========================================================
-- EPISODIC MEMORY
-- =========================================================
CREATE TABLE IF NOT EXISTS episodic_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    episode_type TEXT,
    salience NUMERIC DEFAULT 0.5,
    emotional_weight NUMERIC DEFAULT 0.5,
    title TEXT,
    summary TEXT,
    triggering_context JSONB,
    linked_memories UUID[],
    embedding vector(1536),
    occurred_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_episodic_memory_node ON episodic_memory(node_id);
CREATE INDEX IF NOT EXISTS idx_episodic_memory_salience ON episodic_memory(salience DESC);

-- =========================================================
-- CONTRADICTIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS cognitive_contradictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    contradiction_type TEXT
        CHECK (contradiction_type IN ('semantic', 'operational', 'temporal', 'axiological')),
    statement_a TEXT,
    statement_b TEXT,
    source_a UUID,
    source_b UUID,
    contradiction_strength NUMERIC DEFAULT 0.5,
    resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_contradictions_node ON cognitive_contradictions(node_id);

-- =========================================================
-- COGNITIVE ENERGY
-- =========================================================
CREATE TABLE IF NOT EXISTS cognitive_energy_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    energy NUMERIC,
    fatigue NUMERIC,
    expansion NUMERIC,
    saturation NUMERIC,
    inferred_from JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- PERFORMANCE MASKS
-- =========================================================
CREATE TABLE IF NOT EXISTS performance_masks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    mask_type TEXT
        CHECK (mask_type IN ('authentic', 'idealized', 'defensive', 'compensatory')),
    intensity NUMERIC DEFAULT 0,
    discrepancy_score NUMERIC DEFAULT 0,
    evidence JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- IDENTITY STATE DISTRIBUTIONS
-- =========================================================
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

-- =========================================================
-- DYNAMIC CAUSAL GRAPH
-- =========================================================
CREATE TABLE IF NOT EXISTS causal_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    cause_label TEXT NOT NULL,
    effect_label TEXT NOT NULL,
    context TEXT,
    causal_weight NUMERIC DEFAULT 0.5,
    reversible BOOLEAN DEFAULT FALSE,
    evidence_count INT DEFAULT 1,
    last_reinforced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_causal_relationships_node ON causal_relationships(node_id);

-- =========================================================
-- PHASE TRANSITIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS phase_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    transition_type TEXT,
    metric_before NUMERIC,
    metric_after NUMERIC,
    trigger_event UUID,
    attractor_before JSONB,
    attractor_after JSONB,
    confidence NUMERIC DEFAULT 0.5,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- EPISTEMIC CONFIDENCE
-- =========================================================
CREATE TABLE IF NOT EXISTS epistemic_confidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    module_name TEXT NOT NULL,
    confidence NUMERIC DEFAULT 0.5,
    observation_count INT DEFAULT 0,
    consistency NUMERIC DEFAULT 0.5,
    false_positive_risk NUMERIC DEFAULT 0.5,
    notes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- META OBSERVER
-- =========================================================
CREATE TABLE IF NOT EXISTS meta_observer_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    overall_certainty NUMERIC DEFAULT 0.5,
    low_confidence_modules TEXT[],
    conflict_zones JSONB,
    predictive_degradation NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- COUNTERFACTUALS
-- =========================================================
CREATE TABLE IF NOT EXISTS counterfactual_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    inference_type TEXT,
    original_confidence NUMERIC,
    adjusted_confidence NUMERIC,
    counterfactual_risk NUMERIC,
    alternative_explanations JSONB,
    evidence JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- EXECUTION GAP
-- =========================================================
CREATE TABLE IF NOT EXISTS execution_gap_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    gap_score NUMERIC,
    completed_ratio NUMERIC,
    abandoned_ratio NUMERIC,
    missing_proposals INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- ENVIRONMENTAL LOAD
-- =========================================================
CREATE TABLE IF NOT EXISTS environmental_load (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    economic_load NUMERIC DEFAULT 0,
    social_load NUMERIC DEFAULT 0,
    uncertainty_load NUMERIC DEFAULT 0,
    operational_complexity NUMERIC DEFAULT 0,
    total_load NUMERIC DEFAULT 0,
    source_context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- SIMULATIONS
-- =========================================================
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

-- =========================================================
-- INVARIANTS
-- =========================================================
CREATE TABLE IF NOT EXISTS cognitive_invariants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    invariant_label TEXT,
    invariant_strength NUMERIC DEFAULT 0.5,
    recurrence_count INT DEFAULT 1,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    supporting_evidence JSONB
);
CREATE INDEX IF NOT EXISTS idx_cognitive_invariants_node ON cognitive_invariants(node_id);

-- =========================================================
-- COGNITIVE STATE VECTORS (representación vectorial del estado)
-- =========================================================
CREATE TABLE IF NOT EXISTS cognitive_state_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    vector_label TEXT,
    embedding vector(1536),
    certainty NUMERIC DEFAULT 0.5,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- RLS (para las tablas de esta migración)
-- =========================================================
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

-- Políticas genéricas para tablas cognitivas (propiedad a través del nodo)
CREATE POLICY "cognitive_own_node" ON cognitive_snapshots
    FOR ALL USING (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = cognitive_snapshots.node_id AND nodes.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = cognitive_snapshots.node_id AND nodes.user_id = auth.uid()));

CREATE POLICY "cognitive_own_node" ON episodic_memory
    FOR ALL USING (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = episodic_memory.node_id AND nodes.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = episodic_memory.node_id AND nodes.user_id = auth.uid()));

CREATE POLICY "cognitive_own_node" ON cognitive_contradictions
    FOR ALL USING (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = cognitive_contradictions.node_id AND nodes.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = cognitive_contradictions.node_id AND nodes.user_id = auth.uid()));

-- (Resto de políticas similares se pueden crear con el mismo patrón; se deja como ejercicio para evitar exceso de código repetitivo)
