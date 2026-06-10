create extension if not exists "pgcrypto";

create table if not exists sfi_evidence_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid null,
  case_id text null,
  module text not null,
  evidence_kind text not null,
  source_name text not null,
  source_url text null,
  private_ref text null,
  public_summary jsonb not null default '{}'::jsonb,
  evidence_hash text not null,
  anonymized boolean not null default true,
  trust_level text not null default 'unknown',
  trust_score numeric not null default 0,
  ldi numeric not null default 0,
  public_weight numeric not null default 0,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists sfi_evidence_ledger_module_idx on sfi_evidence_ledger(module);
create index if not exists sfi_evidence_ledger_case_idx on sfi_evidence_ledger(case_id);
create index if not exists sfi_evidence_ledger_hash_idx on sfi_evidence_ledger(evidence_hash);

create table if not exists sfi_graph_nodes (
  id uuid primary key default gen_random_uuid(),
  node_key text not null unique,
  label text not null,
  module text not null,
  node_type text not null,
  layer integer not null default 1,
  parent_key text null,
  description text null,
  metrics jsonb not null default '{}'::jsonb,
  evidence_count integer not null default 0,
  private_evidence_count integer not null default 0,
  density numeric not null default 0,
  weight numeric not null default 0,
  degradation numeric not null default 0,
  status text not null default 'active',
  position jsonb not null default '{}'::jsonb,
  visual jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sfi_graph_nodes_module_idx on sfi_graph_nodes(module);
create index if not exists sfi_graph_nodes_layer_idx on sfi_graph_nodes(layer);
create index if not exists sfi_graph_nodes_weight_idx on sfi_graph_nodes(weight desc);

create table if not exists sfi_graph_edges (
  id uuid primary key default gen_random_uuid(),
  from_key text not null,
  to_key text not null,
  edge_type text not null,
  weight numeric not null default 0,
  evidence_count integer not null default 0,
  degradation numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(from_key, to_key, edge_type)
);

create index if not exists sfi_graph_edges_from_idx on sfi_graph_edges(from_key);
create index if not exists sfi_graph_edges_to_idx on sfi_graph_edges(to_key);

create table if not exists sfi_attractors (
  id uuid primary key default gen_random_uuid(),
  attractor_key text not null unique,
  label text not null,
  module text not null,
  owner_node_key text null,
  attractor_type text not null default 'systemic',
  density numeric not null default 0,
  confidence numeric not null default 0,
  persistence numeric not null default 0,
  trust numeric not null default 0,
  degradation numeric not null default 0,
  weight numeric not null default 0,
  evidence_count integer not null default 0,
  status text not null default 'latent',
  vector jsonb not null default '{}'::jsonb,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sfi_attractors_module_idx on sfi_attractors(module);
create index if not exists sfi_attractors_weight_idx on sfi_attractors(weight desc);

create table if not exists sfi_ejectors (
  id uuid primary key default gen_random_uuid(),
  ejector_key text not null unique,
  label text not null,
  module text not null,
  owner_node_key text null,
  contradiction numeric not null default 0,
  unresolved_debt numeric not null default 0,
  decay numeric not null default 0,
  external_pressure numeric not null default 0,
  weight numeric not null default 0,
  evidence_count integer not null default 0,
  status text not null default 'active',
  vector jsonb not null default '{}'::jsonb,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sfi_ejectors_module_idx on sfi_ejectors(module);
create index if not exists sfi_ejectors_weight_idx on sfi_ejectors(weight desc);

create table if not exists sfi_phenomena (
  id uuid primary key default gen_random_uuid(),
  phenomenon_key text not null unique,
  label text not null,
  module text not null,
  description text null,
  regime text not null default 'latent',
  density numeric not null default 0,
  persistence numeric not null default 0,
  velocity numeric not null default 0,
  trust numeric not null default 0,
  degradation numeric not null default 0,
  evidence_count integer not null default 0,
  attractor_count integer not null default 0,
  ejector_count integer not null default 0,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  vector jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sfi_phenomena_module_idx on sfi_phenomena(module);
create index if not exists sfi_phenomena_regime_idx on sfi_phenomena(regime);
create index if not exists sfi_phenomena_density_idx on sfi_phenomena(density desc);

create table if not exists sfi_phenomenon_evidence (
  id uuid primary key default gen_random_uuid(),
  phenomenon_key text not null,
  evidence_id uuid not null references sfi_evidence_ledger(id) on delete cascade,
  weight numeric not null default 0,
  relation_type text not null default 'supports',
  created_at timestamptz not null default now(),
  unique(phenomenon_key, evidence_id)
);

create table if not exists sfi_moph_sessions (
  id uuid primary key default gen_random_uuid(),
  session_key text not null unique,
  account_id uuid null,
  consent_state text not null default 'local_or_anonymous',
  movement_trace_digest text null,
  choices jsonb not null default '[]'::jsonb,
  texts jsonb not null default '[]'::jsonb,
  behavioral_nodes jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  evidence_hash text null,
  public_summary jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists sfi_amv_memory (
  id uuid primary key default gen_random_uuid(),
  session_id text null,
  module text not null,
  input_hash text not null,
  input_summary text not null,
  inference jsonb not null default '{}'::jsonb,
  decision jsonb not null default '{}'::jsonb,
  output_summary text not null,
  evaluation jsonb not null default '{}'::jsonb,
  memory_delta jsonb not null default '{}'::jsonb,
  uncertainty numeric not null default 1,
  source_trust numeric not null default 0,
  requires_human_validation boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists sfi_amv_memory_module_idx on sfi_amv_memory(module);
create index if not exists sfi_amv_memory_created_idx on sfi_amv_memory(created_at desc);
