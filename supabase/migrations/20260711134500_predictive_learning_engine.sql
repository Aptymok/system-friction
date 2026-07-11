create extension if not exists pgcrypto;

create table if not exists public.sfi_predictive_models (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  model_key text not null,
  target_key text not null,
  target_kind text not null default 'binary'
    check (target_kind in ('binary', 'continuous')),
  version integer not null default 1,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'SHADOW', 'FROZEN', 'RETIRED')),
  feature_schema jsonb not null default '[]'::jsonb,
  weights jsonb not null default '{}'::jsonb,
  intercept numeric not null default 0,
  learning_rate numeric not null default 0.04
    check (learning_rate > 0 and learning_rate <= 0.5),
  sample_count integer not null default 0,
  verified_sample_count integer not null default 0,
  metrics jsonb not null default '{"brier":null,"mae":null,"bias":null,"calibration_error":null}'::jsonb,
  parent_model_id uuid references public.sfi_predictive_models(id),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, model_key, version)
);

create unique index if not exists sfi_predictive_models_active_idx
  on public.sfi_predictive_models (scope, model_key)
  where status = 'ACTIVE';

create table if not exists public.sfi_predictive_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  scope text not null,
  subject_type text not null,
  subject_id text not null,
  model_id uuid not null references public.sfi_predictive_models(id),
  model_version integer not null,
  target_key text not null,
  target_kind text not null check (target_kind in ('binary', 'continuous')),
  status text not null default 'OPEN'
    check (status in ('OPEN', 'WAITING_EVIDENCE', 'DUE', 'EVALUATED', 'UNVERIFIABLE', 'SUPERSEDED')),
  prediction numeric not null check (prediction >= 0 and prediction <= 1),
  lower_bound numeric not null check (lower_bound >= 0 and lower_bound <= 1),
  upper_bound numeric not null check (upper_bound >= 0 and upper_bound <= 1),
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  calibration_status text not null default 'BOOTSTRAP_UNCALIBRATED'
    check (calibration_status in ('BOOTSTRAP_UNCALIBRATED', 'LEARNING', 'CALIBRATED', 'DRIFT_WARNING', 'FROZEN')),
  input_snapshot jsonb not null,
  feature_vector jsonb not null,
  feature_contributions jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  missing_evidence jsonb not null default '[]'::jsonb,
  interpretation jsonb not null default '{}'::jsonb,
  amv_assessment jsonb not null default '{}'::jsonb,
  verification_rule jsonb not null,
  requested_return_window text not null default '30d'
    check (requested_return_window in ('72h', '7d', '30d', '90d')),
  due_at timestamptz not null,
  legacy_prediction_entry_id uuid references public.sfi_prediction_entries(id),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sfi_predictive_runs_subject_idx
  on public.sfi_predictive_runs (scope, subject_type, subject_id, created_at desc);
create index if not exists sfi_predictive_runs_due_idx
  on public.sfi_predictive_runs (status, due_at);
create index if not exists sfi_predictive_runs_owner_idx
  on public.sfi_predictive_runs (owner_id, created_at desc);

create table if not exists public.sfi_predictive_evidence_requests (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.sfi_predictive_runs(id) on delete cascade,
  evidence_key text not null,
  description text not null,
  reason text not null,
  source_candidates jsonb not null default '[]'::jsonb,
  auto_collectible boolean not null default false,
  priority text not null default 'MEDIUM'
    check (priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status text not null default 'OPEN'
    check (status in ('OPEN', 'COLLECTING', 'FULFILLED', 'UNAVAILABLE', 'WAIVED')),
  fulfilled_evidence jsonb,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, evidence_key)
);

create table if not exists public.sfi_predictive_outcomes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.sfi_predictive_runs(id) on delete cascade,
  return_window text not null check (return_window in ('72h', '7d', '30d', '90d')),
  actual_value numeric check (actual_value >= 0 and actual_value <= 1),
  outcome_payload jsonb not null default '{}'::jsonb,
  source_type text not null,
  source_ref text,
  source_quality text not null default 'DECLARED'
    check (source_quality in ('VERIFIED', 'OBSERVED', 'DECLARED', 'INFERRED', 'UNVERIFIABLE')),
  intervention_fidelity numeric check (intervention_fidelity >= 0 and intervention_fidelity <= 1),
  observed_at timestamptz not null,
  evaluation_state text not null default 'EVALUATED'
    check (evaluation_state in ('EVALUATED', 'PARTIAL', 'UNVERIFIABLE', 'DISPUTED')),
  error_payload jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (run_id, return_window)
);

