CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY,
  alias TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE nodes
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS alias TEXT,
  ADD COLUMN IF NOT EXISTS objective TEXT,
  ADD COLUMN IF NOT EXISTS current_severity NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_pattern TEXT,
  ADD COLUMN IF NOT EXISTS last_resolution_at TIMESTAMP WITH TIME ZONE;

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

CREATE TABLE IF NOT EXISTS intake_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_session_id UUID REFERENCES intake_sessions(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
  recurrence_count INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  source TEXT DEFAULT 'web',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS amv_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES amv_sessions(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  question_index INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS license_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  entitlement_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  limits JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  signal_strength NUMERIC DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE amv_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE amv_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_vectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "nodes_own" ON nodes;
CREATE POLICY "nodes_own" ON nodes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "audits_own_node" ON audits;
CREATE POLICY "audits_own_node" ON audits
  FOR ALL USING (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = audits.node_id AND nodes.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = audits.node_id AND nodes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "intake_sessions_own" ON intake_sessions;
CREATE POLICY "intake_sessions_own" ON intake_sessions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "intake_responses_own_session" ON intake_responses;
CREATE POLICY "intake_responses_own_session" ON intake_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM intake_sessions
      WHERE intake_sessions.id = intake_responses.intake_session_id
      AND intake_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM intake_sessions
      WHERE intake_sessions.id = intake_responses.intake_session_id
      AND intake_sessions.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "actions_own_node" ON actions;
CREATE POLICY "actions_own_node" ON actions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = actions.node_id AND nodes.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = actions.node_id AND nodes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "memory_facts_own_node" ON memory_facts;
CREATE POLICY "memory_facts_own_node" ON memory_facts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = memory_facts.node_id AND nodes.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = memory_facts.node_id AND nodes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "interaction_events_own" ON interaction_events;
CREATE POLICY "interaction_events_own" ON interaction_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "amv_sessions_own_node" ON amv_sessions;
CREATE POLICY "amv_sessions_own_node" ON amv_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = amv_sessions.node_id AND nodes.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = amv_sessions.node_id AND nodes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "amv_messages_own_session" ON amv_messages;
CREATE POLICY "amv_messages_own_session" ON amv_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM amv_sessions
      JOIN nodes ON nodes.id = amv_sessions.node_id
      WHERE amv_sessions.id = amv_messages.session_id
      AND nodes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM amv_sessions
      JOIN nodes ON nodes.id = amv_sessions.node_id
      WHERE amv_sessions.id = amv_messages.session_id
      AND nodes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "licenses_own" ON licenses;
CREATE POLICY "licenses_own" ON licenses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "license_entitlements_own_license" ON license_entitlements;
CREATE POLICY "license_entitlements_own_license" ON license_entitlements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM licenses WHERE licenses.id = license_entitlements.license_id AND licenses.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "telemetry_sources_own" ON telemetry_sources;
CREATE POLICY "telemetry_sources_own" ON telemetry_sources
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "external_signals_own" ON external_signals;
CREATE POLICY "external_signals_own" ON external_signals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "memory_vectors_own_node" ON memory_vectors;
CREATE POLICY "memory_vectors_own_node" ON memory_vectors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = memory_vectors.node_id AND nodes.user_id = auth.uid())
  );
