create extension if not exists pgcrypto;

create table if not exists public.sfi_external_evidence_observations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid null,
  object_id text not null,
  object_class text not null,
  source_type text not null,
  source_ref text null,
  metric_key text not null,
  raw_value jsonb not null,
  normalized_value numeric null check (normalized_value >= 0 and normalized_value <= 1),
  unit text null,
  reliability numeric not null check (reliability >= 0 and reliability <= 1),
  evidence_note text not null check (length(trim(evidence_note)) >= 6),
  epistemic_class text not null default 'declared'
    check (epistemic_class in ('observed', 'declared', 'derived', 'inferred', 'missing')),
  captured_at timestamptz not null,
  operator_id uuid null,
  consent_evidence_id text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (object_id, metric_key, captured_at, source_type)
);

create index if not exists sfi_external_evidence_object_idx
  on public.sfi_external_evidence_observations (object_id, captured_at desc);

create index if not exists sfi_external_evidence_case_idx
  on public.sfi_external_evidence_observations (case_id, captured_at desc);

create index if not exists sfi_external_evidence_metric_idx
  on public.sfi_external_evidence_observations (metric_key, captured_at desc);

create or replace function public.set_sfi_external_evidence_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_sfi_external_evidence_updated_at on public.sfi_external_evidence_observations;
create trigger set_sfi_external_evidence_updated_at
before update on public.sfi_external_evidence_observations
for each row execute function public.set_sfi_external_evidence_updated_at();

alter table public.sfi_external_evidence_observations enable row level security;

drop policy if exists "external evidence service role full access"
on public.sfi_external_evidence_observations;
create policy "external evidence service role full access"
on public.sfi_external_evidence_observations
for all to service_role using (true) with check (true);

revoke all on public.sfi_external_evidence_observations from anon, authenticated;
grant select, insert, update, delete on public.sfi_external_evidence_observations to service_role;

comment on table public.sfi_external_evidence_observations is
  'Audited external observations translated into comparable AMV evidence. Null normalized values remain null; no silent estimation.';
comment on column public.sfi_external_evidence_observations.reliability is
  'Operator-declared or connector-derived reliability in [0,1]. It is not inferred from the observed value.';
comment on column public.sfi_external_evidence_observations.evidence_note is
  'Required provenance and interpretation note explaining what was captured and under what conditions.';
