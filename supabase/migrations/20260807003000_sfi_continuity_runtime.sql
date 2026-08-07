create extension if not exists pgcrypto;

create table if not exists public.sfi_continuity_state (
  id text primary key default 'institution',
  mode text not null default 'NORMAL' check (mode in ('NORMAL','FOUNDER_ABSENT_PREP','FOUNDER_ABSENT_ACTIVE','DEGRADED_SAFE','EMERGENCY_HALT','RECOVERY')),
  founder_available boolean not null default true,
  activated_at timestamptz,
  expected_return_at timestamptz,
  last_heartbeat_at timestamptz,
  last_successful_run_at timestamptz,
  last_report_at timestamptz,
  halt_reason text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.sfi_continuity_state (id) values ('institution') on conflict (id) do nothing;

create table if not exists public.sfi_continuity_runs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null,
  mode text not null,
  status text not null check (status in ('RUNNING','COMPLETED','DEGRADED','FAILED','HALTED')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  capability_count integer not null default 0,
  healthy_count integer not null default 0,
  degraded_count integer not null default 0,
  failed_count integer not null default 0,
  evidence jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb
);

create table if not exists public.sfi_capability_health_checks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.sfi_continuity_runs(id) on delete cascade,
  capability_id text not null,
  autonomy_level text not null check (autonomy_level in ('A0','A1','A2','A3')),
  status text not null check (status in ('OPERATIONAL','DEGRADED','FAILED','BLOCKED')),
  checked_at timestamptz not null default now(),
  latency_ms integer,
  evidence_ref text,
  error_code text,
  details jsonb not null default '{}'::jsonb
);
create index if not exists sfi_capability_health_checks_capability_checked_idx on public.sfi_capability_health_checks(capability_id, checked_at desc);

create table if not exists public.sfi_institutional_incidents (
  id uuid primary key default gen_random_uuid(),
  severity text not null check (severity in ('P0','P1','P2','P3')),
  capability_id text,
  status text not null default 'OPEN' check (status in ('OPEN','CONTAINED','RECOVERING','RESOLVED','ESCALATED')),
  title text not null,
  error_code text,
  evidence jsonb not null default '[]'::jsonb,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  requires_founder boolean not null default false
);

create table if not exists public.sfi_founder_decision_queue (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'PENDING' check (status in ('PENDING','DEFERRED','RESOLVED','CANCELLED')),
  category text not null,
  title text not null,
  rationale text not null,
  options jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  safe_default text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text
);

create table if not exists public.sfi_continuity_reports (
  id uuid primary key default gen_random_uuid(),
  period_start timestamptz not null,
  period_end timestamptz not null,
  mode text not null,
  summary jsonb not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.sfi_continuity_state enable row level security;
alter table public.sfi_continuity_runs enable row level security;
alter table public.sfi_capability_health_checks enable row level security;
alter table public.sfi_institutional_incidents enable row level security;
alter table public.sfi_founder_decision_queue enable row level security;
alter table public.sfi_continuity_reports enable row level security;

revoke all on public.sfi_continuity_state from anon, authenticated;
revoke all on public.sfi_continuity_runs from anon, authenticated;
revoke all on public.sfi_capability_health_checks from anon, authenticated;
revoke all on public.sfi_institutional_incidents from anon, authenticated;
revoke all on public.sfi_founder_decision_queue from anon, authenticated;
revoke all on public.sfi_continuity_reports from anon, authenticated;
