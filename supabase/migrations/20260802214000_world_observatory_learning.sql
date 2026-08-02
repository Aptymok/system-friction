create table if not exists public.world_source_observations (
  id uuid primary key default gen_random_uuid(),
  source_id text not null,
  source_family text not null,
  publisher text not null,
  observation_kind text not null,
  external_id text not null,
  title text not null,
  summary text,
  observed_at timestamptz,
  released_at timestamptz,
  fetched_at timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  country_codes text[] not null default '{}',
  actors text[] not null default '{}',
  affected_systems text[] not null default '{}',
  payload jsonb not null default '{}'::jsonb,
  raw_hash text not null,
  source_url text,
  collector_version text not null,
  freshness text not null default 'fresh',
  availability text not null default 'available',
  confidence numeric,
  unique(source_id, external_id, raw_hash)
);

create table if not exists public.world_friction_readings (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.world_source_observations(id) on delete cascade,
  methodology_version text not null,
  systemic_friction numeric not null,
  interaction_density numeric not null,
  friction_gradient numeric not null,
  systemic_coherence numeric not null,
  tension jsonb not null,
  pain_map jsonb not null,
  field_drivers jsonb not null,
  permissions jsonb not null,
  trajectory jsonb not null,
  minimum_viable_perturbation jsonb,
  created_at timestamptz not null default now(),
  unique(observation_id, methodology_version)
);

create table if not exists public.world_hypotheses (
  id uuid primary key default gen_random_uuid(),
  phenomenon_key text not null,
  graph_snapshot jsonb not null,
  cutoff_at timestamptz not null,
  statement text not null,
  predicted_trajectory jsonb not null,
  expected_signals jsonb not null,
  contradiction_signals jsonb not null,
  validation_starts_at timestamptz not null,
  validation_ends_at timestamptz not null,
  initial_confidence numeric not null,
  current_confidence numeric not null,
  methodology_version text not null,
  evidence_ids uuid[] not null default '{}',
  status text not null default 'OPEN',
  created_at timestamptz not null default now()
);

create table if not exists public.world_hypothesis_outcomes (
  id uuid primary key default gen_random_uuid(),
  hypothesis_id uuid not null references public.world_hypotheses(id) on delete cascade,
  classification text not null,
  observed_outcome text not null,
  directional_accuracy numeric,
  temporal_accuracy numeric,
  actor_accuracy numeric,
  mechanism_accuracy numeric,
  source_coverage numeric not null default 0,
  evidence_ids uuid[] not null default '{}',
  evaluator_version text not null,
  evaluated_at timestamptz not null default now(),
  unique(hypothesis_id)
);

create table if not exists public.world_learning_events (
  id uuid primary key default gen_random_uuid(),
  hypothesis_id uuid not null references public.world_hypotheses(id) on delete cascade,
  outcome_id uuid not null references public.world_hypothesis_outcomes(id) on delete cascade,
  retained_assumptions jsonb not null default '[]'::jsonb,
  rejected_assumptions jsonb not null default '[]'::jsonb,
  missing_variables jsonb not null default '[]'::jsonb,
  graph_adjustments jsonb not null default '[]'::jsonb,
  confidence_before numeric not null,
  confidence_after numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists world_observations_time_idx on public.world_source_observations(observed_at desc);
create index if not exists world_observations_geo_idx on public.world_source_observations(latitude, longitude);
create index if not exists world_hypotheses_status_window_idx on public.world_hypotheses(status, validation_ends_at);

alter table public.world_source_observations enable row level security;
alter table public.world_friction_readings enable row level security;
alter table public.world_hypotheses enable row level security;
alter table public.world_hypothesis_outcomes enable row level security;
alter table public.world_learning_events enable row level security;

create policy "world observations readable" on public.world_source_observations for select using (true);
create policy "world readings readable" on public.world_friction_readings for select using (true);
create policy "world hypotheses readable" on public.world_hypotheses for select using (true);
create policy "world outcomes readable" on public.world_hypothesis_outcomes for select using (true);
create policy "world learning readable" on public.world_learning_events for select using (true);