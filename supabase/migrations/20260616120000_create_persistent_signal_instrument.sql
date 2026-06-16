create table if not exists public.persistent_signals (
  id uuid primary key default gen_random_uuid(),
  signal_hash text not null unique,
  label text,
  description text,
  scope text not null default 'sfi',
  state text not null default 'latent'
    check (state in ('latent', 'emerging', 'crystallizing', 'consolidated', 'degraded')),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  occurrence_count integer not null default 0 check (occurrence_count >= 0),
  modalities jsonb not null default '[]'::jsonb,
  persistence_score numeric not null default 0 check (persistence_score >= 0 and persistence_score <= 1),
  cross_modal_score numeric not null default 0 check (cross_modal_score >= 0 and cross_modal_score <= 1),
  drift_score numeric not null default 0 check (drift_score >= 0 and drift_score <= 1),
  entropy_score numeric not null default 0 check (entropy_score >= 0 and entropy_score <= 1),
  mihm_snapshot jsonb,
  worldspect_snapshot jsonb,
  supporting_vectors jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.signal_manifestations (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.persistent_signals(id) on delete cascade,
  source_type text not null,
  source_id text,
  modality text not null
    check (modality in ('text', 'image', 'audio', 'video', 'event', 'mixed', 'unknown')),
  content_hash text,
  embedding jsonb,
  similarity numeric not null default 0 check (similarity >= 0 and similarity <= 1),
  observed_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists persistent_signals_state_idx
on public.persistent_signals (state, updated_at desc);

create index if not exists persistent_signals_scope_idx
on public.persistent_signals (scope, updated_at desc);

create index if not exists persistent_signals_last_seen_idx
on public.persistent_signals (last_seen desc);

create index if not exists signal_manifestations_signal_idx
on public.signal_manifestations (signal_id, observed_at desc);

create index if not exists signal_manifestations_source_idx
on public.signal_manifestations (source_type, source_id);

create index if not exists signal_manifestations_modality_idx
on public.signal_manifestations (modality, observed_at desc);
