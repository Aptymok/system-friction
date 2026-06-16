create table if not exists public.sfi_lab_analyses (
  id text primary key,
  mode text not null,
  source text not null,
  data_mode text not null,
  sfi_vector jsonb not null default '{}'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  raw_analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sfi_reappearances (
  id text primary key,
  analysis_id text not null references public.sfi_lab_analyses(id) on delete cascade,
  pattern text not null,
  recurrence integer not null default 0,
  similarity numeric not null default 0,
  first_seen timestamptz,
  last_seen timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sfi_signals (
  id text primary key,
  analysis_id text not null references public.sfi_lab_analyses(id) on delete cascade,
  name text not null,
  status text not null,
  recurrence integer not null default 0,
  coherence numeric not null default 0,
  visibility numeric not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sfi_nodes (
  id text primary key,
  analysis_id text not null references public.sfi_lab_analyses(id) on delete cascade,
  name text not null,
  status text not null,
  first_seen timestamptz,
  last_seen timestamptz,
  persistence numeric not null default 0,
  coherence numeric not null default 0,
  friction numeric not null default 0,
  visibility numeric not null default 0,
  utility numeric not null default 0,
  sfi_vector jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sfi_hypotheses (
  id text primary key,
  analysis_id text not null references public.sfi_lab_analyses(id) on delete cascade,
  title text not null,
  status text not null,
  confidence numeric not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sfi_reports (
  id text primary key default gen_random_uuid()::text,
  analysis_id text not null references public.sfi_lab_analyses(id) on delete cascade,
  markdown text not null,
  report_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sfi_reappearances_analysis_id_idx on public.sfi_reappearances(analysis_id);
create index if not exists sfi_signals_analysis_id_idx on public.sfi_signals(analysis_id);
create index if not exists sfi_nodes_analysis_id_idx on public.sfi_nodes(analysis_id);
create index if not exists sfi_hypotheses_analysis_id_idx on public.sfi_hypotheses(analysis_id);
create index if not exists sfi_reports_analysis_id_idx on public.sfi_reports(analysis_id);
