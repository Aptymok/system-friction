-- supabase/migrations/20260802000000_mihm_state_registry.sql

CREATE TABLE IF NOT EXISTS mihm_state_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phi_sfi FLOAT NOT NULL,
  fs FLOAT NOT NULL,
  ihg FLOAT NOT NULL,
  nti FLOAT NOT NULL,
  ldi FLOAT NOT NULL,
  regime TEXT NOT NULL,
  source_observation_ids UUID[] DEFAULT '{}',
  source_evidence_ids UUID[] DEFAULT '{}',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mihm_state_time
ON mihm_state_registry(calculated_at DESC);