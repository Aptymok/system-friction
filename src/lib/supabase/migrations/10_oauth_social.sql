-- 10_oauth_social.sql
-- Tabla para almacenar tokens OAuth de redes sociales
CREATE TABLE IF NOT EXISTS social_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('twitter', 'facebook', 'instagram', 'linkedin', 'tiktok')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  provider_user_id TEXT,
  scope TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Tabla para publicaciones programadas/publicadas
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  node_id UUID REFERENCES nodes(id),
  provider TEXT NOT NULL,
  content TEXT,
  media_urls TEXT[],
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed', 'cancelled')),
  external_post_id TEXT,
  engagement_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_social_tokens_user ON social_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_node ON social_posts(node_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);

-- RLS
ALTER TABLE social_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_tokens_own" ON social_tokens
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "social_posts_own" ON social_posts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
