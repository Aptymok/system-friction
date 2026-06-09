create table if not exists public.scorefriction_cultural_hypotheses (
  id uuid primary key default gen_random_uuid(),
  case_id text not null,
  proto_attractor_id uuid references public.scorefriction_proto_attractors(id) on delete set null,
  title text not null,
  statement text not null,
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  status text not null default 'open' check (status in ('open', 'tracking', 'verified', 'refuted', 'expired')),
  verification_window_days integer not null default 21,
  expected_signal text,
  actual_signal text,
  result text,
  created_from jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, proto_attractor_id, title)
);

create index if not exists scorefriction_cultural_hypotheses_case_idx
on public.scorefriction_cultural_hypotheses (case_id, updated_at desc);

create index if not exists scorefriction_cultural_hypotheses_status_idx
on public.scorefriction_cultural_hypotheses (status, updated_at desc);
