CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'whatsapp')),
  whatsapp_phone TEXT UNIQUE,
  current_ihg NUMERIC DEFAULT 0,
  current_nti NUMERIC DEFAULT 0.5,
  current_ldi NUMERIC DEFAULT 0,
  auth_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync TIMESTAMP WITH TIME ZONE
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  whatsapp_session_id TEXT,
  external_id TEXT
);

CREATE TABLE IF NOT EXISTS whatsapp_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  question_number INT,
  question_text TEXT,
  answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('audit', 'simulation', 'whatsapp_sync', 'hard_stop')),
  payload JSONB,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audits_node_id ON audits(node_id);
CREATE INDEX IF NOT EXISTS idx_audits_created_at ON audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_token ON links(token);
CREATE INDEX IF NOT EXISTS idx_links_node_id ON links(node_id);
CREATE INDEX IF NOT EXISTS idx_events_node_id ON events(node_id);
CREATE INDEX IF NOT EXISTS idx_nodes_whatsapp_phone ON nodes(whatsapp_phone);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_nodes_updated_at ON nodes;
CREATE TRIGGER update_nodes_updated_at
  BEFORE UPDATE ON nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
