-- 12_multitenant_rbac.sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'observer'
    CHECK (role IN ('observer', 'operator', 'controller', 'root')),
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS module_access JSONB DEFAULT '{"observatory": true, "planner": false, "simulator": false, "executor": false, "social": false}',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO modules (module_key, name, description, base_price) VALUES
  ('observatory', 'Observatorio', 'Lectura de métricas y estado del sistema', 0),
  ('planner', 'Planificador', 'Generación de planes A/B/C', 10),
  ('simulator', 'Simulador', 'Sandbox con Monte Carlo', 15),
  ('executor', 'Ejecutor', 'Ejecución de acciones', 20),
  ('social', 'Redes Sociales', 'Publicación automática', 25)
ON CONFLICT (module_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  modules JSONB NOT NULL,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_own" ON subscriptions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
