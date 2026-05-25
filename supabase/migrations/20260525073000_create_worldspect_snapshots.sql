create table if not exists public.worldspect_snapshots (
  id uuid primary key default gen_random_uuid(),

  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  source_state text not null check (source_state in ('observed', 'degraded')),
  evidence_level text not null default 'direct',
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),

  wsi numeric null,
  nti numeric null,

  degraded_sources text[] not null default '{}',

  sources jsonb not null default '[]'::jsonb,
  source_health jsonb not null default '[]'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,

  field_state_signal jsonb null,

  adapter_status text not null default 'unknown',
  adapter_error text null,

  ingest_mode text not null default 'manual' check (ingest_mode in ('daily_cron', 'manual', 'fallback_runtime')),

  snapshot_hash text not null,
  unique_date date generated always as ((observed_at at time zone 'utc')::date) stored
);

create unique index if not exists worldspect_snapshots_unique_daily
on public.worldspect_snapshots (unique_date, ingest_mode);

create index if not exists worldspect_snapshots_observed_at_idx
on public.worldspect_snapshots (observed_at desc);

create index if not exists worldspect_snapshots_source_state_idx
on public.worldspect_snapshots (source_state);

create index if not exists worldspect_snapshots_degraded_sources_idx
on public.worldspect_snapshots using gin (degraded_sources);

alter table public.worldspect_snapshots enable row level security;

drop policy if exists "worldspect snapshots are readable by authenticated users"
on public.worldspect_snapshots;

create policy "worldspect snapshots are readable by authenticated users"
on public.worldspect_snapshots
for select
to authenticated
using (true);
