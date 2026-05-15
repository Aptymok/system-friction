-- 08_event_sourcing.sql
-- Stream de eventos cognitivos (event sourcing)
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
CREATE INDEX IF NOT EXISTS idx_cognitive_event_stream_node ON cognitive_event_stream(node_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_event_stream_sequence ON cognitive_event_stream(sequence_number);

-- Estado para replay
CREATE TABLE IF NOT EXISTS replay_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    last_replayed_sequence BIGINT DEFAULT 0,
    current_state JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proyecciones de eventos (materialized views opcionales)
CREATE TABLE IF NOT EXISTS event_projections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projection_name TEXT NOT NULL,
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    snapshot JSONB,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE cognitive_event_stream ENABLE ROW LEVEL SECURITY;
ALTER TABLE replay_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cognitive_event_stream_own_node" ON cognitive_event_stream
    FOR SELECT USING (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = cognitive_event_stream.node_id AND nodes.user_id = auth.uid()));
