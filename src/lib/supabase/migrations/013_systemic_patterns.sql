-- Tabla de patrones sistémicos (100+20)
CREATE TABLE IF NOT EXISTS systemic_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id TEXT UNIQUE NOT NULL,   -- e.g., 'ecosistema-01', 'umbral-dual'
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB,                   -- condiciones de activación (ej. {"ihg_min": -0.4, "nti_max": 0.5})
  mihm_mapping JSONB,                -- variables MIHM asociadas
  falsification TEXT,
  doc_refs TEXT[],
  severity TEXT DEFAULT 'MEDIUM',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_systemic_patterns_id ON systemic_patterns(pattern_id);

-- Insertar patrones existentes desde patterns_v4.json (se hará mediante script)