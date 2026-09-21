create extension if not exists pgcrypto;

create table if not exists public.sfi_data_plane_state (
  id text primary key default 'institution',
  mode text not null default 'PRIMARY' check (mode in ('PRIMARY','CONTINUITY','RECOVERY')),
  epoch uuid not null default gen_random_uuid(),
  primary_last_ok_at timestamptz,
  primary_last_error_at timestamptz,
  continuity_entered_at timestamptz,
  recovery_started_at timestamptz,
  last_transition_at timestamptz not null default now(),
  primary_error_code text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.sfi_data_plane_state (id) values ('institution') on conflict (id) do nothing;

create table if not exists public.sfi_data_plane_write_journal (
  sequence bigserial primary key,
  operation_id uuid not null default gen_random_uuid() unique,
  epoch uuid not null,
  source_txid bigint not null default txid_current(),
  table_name text not null,
  operation text not null check (operation in ('UPSERT','DELETE')),
  row_data jsonb not null,
  before_data jsonb,
  status text not null default 'PENDING' check (status in ('PENDING','REPLAYING','REPLAYED','CONFLICT')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  replay_attempts integer not null default 0,
  replayed_at timestamptz,
  last_error text
);

create index if not exists sfi_data_plane_write_journal_status_sequence_idx
  on public.sfi_data_plane_write_journal (status, sequence);
create index if not exists sfi_data_plane_write_journal_epoch_tx_idx
  on public.sfi_data_plane_write_journal (epoch, source_txid, sequence);

create or replace function public.sfi_capture_data_plane_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare current_mode text; current_epoch uuid; payload jsonb;
begin
  select mode, epoch into current_mode, current_epoch
  from public.sfi_data_plane_state where id = 'institution';

  if current_mode not in ('CONTINUITY','RECOVERY') then
    return coalesce(new, old);
  end if;

  payload := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;

  insert into public.sfi_data_plane_write_journal (
    epoch, source_txid, table_name, operation, row_data, before_data
  ) values (
    current_epoch, txid_current(), tg_table_name,
    case when tg_op = 'DELETE' then 'DELETE' else 'UPSERT' end,
    payload,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end
  );

  return coalesce(new, old);
end;
$$;

do $$
declare r record; trigger_name text;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname not in ('sfi_data_plane_state','sfi_data_plane_write_journal')
  loop
    trigger_name := 'sfi_data_plane_capture_' || substr(md5(r.relname), 1, 12);
    if not exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = r.relname
        and t.tgname = trigger_name
        and not t.tgisinternal
    ) then
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.sfi_capture_data_plane_write()',
        trigger_name, r.relname
      );
    end if;
  end loop;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'sfi_continuity_service') then
    create role sfi_continuity_service nologin nobypassrls;
  end if;
end $$;

grant usage on schema public to sfi_continuity_service;
grant select, insert, update, delete on all tables in schema public to sfi_continuity_service;
grant usage, select on all sequences in schema public to sfi_continuity_service;
grant execute on all functions in schema public to sfi_continuity_service;

alter default privileges for role sfi_continuity_owner in schema public
  grant select, insert, update, delete on tables to sfi_continuity_service;
alter default privileges for role sfi_continuity_owner in schema public
  grant usage, select on sequences to sfi_continuity_service;
alter default privileges for role sfi_continuity_owner in schema public
  grant execute on functions to sfi_continuity_service;


create or replace function public.sfi_data_plane_fingerprint()
returns table (
  table_name text,
  row_count bigint,
  hash_a numeric,
  hash_b numeric
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  r record;
  c bigint;
  a numeric;
  b numeric;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname not in (
        'sfi_data_plane_state',
        'sfi_data_plane_write_journal',
        'sfi_continuity_applied_operations'
      )
    order by c.relname
  loop
    execute format(
      'select count(*)::bigint,
              coalesce(sum(((''x'' || substr(md5(to_jsonb(t)::text),1,16))::bit(64)::bigint)::numeric),0),
              coalesce(sum(((''x'' || substr(md5(to_jsonb(t)::text),17,16))::bit(64)::bigint)::numeric),0)
       from public.%I t',
      r.relname
    ) into c, a, b;

    table_name := r.relname;
    row_count := c;
    hash_a := a;
    hash_b := b;
    return next;
  end loop;
end;
$$;

grant execute on function public.sfi_data_plane_fingerprint() to sfi_continuity_service;
