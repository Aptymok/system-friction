-- 04_security_rls.sql
-- Habilitar RLS en todas las tablas relevantes
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
ALTER TABLE interaction_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE attentional_drift ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_pressure ENABLE ROW LEVEL SECURITY;
-- Las tablas cognitivas (05) y superiores se agregarán en sus propias migraciones con RLS

-- Políticas para perfiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Nodos
DROP POLICY IF EXISTS "nodes_own" ON nodes;
CREATE POLICY "nodes_own" ON nodes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auditorías (a través del nodo)
DROP POLICY IF EXISTS "audits_own_node" ON audits;
CREATE POLICY "audits_own_node" ON audits
  FOR ALL USING (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = audits.node_id AND nodes.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = audits.node_id AND nodes.user_id = auth.uid())
  );

-- Intake sessions
DROP POLICY IF EXISTS "intake_sessions_own" ON intake_sessions;
CREATE POLICY "intake_sessions_own" ON intake_sessions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Intake responses
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

-- Acciones
DROP POLICY IF EXISTS "actions_own_node" ON actions;
CREATE POLICY "actions_own_node" ON actions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = actions.node_id AND nodes.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = actions.node_id AND nodes.user_id = auth.uid())
  );

-- Memory facts
DROP POLICY IF EXISTS "memory_facts_own_node" ON memory_facts;
CREATE POLICY "memory_facts_own_node" ON memory_facts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = memory_facts.node_id AND nodes.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = memory_facts.node_id AND nodes.user_id = auth.uid())
  );

-- Interaction events
DROP POLICY IF EXISTS "interaction_events_own" ON interaction_events;
CREATE POLICY "interaction_events_own" ON interaction_events
  FOR SELECT USING (auth.uid() = user_id);

-- AMV sessions
DROP POLICY IF EXISTS "amv_sessions_own_node" ON amv_sessions;
CREATE POLICY "amv_sessions_own_node" ON amv_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = amv_sessions.node_id AND nodes.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = amv_sessions.node_id AND nodes.user_id = auth.uid())
  );

-- AMV messages
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

-- Licenses
DROP POLICY IF EXISTS "licenses_own" ON licenses;
CREATE POLICY "licenses_own" ON licenses
  FOR SELECT USING (auth.uid() = user_id);

-- License entitlements
DROP POLICY IF EXISTS "license_entitlements_own_license" ON license_entitlements;
CREATE POLICY "license_entitlements_own_license" ON license_entitlements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM licenses WHERE licenses.id = license_entitlements.license_id AND licenses.user_id = auth.uid())
  );

-- Telemetry sources
DROP POLICY IF EXISTS "telemetry_sources_own" ON telemetry_sources;
CREATE POLICY "telemetry_sources_own" ON telemetry_sources
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- External signals (solo lectura)
DROP POLICY IF EXISTS "external_signals_own" ON external_signals;
CREATE POLICY "external_signals_own" ON external_signals
  FOR SELECT USING (auth.uid() = user_id);

-- Memory vectors
DROP POLICY IF EXISTS "memory_vectors_own_node" ON memory_vectors;
CREATE POLICY "memory_vectors_own_node" ON memory_vectors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = memory_vectors.node_id AND nodes.user_id = auth.uid())
  );

-- Telemetría de interacción (solo lectura)
DROP POLICY IF EXISTS "interaction_telemetry_own" ON interaction_telemetry;
CREATE POLICY "interaction_telemetry_own" ON interaction_telemetry
  FOR SELECT USING (auth.uid() = user_id);

-- Deriva atencional
DROP POLICY IF EXISTS "attentional_drift_own" ON attentional_drift;
CREATE POLICY "attentional_drift_own" ON attentional_drift
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = attentional_drift.node_id AND nodes.user_id = auth.uid())
  );

-- Presión semántica
DROP POLICY IF EXISTS "semantic_pressure_own" ON semantic_pressure;
CREATE POLICY "semantic_pressure_own" ON semantic_pressure
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM nodes WHERE nodes.id = semantic_pressure.node_id AND nodes.user_id = auth.uid())
  );