create table if not exists public.sfi_predictive_learning_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.sfi_predictive_runs(id) on delete cascade,
  outcome_id uuid not null references public.sfi_predictive_outcomes(id) on delete cascade,
  model_id uuid not null references public.sfi_predictive_models(id),
  learning_state text not null
    check (learning_state in ('APPLIED', 'REJECTED_LOW_QUALITY', 'REJECTED_UNVERIFIABLE', 'REVIEW_REQUIRED', 'ROLLED_BACK')),
  error_class text not null,
  error_analysis jsonb not null,
  parameter_state_before jsonb not null,
  parameter_delta jsonb not null,
  parameter_state_after jsonb not null,
  quality_weight numeric not null check (quality_weight >= 0 and quality_weight <= 1),
  amv_reflection jsonb not null default '{}'::jsonb,
  rollback_of uuid references public.sfi_predictive_learning_events(id),
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists sfi_predictive_learning_model_idx
  on public.sfi_predictive_learning_events (model_id, created_at desc);

create or replace function public.set_sfi_predictive_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_sfi_predictive_models_updated_at
before update on public.sfi_predictive_models
for each row execute function public.set_sfi_predictive_updated_at();

create trigger set_sfi_predictive_runs_updated_at
before update on public.sfi_predictive_runs
for each row execute function public.set_sfi_predictive_updated_at();

create trigger set_sfi_predictive_evidence_requests_updated_at
before update on public.sfi_predictive_evidence_requests
for each row execute function public.set_sfi_predictive_updated_at();

alter table public.sfi_predictive_models enable row level security;
alter table public.sfi_predictive_runs enable row level security;
alter table public.sfi_predictive_evidence_requests enable row level security;
alter table public.sfi_predictive_outcomes enable row level security;
alter table public.sfi_predictive_learning_events enable row level security;

create policy "predictive models service role full access"
on public.sfi_predictive_models for all to service_role using (true) with check (true);
create policy "predictive runs service role full access"
on public.sfi_predictive_runs for all to service_role using (true) with check (true);
create policy "predictive evidence requests service role full access"
on public.sfi_predictive_evidence_requests for all to service_role using (true) with check (true);
create policy "predictive outcomes service role full access"
on public.sfi_predictive_outcomes for all to service_role using (true) with check (true);
create policy "predictive learning events service role full access"
on public.sfi_predictive_learning_events for all to service_role using (true) with check (true);

revoke all on public.sfi_predictive_models from anon, authenticated;
revoke all on public.sfi_predictive_runs from anon, authenticated;
revoke all on public.sfi_predictive_evidence_requests from anon, authenticated;
revoke all on public.sfi_predictive_outcomes from anon, authenticated;
revoke all on public.sfi_predictive_learning_events from anon, authenticated;

grant all on public.sfi_predictive_models to service_role;
grant all on public.sfi_predictive_runs to service_role;
grant all on public.sfi_predictive_evidence_requests to service_role;
grant all on public.sfi_predictive_outcomes to service_role;
grant all on public.sfi_predictive_learning_events to service_role;

insert into public.sfi_predictive_models (
  scope, model_key, target_key, target_kind, version, status,
  feature_schema, weights, intercept, learning_rate
) values (
  'studio',
  'studio_field_response_v1',
  'field_response_30d',
  'binary',
  1,
  'ACTIVE',
  '[
    {"key":"field_compatibility","required":true,"default":0.5},
    {"key":"world_confidence","required":true,"default":0.2},
    {"key":"mihm_coverage","required":true,"default":0.3},
    {"key":"mihm_core_coverage","required":false,"default":0.2},
    {"key":"cultural_pressure","required":false,"default":0.5},
    {"key":"memetic_pressure","required":false,"default":0.5},
    {"key":"affective_pressure","required":false,"default":0.5},
    {"key":"counter_signal","required":false,"default":0},
    {"key":"technical_risk","required":false,"default":0}
  ]'::jsonb,
  '{
    "field_compatibility":1.15,
    "world_confidence":0.55,
    "mihm_coverage":0.45,
    "mihm_core_coverage":0.30,
    "cultural_pressure":0.20,
    "memetic_pressure":0.28,
    "affective_pressure":0.22,
    "counter_signal":-0.18,
    "technical_risk":-0.50
  }'::jsonb,
  -1.15,
  0.035
)
on conflict (scope, model_key, version) do nothing;

insert into public.sfi_predictive_models (
  scope, model_key, target_key, target_kind, version, status,
  feature_schema, weights, intercept, learning_rate
) values (
  'system',
  'generic_binary_v1',
  'observable_outcome',
  'binary',
  1,
  'ACTIVE',
  '[
    {"key":"signal_strength","required":true,"default":0.5},
    {"key":"evidence_coverage","required":true,"default":0.3},
    {"key":"context_confidence","required":true,"default":0.3},
    {"key":"friction","required":false,"default":0.5},
    {"key":"coherence","required":false,"default":0.5}
  ]'::jsonb,
  '{"signal_strength":0.9,"evidence_coverage":0.6,"context_confidence":0.5,"friction":-0.25,"coherence":0.45}'::jsonb,
  -0.9,
  0.03
)
on conflict (scope, model_key, version) do nothing;
