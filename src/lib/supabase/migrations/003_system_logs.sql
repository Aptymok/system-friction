-- Tabla bitacora_colectiva (patrones anónimos agregados)
CREATE TABLE IF NOT EXISTS bitacora_colectiva (
  id SERIAL PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value FLOAT,
  context JSONB,
  ts TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla bitacora_usuario (historial de interacciones por usuario)
CREATE TABLE IF NOT EXISTS bitacora_usuario (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT,
  event_data JSONB,
  ts TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla bitacora_agente (auto-análisis diario del agente)
CREATE TABLE IF NOT EXISTS bitacora_agente (
  id SERIAL PRIMARY KEY,
  agent_version TEXT,
  analysis JSONB,
  ts TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bitacora_usuario_user_id ON bitacora_usuario(user_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_colectiva_ts ON bitacora_colectiva(ts);