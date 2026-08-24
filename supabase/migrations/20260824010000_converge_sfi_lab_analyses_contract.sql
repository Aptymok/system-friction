-- Converge the legacy ScoreFriction lab table with the governed Method Lab run contract.
-- Existing case_id/scope/input_text/result rows are preserved.
-- Governed protocol runs use mode/source/data_mode/systems/variables/limitations/recommendations/raw_analysis.

alter table public.sfi_lab_analyses
  alter column case_id drop not null;

alter table public.sfi_lab_analyses
  add column if not exists mode text,
  add column if not exists source text,
  add column if not exists data_mode text,
  add column if not exists systems text[] not null default '{}'::text[],
  add column if not exists variables text[] not null default '{}'::text[],
  add column if not exists sfi_vector jsonb not null default '{}'::jsonb,
  add column if not exists recommendations jsonb not null default '[]'::jsonb,
  add column if not exists limitations jsonb not null default '[]'::jsonb,
  add column if not exists raw_analysis jsonb not null default '{}'::jsonb;

create index if not exists sfi_lab_analyses_mode_created_idx
  on public.sfi_lab_analyses(mode, created_at desc);

create index if not exists sfi_lab_analyses_case_created_idx
  on public.sfi_lab_analyses(case_id, created_at desc)
  where case_id is not null;

comment on table public.sfi_lab_analyses is
  'Converged Method Lab analysis store. Legacy ScoreFriction rows may use case_id/scope/input_text/result; governed Method Lab runs use mode/source/data_mode/systems/variables/limitations/recommendations/raw_analysis.';
