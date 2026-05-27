create table if not exists public.kernel_cycles (
  id uuid primary key default gen_random_uuid(),
  cycle_id text not null unique,
  epistemic_event_id uuid null references public.epistemic_events(id),
  worldspect_snapshot_id uuid null references public.worldspect_snapshots(id),
  observed_at timestamptz not null,
  source_state text not null check (source_state in ('observed', 'degraded', 'missing')),
  status text not null check (status in ('committed', 'degraded', 'blocked')),
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  graph_node_count integer not null default 0 check (graph_node_count >= 0),
  graph_edge_count integer not null default 0 check (graph_edge_count >= 0),
  campo jsonb not null default '{}'::jsonb,
  mihm jsonb not null default '{}'::jsonb,
  delta jsonb not null default '{}'::jsonb,
  policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists kernel_cycles_observed_at_idx
on public.kernel_cycles (observed_at desc);

create index if not exists kernel_cycles_status_idx
on public.kernel_cycles (status);

alter table public.kernel_cycles enable row level security;
