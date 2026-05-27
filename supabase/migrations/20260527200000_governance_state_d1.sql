create table if not exists public.governance_state (
  id uuid primary key default gen_random_uuid(),
  governance_key text not null unique,
  status text not null default 'active' check (status = any (array['active','blind','degraded','inactive'])),
  acp_user_id uuid null,
  acp_email text null,
  acp_last_seen_at timestamptz null,
  acp_timeout_hours integer not null default 48,
  blind_mode boolean not null default false,
  blind_mode_entered_at timestamptz null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.governance_events (
  id uuid primary key default gen_random_uuid(),
  governance_key text not null,
  event_name text not null,
  actor_id uuid null,
  previous_state jsonb null,
  next_state jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists governance_events_key_created_at_idx
  on public.governance_events (governance_key, created_at desc);

insert into public.governance_state (
  governance_key,
  status,
  acp_timeout_hours,
  blind_mode,
  payload
)
values (
  'SFI_ROOT',
  'active',
  48,
  false,
  '{"constitution":"SFI-ARCH-001","macroPhase":"D1","acp":"Aptymok"}'::jsonb
)
on conflict (governance_key) do nothing;
