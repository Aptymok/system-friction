-- 06_epistemic_layer.sql
-- Eventos epistemológicos
CREATE TABLE IF NOT EXISTS epistemic_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL
        CHECK (signal_type IN ('observed', 'declared', 'inferred', 'simulated', 'projected', 'derived')),
    evidence_level TEXT NOT NULL
        CHECK (evidence_level IN ('direct', 'behavioral', 'statistical', 'semantic', 'speculative')),
    source_module TEXT NOT NULL,
    payload JSONB NOT NULL,
    confidence NUMERIC DEFAULT 0.5,
    parent_event_id UUID REFERENCES epistemic_events(id),
    inference_chain TEXT[] DEFAULT '{}',
    invalidated BOOLEAN DEFAULT FALSE,
    invalidation_reason TEXT,
    checksum TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_epistemic_events_node ON epistemic_events(node_id);
CREATE INDEX IF NOT EXISTS idx_epistemic_events_signal ON epistemic_events(signal_type);
CREATE INDEX IF NOT EXISTS idx_epistemic_events_confidence ON epistemic_events(confidence DESC);

-- Linaje de inferencias (DAG)
CREATE TABLE IF NOT EXISTS inference_lineage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_inference UUID,
    child_inference UUID,
    relation_type TEXT,
    propagated_confidence NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conflictos entre inferencias
CREATE TABLE IF NOT EXISTS inference_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    inference_a UUID,
    inference_b UUID,
    conflict_reason TEXT,
    severity NUMERIC DEFAULT 0.5,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Advertencias epistemológicas
CREATE TABLE IF NOT EXISTS epistemic_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    warning_type TEXT NOT NULL,
    message TEXT NOT NULL,
    severity NUMERIC DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE epistemic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE inference_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE inference_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE epistemic_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "epistemic_events_own_node" ON epistemic_events
    FOR ALL USING (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = epistemic_events.node_id AND nodes.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = epistemic_events.node_id AND nodes.user_id = auth.uid()));

CREATE POLICY "inference_conflicts_own_node" ON inference_conflicts
    FOR ALL USING (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = inference_conflicts.node_id AND nodes.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = inference_conflicts.node_id AND nodes.user_id = auth.uid()));

CREATE POLICY "epistemic_warnings_own_node" ON epistemic_warnings
    FOR ALL USING (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = epistemic_warnings.node_id AND nodes.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = epistemic_warnings.node_id AND nodes.user_id = auth.uid()));
