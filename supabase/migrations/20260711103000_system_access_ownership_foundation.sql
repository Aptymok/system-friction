create extension if not exists pgcrypto;

-- FIELD profile extends the existing profiles/account system without replacing it.
create table if not exists public.field_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  consent_version text,
  consented_at timestamptz,
  privacy_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.field_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  title text not null,
  domain text not null,
  declared_attractor text not null,
  baseline text not null,
  consent boolean not null default false,
  visibility text not null default 'private' check (visibility in ('private','founder','public_candidate')),
  verification_window text not null check (verification_window in ('72h','7d','30d')),
  status text not null default 'PENDING',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.field_case_evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.field_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  evidence_type text not null,
  label text not null,
  source text not null,
  reliability numeric,
  storage_path text,
  uri text,
  visibility text not null default 'private' check (visibility in ('private','founder','public_candidate')),
  payload jsonb not null default '{}'::jsonb,
  observed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.field_moph_runs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.field_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'PENDING',
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  evidence_ids uuid[] not null default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.field_mihm_readings (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.field_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'PENDING',
  metrics jsonb not null default '[]'::jsonb,
  tensions jsonb not null default '[]'::jsonb,
  formula_version text,
  evidence_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.field_hypotheses (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.field_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  statement text not null,
  target text not null,
  expected_signal text not null,
  verification_window text not null check (verification_window in ('72h','7d','30d')),
  confidence numeric,
  status text not null default 'PENDING',
  evidence_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.field_interventions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.field_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  hypothesis_id uuid not null references public.field_hypotheses(id) on delete cascade,
  minimum_change text not null,
  prohibited_effects text[] not null default '{}',
  status text not null default 'PENDING',
  started_at timestamptz,
  completed_at timestamptz,
  evidence_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.field_returns (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.field_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  intervention_id uuid references public.field_interventions(id) on delete set null,
  verification_window text not null check (verification_window in ('72h','7d','30d')),
  expected_at timestamptz not null,
  returned_at timestamptz,
  status text not null default 'PENDING',
  evidence_ids uuid[] not null default '{}',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.field_outcomes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.field_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  intervention_id uuid not null references public.field_interventions(id) on delete cascade,
  expected text not null,
  actual text not null,
  delta numeric,
  verified boolean,
  learned text,
  evidence_ids uuid[] not null default '{}',
  recorded_at timestamptz not null default now()
);

create table if not exists public.field_lessons (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.field_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  outcome_id uuid not null references public.field_outcomes(id) on delete cascade,
  statement text not null,
  evidence_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.sfi_publications (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id text not null,
  approved_by uuid references auth.users(id) on delete set null,
  public_fields text[] not null default '{}',
  public_payload jsonb not null default '{}'::jsonb,
  snapshot_version text,
  confidence numeric,
  status text not null default 'DRAFT' check (status in ('DRAFT','REVIEWED','APPROVED_FOR_PUBLICATION','PUBLISHED','SUPERSEDED','RETRACTED')),
  reviewed_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  retracted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sfi_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null,
  before_state jsonb,
  after_state jsonb,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Non-destructive Studio ownership foundation. Existing rows remain nullable until explicitly backfilled.
alter table public.studio_sessions add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.studio_objects add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.studio_uploads add column if not exists owner_id uuid references auth.users(id) on delete set null;

create index if not exists field_cases_owner_idx on public.field_cases(owner_id, updated_at desc);
create index if not exists field_case_evidence_owner_case_idx on public.field_case_evidence(owner_id, case_id, created_at desc);
create index if not exists field_moph_runs_owner_case_idx on public.field_moph_runs(owner_id, case_id, created_at desc);
create index if not exists field_mihm_readings_owner_case_idx on public.field_mihm_readings(owner_id, case_id, created_at desc);
create index if not exists field_hypotheses_owner_case_idx on public.field_hypotheses(owner_id, case_id, created_at desc);
create index if not exists field_interventions_owner_case_idx on public.field_interventions(owner_id, case_id, created_at desc);
create index if not exists field_returns_owner_case_idx on public.field_returns(owner_id, case_id, expected_at);
create index if not exists field_outcomes_owner_case_idx on public.field_outcomes(owner_id, case_id, recorded_at desc);
create index if not exists sfi_publications_public_idx on public.sfi_publications(status, published_at desc);
create index if not exists sfi_audit_events_target_idx on public.sfi_audit_events(target_type, target_id, created_at desc);
create index if not exists studio_objects_owner_idx on public.studio_objects(owner_id, created_at desc);

alter table public.field_profiles enable row level security;
alter table public.field_cases enable row level security;
alter table public.field_case_evidence enable row level security;
alter table public.field_moph_runs enable row level security;
alter table public.field_mihm_readings enable row level security;
alter table public.field_hypotheses enable row level security;
alter table public.field_interventions enable row level security;
alter table public.field_returns enable row level security;
alter table public.field_outcomes enable row level security;
alter table public.field_lessons enable row level security;
alter table public.sfi_publications enable row level security;
alter table public.sfi_audit_events enable row level security;
alter table public.studio_sessions enable row level security;
alter table public.studio_objects enable row level security;
alter table public.studio_uploads enable row level security;

-- Direct owner policies.
do $$
declare t text;
begin
  foreach t in array array[
    'field_profiles','field_cases','field_case_evidence','field_moph_runs','field_mihm_readings',
    'field_hypotheses','field_interventions','field_returns','field_outcomes','field_lessons'
  ] loop
    execute format('drop policy if exists %I_owner_select on public.%I', t, t);
    execute format('drop policy if exists %I_owner_insert on public.%I', t, t);
    execute format('drop policy if exists %I_owner_update on public.%I', t, t);
    execute format('drop policy if exists %I_owner_delete on public.%I', t, t);
    if t = 'field_profiles' then
      execute format('create policy %I_owner_select on public.%I for select using (user_id = auth.uid())', t, t);
      execute format('create policy %I_owner_insert on public.%I for insert with check (user_id = auth.uid())', t, t);
      execute format('create policy %I_owner_update on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t, t);
      execute format('create policy %I_owner_delete on public.%I for delete using (user_id = auth.uid())', t, t);
    else
      execute format('create policy %I_owner_select on public.%I for select using (owner_id = auth.uid())', t, t);
      execute format('create policy %I_owner_insert on public.%I for insert with check (owner_id = auth.uid())', t, t);
      execute format('create policy %I_owner_update on public.%I for update using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t, t);
      execute format('create policy %I_owner_delete on public.%I for delete using (owner_id = auth.uid())', t, t);
    end if;
  end loop;
end $$;

-- Public publication read boundary. No public writes.
drop policy if exists sfi_publications_public_read on public.sfi_publications;
create policy sfi_publications_public_read on public.sfi_publications
for select using (status = 'PUBLISHED' and published_at is not null);

-- Audit events are service/server written. Authenticated actors may read only their own events.
drop policy if exists sfi_audit_events_actor_read on public.sfi_audit_events;
create policy sfi_audit_events_actor_read on public.sfi_audit_events
for select to authenticated using (actor_id = auth.uid());

-- New Studio rows are owner-bound. Legacy null-owner rows remain inaccessible to normal users until backfilled.
drop policy if exists studio_sessions_owner_all on public.studio_sessions;
create policy studio_sessions_owner_all on public.studio_sessions
for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists studio_objects_owner_all on public.studio_objects;
create policy studio_objects_owner_all on public.studio_objects
for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists studio_uploads_owner_all on public.studio_uploads;
create policy studio_uploads_owner_all on public.studio_uploads
for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Private FIELD evidence bucket.
insert into storage.buckets (id, name, public)
values ('field-evidence', 'field-evidence', false)
on conflict (id) do update set public = false;

drop policy if exists field_evidence_owner_select on storage.objects;
create policy field_evidence_owner_select on storage.objects
for select to authenticated
using (bucket_id = 'field-evidence' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists field_evidence_owner_insert on storage.objects;
create policy field_evidence_owner_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'field-evidence' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists field_evidence_owner_update on storage.objects;
create policy field_evidence_owner_update on storage.objects
for update to authenticated
using (bucket_id = 'field-evidence' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'field-evidence' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists field_evidence_owner_delete on storage.objects;
create policy field_evidence_owner_delete on storage.objects
for delete to authenticated
using (bucket_id = 'field-evidence' and (storage.foldername(name))[1] = auth.uid()::text);
