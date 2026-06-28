create table if not exists public.world_vector_reports (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references public.world_vector_cycles(id) on delete set null,
  report_type text not null check (report_type in ('internal_daily','public_weekly','cycle_close')),
  target_audience text not null check (target_audience in ('founder','linkedin','repository')),
  generated_at timestamptz not null default now(),
  period_start date,
  period_end date,
  title text not null,
  body text not null,
  json_payload jsonb not null default '{}'::jsonb,
  status text not null check (status in ('draft','approved','published','archived')),
  created_at timestamptz not null default now()
);

create index if not exists world_vector_reports_cycle_id_idx
  on public.world_vector_reports (cycle_id);

create index if not exists world_vector_reports_report_type_idx
  on public.world_vector_reports (report_type);

create index if not exists world_vector_reports_target_audience_idx
  on public.world_vector_reports (target_audience);

create index if not exists world_vector_reports_generated_at_idx
  on public.world_vector_reports (generated_at desc);

create index if not exists world_vector_reports_status_idx
  on public.world_vector_reports (status);

alter table public.world_vector_reports enable row level security;

drop policy if exists "world vector reports service role full access"
on public.world_vector_reports;

create policy "world vector reports service role full access"
on public.world_vector_reports
for all
to service_role
using (true)
with check (true);

revoke all on public.world_vector_reports from anon, authenticated;
grant all on public.world_vector_reports to service_role;
