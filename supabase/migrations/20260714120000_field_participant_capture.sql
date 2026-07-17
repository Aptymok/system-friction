-- FIELD participant capture (WB-002 digital layer).
-- Non-destructive: only adds new tables. Does not touch field_cases or any existing FIELD table.

create table if not exists public.field_participant_windows (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid references public.field_cases(id) on delete set null,
  watched_thoughts text[] not null default '{}',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','CLOSED')),
  started_at timestamptz not null default now(),
  expected_close_at timestamptz not null default (now() + interval '72 hours'),
  closed_at timestamptz,
  reflection_what_changed text,
  reflection_what_noticed text,
  reflection_what_avoided text,
  reflection_what_was_mine text,
  reflection_what_was_not_mine text,
  reflection_needed_today text,
  mark_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.field_participant_marks (
  id uuid primary key default gen_random_uuid(),
  window_id uuid not null references public.field_participant_windows(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 3),
  moment_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists field_participant_windows_owner_idx
  on public.field_participant_windows(owner_id, started_at desc);
create index if not exists field_participant_windows_case_idx
  on public.field_participant_windows(case_id) where case_id is not null;
create index if not exists field_participant_marks_window_idx
  on public.field_participant_marks(window_id, moment_at desc);
create index if not exists field_participant_marks_owner_idx
  on public.field_participant_marks(owner_id, created_at desc);

alter table public.field_participant_windows enable row level security;
alter table public.field_participant_marks enable row level security;

-- Owner-only access. Same boundary as every other FIELD table in this system:
-- a participant only ever sees their own rows.
drop policy if exists field_participant_windows_owner_select on public.field_participant_windows;
create policy field_participant_windows_owner_select on public.field_participant_windows
for select to authenticated using (owner_id = auth.uid());

drop policy if exists field_participant_windows_owner_insert on public.field_participant_windows;
create policy field_participant_windows_owner_insert on public.field_participant_windows
for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists field_participant_windows_owner_update on public.field_participant_windows;
create policy field_participant_windows_owner_update on public.field_participant_windows
for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists field_participant_windows_owner_delete on public.field_participant_windows;
create policy field_participant_windows_owner_delete on public.field_participant_windows
for delete to authenticated using (owner_id = auth.uid());

drop policy if exists field_participant_marks_owner_select on public.field_participant_marks;
create policy field_participant_marks_owner_select on public.field_participant_marks
for select to authenticated using (owner_id = auth.uid());

drop policy if exists field_participant_marks_owner_insert on public.field_participant_marks;
create policy field_participant_marks_owner_insert on public.field_participant_marks
for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists field_participant_marks_owner_delete on public.field_participant_marks;
create policy field_participant_marks_owner_delete on public.field_participant_marks
for delete to authenticated using (owner_id = auth.uid());
