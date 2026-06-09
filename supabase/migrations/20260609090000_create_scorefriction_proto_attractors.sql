create table if not exists public.scorefriction_proto_attractors (
  id uuid primary key default gen_random_uuid(),
  case_id text not null,
  name text not null,
  description text,
  scope text not null default 'scorefriction',
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  density numeric not null default 0 check (density >= 0 and density <= 1),
  persistence numeric not null default 0 check (persistence >= 0 and persistence <= 1),
  status text not null default 'latent' check (status in ('latent', 'emerging', 'crystallizing', 'consolidated', 'degraded')),
  evidence_count integer not null default 0,
  observation_count integer not null default 0,
  supporting_vectors jsonb not null default '[]'::jsonb,
  worldspect_snapshot jsonb,
  mihm_snapshot jsonb,
  generated_by text not null default 'scorefriction_proto_attractor_detector_v1',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, name)
);

create index if not exists scorefriction_proto_attractors_case_idx
on public.scorefriction_proto_attractors (case_id, updated_at desc);

create index if not exists scorefriction_proto_attractors_status_idx
on public.scorefriction_proto_attractors (status, updated_at desc);
