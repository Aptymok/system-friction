-- Autonomous Prospect Radar
-- Persists public research, evidence sources and governed commercial dossiers.

create table if not exists public.prospect_research_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null default 'discover' check (mode in ('discover','investigate')),
  company_seed text,
  sector text,
  region text not null default 'Mexico',
  pain_focus text,
  lookback_days integer not null default 120 check (lookback_days between 7 and 730),
  search_provider text,
  status text not null default 'running' check (status in ('running','completed','blocked','failed')),
  query_plan jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_by uuid,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prospect_research_sources (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.prospect_research_runs(id) on delete cascade,
  source_key text not null,
  url text not null,
  title text not null,
  publisher text,
  snippet text,
  published_at timestamptz,
  published_at_raw text,
  retrieved_at timestamptz not null default now(),
  source_type text not null check (source_type in ('official','regulator','news','professional','other')),
  reliability numeric not null default 0 check (reliability between 0 and 1),
  created_at timestamptz not null default now(),
  unique (run_id, url)
);

create table if not exists public.prospect_opportunity_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.prospect_research_runs(id) on delete cascade,
  company_name text not null,
  sector text,
  region text,
  pain_statement text not null,
  causal_hypothesis jsonb not null default '[]'::jsonb,
  critical_window jsonb not null default '{}'::jsonb,
  sfi_fit jsonb not null default '{}'::jsonb,
  contact jsonb not null default '{}'::jsonb,
  email_draft jsonb not null default '{}'::jsonb,
  proposal_document text not null,
  confidence numeric not null default 0 check (confidence between 0 and 1),
  epistemic_status text not null default 'projected_not_validated',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospect_research_runs_created_idx
  on public.prospect_research_runs (created_at desc);
create index if not exists prospect_research_runs_status_idx
  on public.prospect_research_runs (status, created_at desc);
create index if not exists prospect_research_sources_run_idx
  on public.prospect_research_sources (run_id, reliability desc);
create index if not exists prospect_research_sources_published_idx
  on public.prospect_research_sources (published_at desc nulls last);
create index if not exists prospect_opportunity_reports_company_idx
  on public.prospect_opportunity_reports (company_name, created_at desc);

alter table public.prospect_research_runs enable row level security;
alter table public.prospect_research_sources enable row level security;
alter table public.prospect_opportunity_reports enable row level security;

drop policy if exists prospect_research_runs_service_all on public.prospect_research_runs;
create policy prospect_research_runs_service_all on public.prospect_research_runs
  for all to service_role using (true) with check (true);

drop policy if exists prospect_research_sources_service_all on public.prospect_research_sources;
create policy prospect_research_sources_service_all on public.prospect_research_sources
  for all to service_role using (true) with check (true);

drop policy if exists prospect_opportunity_reports_service_all on public.prospect_opportunity_reports;
create policy prospect_opportunity_reports_service_all on public.prospect_opportunity_reports
  for all to service_role using (true) with check (true);
