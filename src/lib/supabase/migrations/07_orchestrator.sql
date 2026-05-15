-- 07_orchestrator.sql
-- Estado del orquestador
CREATE TABLE IF NOT EXISTS orchestrator_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    global_state JSONB,
    certainty NUMERIC DEFAULT 0.5,
    active_modules TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salud de los módulos
CREATE TABLE IF NOT EXISTS module_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_name TEXT NOT NULL,
    health_score NUMERIC DEFAULT 1.0,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    degradation_flags JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs programados (scheduler)
CREATE TABLE IF NOT EXISTS scheduler_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    schedule_cron TEXT,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cola de persistencia (para escritura asíncrona)
CREATE TABLE IF NOT EXISTS persistence_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation TEXT,
    payload JSONB,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE orchestrator_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE persistence_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orchestrator_state_own_node" ON orchestrator_state
    FOR ALL USING (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = orchestrator_state.node_id AND nodes.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM nodes WHERE nodes.id = orchestrator_state.node_id AND nodes.user_id = auth.uid()));

-- Las demás tablas son operacionales internas (no RLS necesario o se puede dejar sin políticas)
