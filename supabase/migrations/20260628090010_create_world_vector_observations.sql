create table if not exists public.world_vector_observations (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references public.world_vector_cycles(id) on delete set null,
  observed_at timestamptz not null,
  day_of_week text not null,
  sector text not null,
  source_snapshot_id uuid,
  domain_values jsonb not null default '[]'::jsonb,
  dominant_sources jsonb not null default '[]'::jsonb,
  dominant_signal text,
  interpretation text,
  confidence numeric,
  status text not null check (status in ('observed','thin','degraded','failed')),
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists world_vector_observations_observed_at_idx
  on public.world_vector_observations (observed_at desc);

create index if not exists world_vector_observations_cycle_id_idx
  on public.world_vector_observations (cycle_id);

create index if not exists world_vector_observations_sector_idx
  on public.world_vector_observations (sector);

create index if not exists world_vector_observations_status_idx
  on public.world_vector_observations (status);

alter table public.world_vector_observations enable row level security;

drop policy if exists "world vector observations service role full access"
on public.world_vector_observations;

create policy "world vector observations service role full access"
on public.world_vector_observations
for all
to service_role
using (true)
with check (true);

revoke all on public.world_vector_observations from anon, authenticated;
grant all on public.world_vector_observations to service_role;
