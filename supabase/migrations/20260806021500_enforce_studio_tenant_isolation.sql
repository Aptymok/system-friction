-- Enforce per-user isolation across the complete Studio object graph.
-- Service-role readers must still apply explicit owner filters in application code.

alter table public.studio_object_features add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.studio_audio_features add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.studio_video_features add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.studio_image_features add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.studio_text_features add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.studio_community_features add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.studio_time_coordinates add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.studio_hypotheses add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.studio_interventions add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.studio_evidence_traces add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.studio_archive_events add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.studio_exports add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.studio_analysis_jobs add column if not exists owner_id uuid references auth.users(id) on delete set null;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'studio_object_features',
    'studio_audio_features',
    'studio_video_features',
    'studio_image_features',
    'studio_text_features',
    'studio_community_features',
    'studio_time_coordinates',
    'studio_hypotheses',
    'studio_interventions',
    'studio_evidence_traces',
    'studio_exports',
    'studio_analysis_jobs'
  ] loop
    execute format(
      'update public.%I child set owner_id = parent.owner_id from public.studio_objects parent where child.object_id = parent.id and child.owner_id is null',
      table_name
    );
  end loop;
end $$;

update public.studio_archive_events archive
set owner_id = coalesce(
  (select object_row.owner_id from public.studio_objects object_row where object_row.id = archive.object_id),
  (select session_row.owner_id from public.studio_sessions session_row where session_row.id = archive.session_id)
)
where archive.owner_id is null;

create or replace function public.studio_set_owner_from_object()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is null and new.object_id is not null then
    select owner_id into new.owner_id
    from public.studio_objects
    where id = new.object_id;
  end if;
  return new;
end;
$$;

create or replace function public.studio_set_owner_from_archive_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is null and new.object_id is not null then
    select owner_id into new.owner_id
    from public.studio_objects
    where id = new.object_id;
  end if;

  if new.owner_id is null and new.session_id is not null then
    select owner_id into new.owner_id
    from public.studio_sessions
    where id = new.session_id;
  end if;

  return new;
end;
$$;

do $$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'studio_object_features',
    'studio_audio_features',
    'studio_video_features',
    'studio_image_features',
    'studio_text_features',
    'studio_community_features',
    'studio_time_coordinates',
    'studio_hypotheses',
    'studio_interventions',
    'studio_evidence_traces',
    'studio_exports',
    'studio_analysis_jobs'
  ] loop
    trigger_name := table_name || '_inherit_owner';
    execute format('drop trigger if exists %I on public.%I', trigger_name, table_name);
    execute format(
      'create trigger %I before insert or update of object_id on public.%I for each row execute function public.studio_set_owner_from_object()',
      trigger_name,
      table_name
    );
  end loop;
end $$;

drop trigger if exists studio_archive_events_inherit_owner on public.studio_archive_events;
create trigger studio_archive_events_inherit_owner
before insert or update of object_id, session_id on public.studio_archive_events
for each row execute function public.studio_set_owner_from_archive_parent();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'studio_object_features',
    'studio_audio_features',
    'studio_video_features',
    'studio_image_features',
    'studio_text_features',
    'studio_community_features',
    'studio_time_coordinates',
    'studio_hypotheses',
    'studio_interventions',
    'studio_evidence_traces',
    'studio_archive_events',
    'studio_exports',
    'studio_analysis_jobs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I_owner_select on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_owner_insert on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_owner_update on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_owner_delete on public.%I', table_name, table_name);
    execute format('create policy %I_owner_select on public.%I for select to authenticated using (owner_id = auth.uid())', table_name, table_name);
    execute format('create policy %I_owner_insert on public.%I for insert to authenticated with check (owner_id = auth.uid())', table_name, table_name);
    execute format('create policy %I_owner_update on public.%I for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())', table_name, table_name);
    execute format('create policy %I_owner_delete on public.%I for delete to authenticated using (owner_id = auth.uid())', table_name, table_name);
    execute format('create index if not exists %I on public.%I(owner_id, created_at desc)', table_name || '_owner_created_idx', table_name);
  end loop;
end $$;

-- Private Studio storage is namespaced as studio/<user-id>/<session-id>/file.
drop policy if exists studio_objects_owner_select on storage.objects;
create policy studio_objects_owner_select on storage.objects
for select to authenticated
using (
  bucket_id = 'studio-objects'
  and (storage.foldername(name))[1] = 'studio'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists studio_objects_owner_insert on storage.objects;
create policy studio_objects_owner_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'studio-objects'
  and (storage.foldername(name))[1] = 'studio'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists studio_objects_owner_update on storage.objects;
create policy studio_objects_owner_update on storage.objects
for update to authenticated
using (
  bucket_id = 'studio-objects'
  and (storage.foldername(name))[1] = 'studio'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'studio-objects'
  and (storage.foldername(name))[1] = 'studio'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists studio_objects_owner_delete on storage.objects;
create policy studio_objects_owner_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'studio-objects'
  and (storage.foldername(name))[1] = 'studio'
  and (storage.foldername(name))[2] = auth.uid()::text
);
