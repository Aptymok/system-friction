create table if not exists public.world_vector_cycles (
  id uuid primary key default gen_random_uuid(),
  cycle_start_date date not null,
  cycle_end_date date not null,
  status text not null check (status in ('open','closing','closed','degraded')),
  dominant_domain text,
  dominant_signal text,
  summary_internal text,
  summary_public text,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (cycle_start_date, cycle_end_date)
);

create index if not exists world_vector_cycles_status_idx
  on public.world_vector_cycles (status);

create index if not exists world_vector_cycles_dates_idx
  on public.world_vector_cycles (cycle_start_date desc, cycle_end_date desc);

alter table public.world_vector_cycles enable row level security;

drop policy if exists "world vector cycles service role full access"
on public.world_vector_cycles;

create policy "world vector cycles service role full access"
on public.world_vector_cycles
for all
to service_role
using (true)
with check (true);

revoke all on public.world_vector_cycles from anon, authenticated;
grant all on public.world_vector_cycles to service_role;
