-- 05_sfi_eval_assets.sql
-- Capa minima persistente para SFI-EVAL-ASSET.

CREATE TABLE IF NOT EXISTS sfi_assets (
  asset_id TEXT PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_system JSONB NOT NULL DEFAULT '{}'::jsonb,
  objective JSONB NOT NULL DEFAULT '{}'::jsonb,
  state_vector JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_phase TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sfi_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id TEXT NOT NULL REFERENCES sfi_assets(asset_id) ON DELETE CASCADE,
  IHG NUMERIC,
  NTI_obs NUMERIC,
  LDI_hours NUMERIC,
  xi_noise NUMERIC,
  PHI_SF NUMERIC,
  regime TEXT,
  runway_days INTEGER,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sfi_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id TEXT NOT NULL REFERENCES sfi_assets(asset_id) ON DELETE CASCADE,
  intervention_id TEXT,
  type TEXT,
  description TEXT,
  target_variable TEXT,
  expected_delta NUMERIC,
  actual_delta NUMERIC,
  verification BOOLEAN DEFAULT FALSE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sfi_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id TEXT NOT NULL REFERENCES sfi_assets(asset_id) ON DELETE CASCADE,
  output_type TEXT NOT NULL,
  file_name TEXT,
  storage_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sfi_logbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id TEXT NOT NULL REFERENCES sfi_assets(asset_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_sfi_assets_owner ON sfi_assets(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_sfi_assets_updated ON sfi_assets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sfi_measurements_asset_time ON sfi_measurements(asset_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_sfi_interventions_asset_time ON sfi_interventions(asset_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_sfi_outputs_asset_time ON sfi_outputs(asset_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sfi_logbook_asset_time ON sfi_logbook(asset_id, created_at DESC);

CREATE OR REPLACE FUNCTION touch_sfi_asset_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sfi_assets_updated_at ON sfi_assets;
CREATE TRIGGER trg_sfi_assets_updated_at
BEFORE UPDATE ON sfi_assets
FOR EACH ROW EXECUTE FUNCTION touch_sfi_asset_updated_at();

ALTER TABLE sfi_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfi_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfi_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfi_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfi_logbook ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sfi_assets_owner_or_root ON sfi_assets;
CREATE POLICY sfi_assets_owner_or_root ON sfi_assets
FOR ALL
USING (
  owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('root', 'system')
  )
)
WITH CHECK (
  owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('root', 'system')
  )
);

DROP POLICY IF EXISTS sfi_measurements_asset_owner_or_root ON sfi_measurements;
CREATE POLICY sfi_measurements_asset_owner_or_root ON sfi_measurements
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM sfi_assets
    WHERE sfi_assets.asset_id = sfi_measurements.asset_id
    AND (
      sfi_assets.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('root', 'system')
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sfi_assets
    WHERE sfi_assets.asset_id = sfi_measurements.asset_id
    AND (
      sfi_assets.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('root', 'system')
      )
    )
  )
);

DROP POLICY IF EXISTS sfi_interventions_asset_owner_or_root ON sfi_interventions;
CREATE POLICY sfi_interventions_asset_owner_or_root ON sfi_interventions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM sfi_assets
    WHERE sfi_assets.asset_id = sfi_interventions.asset_id
    AND (
      sfi_assets.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('root', 'system')
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sfi_assets
    WHERE sfi_assets.asset_id = sfi_interventions.asset_id
    AND (
      sfi_assets.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('root', 'system')
      )
    )
  )
);

DROP POLICY IF EXISTS sfi_outputs_asset_owner_or_root ON sfi_outputs;
CREATE POLICY sfi_outputs_asset_owner_or_root ON sfi_outputs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM sfi_assets
    WHERE sfi_assets.asset_id = sfi_outputs.asset_id
    AND (
      sfi_assets.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('root', 'system')
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sfi_assets
    WHERE sfi_assets.asset_id = sfi_outputs.asset_id
    AND (
      sfi_assets.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('root', 'system')
      )
    )
  )
);

DROP POLICY IF EXISTS sfi_logbook_asset_owner_or_root ON sfi_logbook;
CREATE POLICY sfi_logbook_asset_owner_or_root ON sfi_logbook
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM sfi_assets
    WHERE sfi_assets.asset_id = sfi_logbook.asset_id
    AND (
      sfi_assets.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('root', 'system')
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sfi_assets
    WHERE sfi_assets.asset_id = sfi_logbook.asset_id
    AND (
      sfi_assets.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('root', 'system')
      )
    )
  )
);
