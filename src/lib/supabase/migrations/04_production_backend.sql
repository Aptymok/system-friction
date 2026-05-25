-- 04_production_backend.sql
-- Produccion: media room, social resonance y root/system institucional.

DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('observer', 'operator', 'controller', 'root', 'system'));
END;
$$;

CREATE TABLE IF NOT EXISTS media_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id UUID,
  platform_target TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending_human_validation'
    CHECK (status IN ('pending_human_validation', 'approved', 'published', 'rejected')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS social_resonance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  post_id TEXT,
  resonance_score NUMERIC,
  engagement JSONB DEFAULT '{}'::jsonb,
  comments_summary TEXT,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_drafts_node ON media_drafts(node_id);
CREATE INDEX IF NOT EXISTS idx_media_drafts_status ON media_drafts(status);
CREATE INDEX IF NOT EXISTS idx_social_resonance_node ON social_resonance_events(node_id);
CREATE INDEX IF NOT EXISTS idx_social_resonance_platform ON social_resonance_events(platform);

ALTER TABLE media_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_resonance_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS media_drafts_own_node ON media_drafts;
CREATE POLICY media_drafts_own_node ON media_drafts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM nodes
    WHERE nodes.id = media_drafts.node_id
    AND nodes.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('root', 'system')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM nodes
    WHERE nodes.id = media_drafts.node_id
    AND nodes.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('root', 'system')
  )
);

DROP POLICY IF EXISTS social_resonance_events_own_node ON social_resonance_events;
CREATE POLICY social_resonance_events_own_node ON social_resonance_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM nodes
    WHERE nodes.id = social_resonance_events.node_id
    AND nodes.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('root', 'system')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM nodes
    WHERE nodes.id = social_resonance_events.node_id
    AND nodes.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('root', 'system')
  )
);
