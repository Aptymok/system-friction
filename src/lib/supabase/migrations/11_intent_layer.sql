-- 11_intent_layer.sql
-- Intenciones inmutables (solo humano puede crear/modificar)

CREATE TABLE IF NOT EXISTS intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  success_criteria JSONB NOT NULL,   -- función de verdad externa
  version INT DEFAULT 1,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registro de cambios de intención (solo para auditoría)
CREATE TABLE IF NOT EXISTS intent_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id UUID REFERENCES intents(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  old_objective TEXT,
  new_objective TEXT,
  reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Planes generados por Planner (múltiples candidatos)
CREATE TABLE IF NOT EXISTS planning_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id UUID REFERENCES intents(id),
  plan_label TEXT,   -- 'A', 'B', 'C', etc.
  description TEXT,
  steps JSONB,       -- lista de acciones
  probability NUMERIC,  -- estimación de éxito
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  cost_estimate JSONB,
  assumptions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resultados de simulación (sandbox, no escribe en estado real)
CREATE TABLE IF NOT EXISTS simulation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES planning_plans(id),
  scenario_count INT,
  success_probability NUMERIC,
  failure_modes JSONB,
  sensitivity JSONB,
  adversarial_checks JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log del gate de decisión (humano o regla)
CREATE TABLE IF NOT EXISTS decision_gate_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES planning_plans(id),
  decision_source TEXT CHECK (decision_source IN ('human', 'auto_high_confidence', 'auto_rejected')),
  confidence_threshold NUMERIC,
  actual_confidence NUMERIC,
  approved BOOLEAN,
  approved_by UUID REFERENCES auth.users(id),
  justification TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_intents_node ON intents(node_id);
CREATE INDEX IF NOT EXISTS idx_planning_plans_intent ON planning_plans(intent_id);
CREATE INDEX IF NOT EXISTS idx_simulation_plan ON simulation_results(plan_id);
CREATE INDEX IF NOT EXISTS idx_decision_gate_plan ON decision_gate_logs(plan_id);

-- RLS
ALTER TABLE intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_gate_logs ENABLE ROW LEVEL SECURITY;

-- Políticas: solo el usuario dueño del nodo puede leer/escribir sus intenciones
CREATE POLICY "intents_own" ON intents
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Similar para las demás tablas (se puede simplificar con herencia, pero lo dejamos explícito)
CREATE POLICY "planning_plans_own" ON planning_plans
  FOR ALL USING (EXISTS (SELECT 1 FROM intents WHERE intents.id = planning_plans.intent_id AND intents.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM intents WHERE intents.id = planning_plans.intent_id AND intents.user_id = auth.uid()));
