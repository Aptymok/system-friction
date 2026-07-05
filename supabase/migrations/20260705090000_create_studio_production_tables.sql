create extension if not exists "pgcrypto";

create table if not exists public.studio_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'active' check (status in ('active', 'archived', 'draft', 'blocked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_objects (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.studio_sessions(id) on delete set null,
  title text not null,
  object_type text not null check (object_type in ('music', 'video', 'image', 'text', 'community', 'time_coordinate', 'unknown')),
  source_uri text,
  mime_type text,
  size_bytes bigint,
  status text not null default 'uploaded' check (status in ('uploaded', 'analyzing', 'ready', 'blocked', 'failed', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_uploads (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.studio_objects(id) on delete cascade,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  status text not null default 'stored' check (status in ('stored', 'missing', 'degraded', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.studio_object_features (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.studio_objects(id) on delete cascade,
  feature_key text not null,
  label text,
  numeric_value double precision,
  text_value text,
  unit text,
  source text not null default 'studio_analysis',
  confidence double precision,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.studio_audio_features (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.studio_objects(id) on delete cascade,
  rms double precision,
  peak double precision,
  clipping_risk double precision,
  dynamic_range double precision,
  lufs double precision,
  spectral_centroid double precision,
  frequency_bands jsonb not null default '[]'::jsonb,
  waveform jsonb not null default '[]'::jsonb,
  energy_segments jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.studio_video_features (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.studio_objects(id) on delete cascade,
  shots integer,
  scenes integer,
  motion_intensity double precision,
  transition_rhythm double precision,
  visual_motifs jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.studio_image_features (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.studio_objects(id) on delete cascade,
  dominant_colors jsonb not null default '[]'::jsonb,
  texture_density double precision,
  visual_entropy double precision,
  spatial_balance double precision,
  symbolic_tags jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.studio_text_features (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.studio_objects(id) on delete cascade,
  tokens integer,
  sections integer,
  themes jsonb not null default '[]'::jsonb,
  motifs jsonb not null default '[]'::jsonb,
  sentiment_arousal double precision,
  narrative_arc jsonb not null default '[]'::jsonb,
  semantic_density double precision,
  symbolic_recurrence double precision,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.studio_community_features (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.studio_objects(id) on delete cascade,
  participant_count integer,
  message_density double precision,
  topic_clusters jsonb not null default '[]'::jsonb,
  affective_tone double precision,
  recurrence double precision,
  coherence double precision,
  friction double precision,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.studio_time_coordinates (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.studio_objects(id) on delete cascade,
  time_range text,
  place_label text,
  semantic_anchors jsonb not null default '[]'::jsonb,
  historical_vector_tags jsonb not null default '[]'::jsonb,
  dominant_tensions jsonb not null default '[]'::jsonb,
  gap_description text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.studio_hypotheses (
  id uuid primary key default gen_random_uuid(),
  object_id uuid references public.studio_objects(id) on delete cascade,
  origin text not null,
  severity text not null,
  statement text not null,
  recommended_change text,
  route text,
  sources jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.studio_interventions (
  id uuid primary key default gen_random_uuid(),
  object_id uuid references public.studio_objects(id) on delete cascade,
  hypothesis_id uuid references public.studio_hypotheses(id) on delete set null,
  title text not null,
  state text not null default 'queued' check (state in ('idle', 'queued', 'running', 'complete', 'blocked', 'failed')),
  scope text not null,
  expected_impact double precision,
  risk double precision,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.studio_evidence_traces (
  id uuid primary key default gen_random_uuid(),
  object_id uuid references public.studio_objects(id) on delete cascade,
  source text not null,
  label text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.studio_archive_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.studio_sessions(id) on delete set null,
  object_id uuid references public.studio_objects(id) on delete set null,
  event_type text not null,
  label text not null,
  source text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.studio_exports (
  id uuid primary key default gen_random_uuid(),
  object_id uuid references public.studio_objects(id) on delete cascade,
  label text not null,
  state text not null default 'queued' check (state in ('queued', 'running', 'complete', 'blocked', 'failed')),
  destination text,
  url text,
  checksum text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.studio_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  object_id uuid references public.studio_objects(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'complete', 'blocked', 'failed')),
  reason text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_studio_objects_session on public.studio_objects(session_id);
create index if not exists idx_studio_object_features_object on public.studio_object_features(object_id);
create index if not exists idx_studio_archive_events_object on public.studio_archive_events(object_id);
create index if not exists idx_studio_exports_object on public.studio_exports(object_id);
