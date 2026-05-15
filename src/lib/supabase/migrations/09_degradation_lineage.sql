-- 09_degradation_lineage.sql
-- Degradación cognitiva
CREATE TABLE IF NOT EXISTS cognitive_degradation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    degradation_score NUMERIC DEFAULT 0,
    narrative_saturation NUMERIC DEFAULT 0,
    symbolic_overfit NUMERIC DEFAULT 0,
    temporal_fragmentation NUMERIC DEFAULT 0,
    predictive_decay NUMERIC DEFAULT 0,
    recommended_recalibration JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Linaje de identidad (genealogía de transformaciones)
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

-- Historia de atractores
CREATE TABLE IF NOT EXISTS attractor_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    attractor_label TEXT,
    stability NUMERIC,
    dominant_variables JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saturación narrativa (medición de cristalización)
CREATE TABLE IF NOT EXISTS narrative_saturation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    saturation_index NUMERIC,
    repetitive_phrases JSONB,
    novelty_score NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE cognitive_degradation ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE attractor_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE narrative_saturation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "degradation_own_node" ON cognitive_degradation
    FOR ALL USING (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = cognitive_degradation.node_id AND nodes.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = cognitive_degradation.node_id AND nodes.user_id = auth.uid()));

-- (Políticas similares para las demás tablas)
