-- 02_identity_memory.sql
-- Perfiles de usuario
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY,
  alias TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE
);

-- Extender nodos con campos de identidad
ALTER TABLE nodes
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS alias TEXT,
  ADD COLUMN IF NOT EXISTS objective TEXT,
  ADD COLUMN IF NOT EXISTS current_severity NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_pattern TEXT,
  ADD COLUMN IF NOT EXISTS last_resolution_at TIMESTAMP WITH TIME ZONE;

-- Sesiones de intake
CREATE TABLE IF NOT EXISTS intake_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  email TEXT NOT NULL,
  objective TEXT NOT NULL,
  current_friction TEXT NOT NULL,
  initial_ihg NUMERIC DEFAULT 0,
  initial_nti NUMERIC DEFAULT 0.5,
  initial_ldi NUMERIC DEFAULT 72,
  initial_pattern TEXT,
  initial_severity NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Respuestas de intake
CREATE TABLE IF NOT EXISTS intake_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_session_id UUID REFERENCES intake_sessions(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Acciones verificables
CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  audit_id UUID REFERENCES audits(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  verification_criterion TEXT NOT NULL,
  due_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed', 'invalidated')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hechos de memoria
CREATE TABLE IF NOT EXISTS memory_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  audit_id UUID REFERENCES audits(id) ON DELETE SET NULL,
  fact_type TEXT NOT NULL CHECK (fact_type IN ('objective', 'loop', 'constraint', 'emotion_pattern', 'missed_action', 'direction_change', 'external_signal')),
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence NUMERIC DEFAULT 0.5,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recurrence_count INT DEFAULT 1,
  embedding vector(1536)
);

-- Eventos de interacción (memoria extendida)
CREATE TABLE IF NOT EXISTS interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  source TEXT DEFAULT 'web',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fuentes de telemetría externa
CREATE TABLE IF NOT EXISTS telemetry_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('oauth', 'webhook', 'manual_import', 'rss', 'api')),
  handle TEXT,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'revoked', 'error')),
  consent_scope JSONB DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Señales externas ingeridas
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
  signal_strength NUMERIC DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vectores de memoria
CREATE TABLE IF NOT EXISTS memory_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sesiones de AMV
CREATE TABLE IF NOT EXISTS amv_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  user_id UUID,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  question_count INT DEFAULT 0,
  final_reading JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Mensajes AMV
CREATE TABLE IF NOT EXISTS amv_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES amv_sessions(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  question_index INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Licencias
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_key TEXT NOT NULL,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'trialing', 'past_due', 'canceled')),
  provider TEXT DEFAULT 'manual',
  provider_subscription_id TEXT,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Entitlements de licencia
CREATE TABLE IF NOT EXISTS license_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  entitlement_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  limits JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_nodes_user_id ON nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_intake_sessions_node_id ON intake_sessions(node_id);
CREATE INDEX IF NOT EXISTS idx_actions_node_id ON actions(node_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
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
