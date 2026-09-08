-- SFI-DISCOVERY-MESH-1.0
-- WS-03 durable observation plane.
-- Canonical objects remain owned by src/lib/discovery/canonicalObjectRegistry.ts.
-- Verified institution identity remains owned by src/lib/public/institutionProfile.ts.
-- These tables persist query definitions, observed retrieval runs, collisions and external representation receipts only.

create table if not exists public.sfi_discovery_queries (
  id uuid primary key default gen_random_uuid(),
  query_hash text not null unique check (query_hash ~ '^sha256:[0-9a-f]{64}$'),
  query_text text not null check (length(btrim(query_text)) > 0),
  normalized_query text not null check (length(btrim(normalized_query)) > 0),
  mode text not null check (mode in ('query','distinct_intent','open_source')),
  intent text,
  unbranded boolean not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint sfi_discovery_queries_intent_truth check ((mode = 'distinct_intent' and intent is not null and length(btrim(intent)) > 0) or mode <> 'distinct_intent')
);

comment on table public.sfi_discovery_queries is
  'WS-03 durable query-corpus owner. A row declares a retrieval test query; it is not a ranking or discovery success claim.';

create table if not exists public.sfi_discovery_query_runs (
  id uuid primary key default gen_random_uuid(),
  run_id text not null unique,
  query_id uuid not null references public.sfi_discovery_queries(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  observation_contract text not null check (observation_contract = 'SFI-DISCOVERY-OBSERVATION-1.0'),
  availability text not null check (availability in ('AVAILABLE','DEGRADED','UNAVAILABLE','MISSING','NOT_OBSERVED')),
  candidates jsonb not null default '[]'::jsonb,
  external_representations jsonb not null default '[]'::jsonb,
  metrics jsonb not null,
  provenance jsonb not null default '[]'::jsonb,
  epistemic_boundary jsonb not null,
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.sfi_discovery_query_runs is
  'Observed retrieval-test run owner. Metrics retain availability separate from numeric value; NOT_OBSERVED/UNAVAILABLE are never persisted as numeric zero.';

create index if not exists sfi_discovery_query_runs_query_observed_idx
  on public.sfi_discovery_query_runs(query_id, observed_at desc);

create table if not exists public.sfi_entity_collisions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.sfi_discovery_query_runs(id) on delete restrict,
  dimension text not null check (dimension in ('NAME','DOMAIN','METHOD','ENTITY')),
  collision_observed boolean not null,
  observed_value text,
  source_identity jsonb not null,
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.sfi_entity_collisions is
  'Observed entity/name/domain/method collision tests. A false value is an observed no-collision result, distinct from absence of a test.';

create index if not exists sfi_entity_collisions_run_dimension_idx
  on public.sfi_entity_collisions(run_id, dimension);

create table if not exists public.sfi_external_representations (
  id uuid primary key default gen_random_uuid(),
  canonical_object_key text not null,
  representation_kind text not null,
  state text not null check (state in ('DRAFT','READY','PUBLISHED','FAILED','SUPERSEDED','REMOVED')),
  external_url text,
  content_hash text check (content_hash is null or content_hash ~ '^sha256:[0-9a-f]{64}$'),
  receipt jsonb not null default '{}'::jsonb,
  lineage jsonb not null default '[]'::jsonb,
  observed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint sfi_external_representation_published_truth check (state <> 'PUBLISHED' or (external_url is not null and observed_at is not null))
);

comment on table public.sfi_external_representations is
  'External representation/distribution receipt owner. It points to a canonical object key and never redefines the canonical object.';

create index if not exists sfi_external_representations_object_state_idx
  on public.sfi_external_representations(canonical_object_key, state, created_at desc);

alter table public.sfi_discovery_queries enable row level security;
alter table public.sfi_discovery_queries force row level security;
alter table public.sfi_discovery_query_runs enable row level security;
alter table public.sfi_discovery_query_runs force row level security;
alter table public.sfi_entity_collisions enable row level security;
alter table public.sfi_entity_collisions force row level security;
alter table public.sfi_external_representations enable row level security;
alter table public.sfi_external_representations force row level security;

-- These are institutional control-plane owners. No direct browser/Data API access.
revoke all on public.sfi_discovery_queries from anon, authenticated;
revoke all on public.sfi_discovery_query_runs from anon, authenticated;
revoke all on public.sfi_entity_collisions from anon, authenticated;
revoke all on public.sfi_external_representations from anon, authenticated;
