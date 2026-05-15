-- 01_core.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'whatsapp')),
  whatsapp_phone TEXT UNIQUE,
  current_ihg NUMERIC DEFAULT 0,
  current_nti NUMERIC DEFAULT 0.5,
  current_ldi NUMERIC DEFAULT 0,
  auth_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync TIMESTAMPTZ,
  cognitive_version TEXT DEFAULT 'v1'
);

CREATE TABLE IF NOT EXISTS audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'whatsapp')),
  narrative TEXT,
  ihg NUMERIC,
  nti NUMERIC,
  ldi NUMERIC,
  verdict TEXT,
  diagnosis TEXT,
  loop_score NUMERIC,
  divergence NUMERIC,
  pattern TEXT,
  hard_stop BOOLEAN DEFAULT FALSE,
  proposed_action TEXT,
  certainty NUMERIC DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  whatsapp_session_id TEXT,
  external_id TEXT
);

-- ... resto de tablas (links, events, etc.) se mantienen igual.
-- Por brevedad, se asume que ya están definidas en tus migraciones anteriores.
-- Aquí solo incluimos la parte OAuth nueva.
