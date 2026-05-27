create table if not exists public.epistemic_events (
  id uuid primary key default gen_random_uuid(),
  sequence bigint generated always as identity,
  event_id text not null unique,
  event_name text not null,
  logbook_id text not null,
  epistemic_class text not null check (epistemic_class in ('observed', 'declared', 'derived', 'inferred', 'simulated', 'fixture', 'missing')),
  schema_version text not null,
  source jsonb not null default '{}'::jsonb,
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  payload jsonb not null,
  checksum text not null,
  lineage text[] not null default '{}',
  uncertainty text null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  hash_prev text null,
  hash_self text not null unique
);

create index if not exists epistemic_events_logbook_sequence_idx
on public.epistemic_events (logbook_id, sequence);

create index if not exists epistemic_events_created_at_idx
on public.epistemic_events (created_at desc);

alter table public.epistemic_events enable row level security;
