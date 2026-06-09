create table if not exists public.scorefriction_attractor_snapshots (
  id uuid primary key default gen_random_uuid(),
  proto_attractor_id uuid not null references public.scorefriction_proto_attractors(id) on delete cascade,
  case_id text not null,
  density numeric not null default 0,
  confidence numeric not null default 0,
  persistence numeric not null default 0,
  status text not null check (status in ('latent', 'emerging', 'crystallizing', 'consolidated', 'degraded')),
  observation_count integer not null default 0,
  evidence_count integer not null default 0,
  mihm_snapshot jsonb,
  worldspect_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists scorefriction_attractor_snapshots_case_idx
on public.scorefriction_attractor_snapshots (case_id, created_at desc);

create index if not exists scorefriction_attractor_snapshots_proto_idx
on public.scorefriction_attractor_snapshots (proto_attractor_id, created_at desc);
