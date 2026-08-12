create table if not exists public.sfi_world_day_ledger (
  id uuid primary key default gen_random_uuid(),
  world_date date not null unique,
  day_number integer not null unique check (day_number > 0),
  origin_date date not null default date '2026-06-02',
  phase text not null check (phase in ('RECONSTRUCTED_HISTORY','PROSPECTIVE_GENESIS','LIVE')),
  reconstruction_status text not null check (reconstruction_status in ('TIME_COORDINATE_ONLY','EVIDENCE_ATTACHED','LIVE_EMPTY','LIVE_OBSERVED')),
  evidence_keys text[] not null default '{}',
  evidence_count integer not null default 0 check (evidence_count >= 0),
  source_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sfi_world_day_ledger_day_number_idx
  on public.sfi_world_day_ledger (day_number);

create index if not exists sfi_world_day_ledger_phase_idx
  on public.sfi_world_day_ledger (phase, world_date desc);

alter table public.sfi_world_day_ledger enable row level security;

drop policy if exists "sfi world day ledger service role full access"
on public.sfi_world_day_ledger;

create policy "sfi world day ledger service role full access"
on public.sfi_world_day_ledger
for all
to service_role
using (true)
with check (true);

revoke all on public.sfi_world_day_ledger from anon, authenticated;
grant all on public.sfi_world_day_ledger to service_role;

comment on table public.sfi_world_day_ledger is
  'Persistent UTC world-day spine for SFI. A day row may exist without an event; absence of reconstructed evidence is not itself evidence of inactivity.';
