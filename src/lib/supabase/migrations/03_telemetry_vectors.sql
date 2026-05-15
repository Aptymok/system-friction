-- 03_telemetry_vectors.sql
-- Telemetría fina de interacción
CREATE TABLE IF NOT EXISTS interaction_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
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

-- Sesiones de telemetría (agrupación temporal)
CREATE TABLE IF NOT EXISTS telemetry_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  source TEXT,
  session_metadata JSONB
);

-- Deriva atencional
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

-- Presión semántica
CREATE TABLE IF NOT EXISTS semantic_pressure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  expansion_pressure NUMERIC,
  closure_pressure NUMERIC,
  dominant_mode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_interaction_telemetry_node ON interaction_telemetry(node_id);
CREATE INDEX IF NOT EXISTS idx_attentional_drift_node ON attentional_drift(node_id);
CREATE INDEX IF NOT EXISTS idx_semantic_pressure_node ON semantic_pressure(node_id);
