CREATE TABLE IF NOT EXISTS epistemic_events (
    id UUID PRIMARY KEY,

    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,

    signal_type TEXT NOT NULL
    CHECK (
        signal_type IN (
            'observed',
            'declared',
            'inferred',
            'simulated',
            'projected',
            'derived'
        )
    ),

    evidence_level TEXT NOT NULL
    CHECK (
        evidence_level IN (
            'direct',
            'behavioral',
            'statistical',
            'semantic',
            'speculative'
        )
    ),

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

CREATE INDEX IF NOT EXISTS idx_epistemic_events_node
ON epistemic_events(node_id);

CREATE INDEX IF NOT EXISTS idx_epistemic_events_signal
ON epistemic_events(signal_type);

CREATE INDEX IF NOT EXISTS idx_epistemic_events_confidence
ON epistemic_events(confidence DESC);

ALTER TABLE epistemic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "epistemic_events_own_node"
ON epistemic_events
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM nodes
        WHERE nodes.id = epistemic_events.node_id
        AND nodes.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM nodes
        WHERE nodes.id = epistemic_events.node_id
        AND nodes.user_id = auth.uid()
    )
);

CREATE TABLE IF NOT EXISTS epistemic_events (
    id UUID PRIMARY KEY,

    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,

    signal_type TEXT NOT NULL
    CHECK (
        signal_type IN (
            'observed',
            'declared',
            'inferred',
            'simulated',
            'projected',
            'derived'
        )
    ),

    evidence_level TEXT NOT NULL
    CHECK (
        evidence_level IN (
            'direct',
            'behavioral',
            'statistical',
            'semantic',
            'speculative'
        )
    ),

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

CREATE INDEX IF NOT EXISTS idx_epistemic_events_node
ON epistemic_events(node_id);

CREATE INDEX IF NOT EXISTS idx_epistemic_events_signal
ON epistemic_events(signal_type);

CREATE INDEX IF NOT EXISTS idx_epistemic_events_confidence
ON epistemic_events(confidence DESC);

ALTER TABLE epistemic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "epistemic_events_own_node"
ON epistemic_events
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM nodes
        WHERE nodes.id = epistemic_events.node_id
        AND nodes.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM nodes
        WHERE nodes.id = epistemic_events.node_id
        AND nodes.user_id = auth.uid()
    )
);