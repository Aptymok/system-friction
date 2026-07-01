-- SFI indicator snapshots: historical time series for IHG / NTI / LDI / WSV so the
-- Observatory can compute a real 24h delta instead of a cosmetic placeholder.
-- One row per cron run (target cadence: hourly). domain_breakdown stores the same
-- real domain_values already produced by src/lib/world-vector/deriveObservation.ts
-- (institutional, technology_ai_data, economy_market_capital, culture_signal_narrative,
-- social_behavioral, architecture_city_space) — not a new invented taxonomy.

create table if not exists public.sfi_indicator_snapshots (
  id uuid primary key default gen_random_uuid(),
  captured_at timestamptz not null default now(),
  ihg numeric not null,
  nti numeric not null,
  ldi numeric not null,
  wsv numeric not null,
  domain_breakdown jsonb not null default '[]'::jsonb,
  source_status text not null check (source_status in ('observed', 'thin', 'degraded', 'failed')),
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sfi_indicator_snapshots_captured_at_idx
  on public.sfi_indicator_snapshots (captured_at desc);

alter table public.sfi_indicator_snapshots enable row level security;

drop policy if exists "sfi indicator snapshots service role full access"
on public.sfi_indicator_snapshots;

create policy "sfi indicator snapshots service role full access"
on public.sfi_indicator_snapshots
for all
to service_role
using (true)
with check (true);

-- Public read is intentional and narrow: only the four numeric indicators, the
-- domain breakdown and the timestamp are ever selected by the client-facing
-- Observatory query (see src/lib/sfi/indicatorSnapshot.ts). No private/internal
-- fields exist on this table, so read access does not leak governed state.
drop policy if exists "sfi indicator snapshots public read" on public.sfi_indicator_snapshots;

create policy "sfi indicator snapshots public read"
on public.sfi_indicator_snapshots
for select
to anon, authenticated
using (true);

grant select on public.sfi_indicator_snapshots to anon, authenticated;
grant all on public.sfi_indicator_snapshots to service_role;
