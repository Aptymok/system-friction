create table if not exists public.graph_nodes (
  id uuid primary key default gen_random_uuid(),
  node_id text not null unique,
  label text not null,
  ontology_type text not null,
  lineage text[] not null default '{}',
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.graph_edges (
  id uuid primary key default gen_random_uuid(),
  edge_id text not null unique,
  source_node_id text not null references public.graph_nodes(node_id),
  target_node_id text not null references public.graph_nodes(node_id),
  relation text not null,
  weight numeric not null default 0 check (weight >= 0 and weight <= 1),
  lineage text[] not null default '{}',
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.graph_history (
  id uuid primary key default gen_random_uuid(),
  entity_kind text not null check (entity_kind in ('node', 'edge')),
  entity_id text not null,
  operation text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists graph_nodes_ontology_type_idx
on public.graph_nodes (ontology_type);

create index if not exists graph_edges_source_target_idx
on public.graph_edges (source_node_id, target_node_id);

alter table public.graph_nodes enable row level security;
alter table public.graph_edges enable row level security;
alter table public.graph_history enable row level security;
