create extension if not exists pgcrypto;

create table if not exists public.sfi_reference_cases (
  id uuid primary key default gen_random_uuid(),
  case_code text not null unique,
  entity_id text null,
  object_id text not null,
  object_class text not null check (object_class in (
    'music','article','social_post','website','institution','company','ai_response',
    'historical_event','cultural_signal','person','organization','movement','other'
  )),
  title text not null,
  manifestation text null,
  cohort text not null default 'unassigned',
  prospective boolean not null default true,
  status text not null default 'REGISTERED' check (status in (
    'REGISTERED','OBSERVING','WAITING_OUTCOME','CLOSED','UNVERIFIABLE','ARCHIVED'
  )),
  opened_at timestamptz not null,
  closed_at timestamptz null,
  t0_cutoff timestamptz not null,
  phase_status jsonb not null default '{}'::jsonb,
  fields_documented text[] not null default '{}'::text[],
  missing_fields text[] not null default '{}'::text[],
  prediction_run_id uuid null references public.sfi_predictive_runs(id) on delete set null,
  intervention_id uuid null,
  outcome_id uuid null references public.sfi_predictive_outcomes(id) on delete set null,
  model_key text null,
  model_version integer null,
  operator_id uuid null,
  second_operator_id uuid null,
  consent_required boolean not null default false,
  consent_evidence_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sfi_reference_cases_object_idx
  on public.sfi_reference_cases (object_id, opened_at desc);
create index if not exists sfi_reference_cases_class_idx
  on public.sfi_reference_cases (object_class, cohort, status);
create index if not exists sfi_reference_cases_prediction_idx
  on public.sfi_reference_cases (prediction_run_id);

create table if not exists public.sfi_case_evidence_links (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.sfi_reference_cases(id) on delete cascade,
  evidence_source text not null,
  evidence_id text not null,
  relation_type text not null check (relation_type in (
    'SUPPORTS','CONTRADICTS','CONTEXTUALIZES','VERIFIES_OUTCOME',
    'DOCUMENTS_INTERVENTION','GOVERNS','RECORDS_ACCESS'
  )),
  note text null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  unique (case_id, evidence_source, evidence_id, relation_type)
);

create index if not exists sfi_case_evidence_links_case_idx
  on public.sfi_case_evidence_links (case_id, relation_type);
create index if not exists sfi_case_evidence_links_evidence_idx
  on public.sfi_case_evidence_links (evidence_source, evidence_id);

create or replace function public.set_sfi_reference_bank_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_sfi_reference_cases_updated_at on public.sfi_reference_cases;
create trigger set_sfi_reference_cases_updated_at
before update on public.sfi_reference_cases
for each row execute function public.set_sfi_reference_bank_updated_at();

alter table public.sfi_reference_cases enable row level security;
alter table public.sfi_case_evidence_links enable row level security;

drop policy if exists "reference cases service role full access" on public.sfi_reference_cases;
create policy "reference cases service role full access"
on public.sfi_reference_cases for all to service_role using (true) with check (true);

drop policy if exists "case evidence links service role full access" on public.sfi_case_evidence_links;
create policy "case evidence links service role full access"
on public.sfi_case_evidence_links for all to service_role using (true) with check (true);

revoke all on public.sfi_reference_cases from anon, authenticated;
revoke all on public.sfi_case_evidence_links from anon, authenticated;
grant select, insert, update, delete on public.sfi_reference_cases to service_role;
grant select, insert, update, delete on public.sfi_case_evidence_links to service_role;

comment on table public.sfi_reference_cases is
  'Canonical AMV Reference Bank. One row is one observable case, not one metric snapshot.';
comment on table public.sfi_case_evidence_links is
  'Explicit semantic links between a case and evidence. Access traces remain RECORDS_ACCESS, not phenomenon evidence.';
