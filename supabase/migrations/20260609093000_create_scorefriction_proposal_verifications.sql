create table if not exists public.scorefriction_proposal_verifications (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.action_proposals(id) on delete cascade,
  case_id text not null,
  expected_result text,
  actual_result text,
  delta numeric not null default 0,
  verified boolean not null default false,
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  evidence_payload jsonb not null default '{}'::jsonb,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists scorefriction_proposal_verifications_case_idx
on public.scorefriction_proposal_verifications (case_id, verified_at desc);

create index if not exists scorefriction_proposal_verifications_proposal_idx
on public.scorefriction_proposal_verifications (proposal_id, verified_at desc);
