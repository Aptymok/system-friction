-- 10_social_publishing.sql
-- Additive publishing metadata for scheduled real social posts.

ALTER TABLE actions
  ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'operational',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_actions_action_type ON actions(action_type);
CREATE INDEX IF NOT EXISTS idx_actions_due_pending ON actions(due_at, status);

ALTER TABLE telemetry_sources
  ADD COLUMN IF NOT EXISTS oauth_access_token TEXT,
  ADD COLUMN IF NOT EXISTS oauth_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS oauth_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS external_account_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE scheduler_jobs
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS action_id UUID REFERENCES actions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_scheduler_jobs_due ON scheduler_jobs(next_run, status);
CREATE INDEX IF NOT EXISTS idx_scheduler_jobs_action_id ON scheduler_jobs(action_id);
