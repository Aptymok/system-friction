alter table public.sfi_data_plane_state
  add column if not exists baseline_certified_at timestamptz,
  add column if not exists baseline_fingerprint_version text,
  add column if not exists primary_mirror_certified boolean not null default false,
  add column if not exists primary_mirror_verified_at timestamptz,
  add column if not exists primary_mirror_last_source_txid bigint,
  add column if not exists primary_mirror_backlog integer not null default 0,
  add column if not exists primary_mirror_last_error text;

create table if not exists public.sfi_primary_mirror_applied_operations (
  operation_id uuid primary key,
  source_txid bigint not null,
  table_name text not null,
  operation text not null check (operation in ('UPSERT','DELETE')),
  applied_at timestamptz not null default now()
);

revoke all on public.sfi_primary_mirror_applied_operations from sfi_continuity_anonymous;
grant select, insert on public.sfi_primary_mirror_applied_operations to sfi_continuity_service;

create or replace function public.sfi_apply_primary_mirror_batch_v1(
  p_source_txid bigint,
  p_entries jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  entry jsonb;
  op_id uuid;
  table_name text;
  operation_name text;
  row_data jsonb;
  before_data jsonb;
  rel_oid oid;
  pk_predicate text;
  writable_columns text;
  writable_select text;
  writable_set text;
  has_identity_always boolean;
  current_row jsonb;
  applied_count integer := 0;
  skipped_count integer := 0;
begin
  if jsonb_typeof(p_entries) <> 'array' then
    raise exception 'SFI_PRIMARY_MIRROR_BATCH_ARRAY_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtext('SFI_PRIMARY_MIRROR_APPLY_V1'));

  for entry in select value from jsonb_array_elements(p_entries)
  loop
    op_id := nullif(entry->>'operation_id','')::uuid;
    table_name := nullif(entry->>'table_name','');
    operation_name := upper(coalesce(entry->>'operation',''));
    row_data := entry->'row_data';
    before_data := entry->'before_data';

    if op_id is null or table_name is null or row_data is null then
      raise exception 'SFI_PRIMARY_MIRROR_ENTRY_INVALID';
    end if;
    if operation_name not in ('UPSERT','DELETE') then
      raise exception 'SFI_PRIMARY_MIRROR_OPERATION_INVALID:%',operation_name;
    end if;

    if exists (
      select 1 from public.sfi_primary_mirror_applied_operations
      where operation_id=op_id
    ) then
      skipped_count:=skipped_count+1;
      continue;
    end if;

    if table_name in (
      'sfi_continuity_state','sfi_continuity_runs','sfi_capability_health_checks',
      'sfi_institutional_incidents','sfi_founder_decision_queue','sfi_continuity_reports',
      'sfi_data_plane_state','sfi_data_plane_write_journal',
      'sfi_data_plane_primary_outbox','sfi_continuity_applied_operations',
      'sfi_primary_mirror_applied_operations'
    ) then
      raise exception 'SFI_PRIMARY_MIRROR_TABLE_NOT_ALLOWED:%',table_name;
    end if;

    select c.oid into rel_oid
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=table_name and c.relkind='r'
    limit 1;
    if rel_oid is null then
      raise exception 'SFI_PRIMARY_MIRROR_TABLE_MISSING:%',table_name;
    end if;

    select string_agg(format('t.%1$I is not distinct from r.%1$I',a.attname),' and ' order by k.ord)
    into pk_predicate
    from pg_index i
    join lateral unnest(i.indkey) with ordinality as k(attnum,ord) on true
    join pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.attnum
    where i.indrelid=rel_oid and i.indisprimary;
    if pk_predicate is null then
      raise exception 'SFI_PRIMARY_MIRROR_PRIMARY_KEY_REQUIRED:%',table_name;
    end if;

    select
      string_agg(format('%I',a.attname),', ' order by a.attnum),
      string_agg(format('r.%I',a.attname),', ' order by a.attnum),
      string_agg(format('%1$I = r_new.%1$I',a.attname),', ' order by a.attnum),
      coalesce(bool_or(a.attidentity='a'),false)
    into writable_columns,writable_select,writable_set,has_identity_always
    from pg_attribute a
    where a.attrelid=rel_oid
      and a.attnum>0
      and not a.attisdropped
      and a.attgenerated='';

    if operation_name='DELETE' then
      if before_data is null then
        raise exception 'SFI_PRIMARY_MIRROR_DELETE_BEFORE_REQUIRED:%',table_name;
      end if;
      execute format(
        'select to_jsonb(t) from public.%1$I t cross join jsonb_populate_record(null::public.%1$I,$1) r where %2$s limit 1',
        table_name,pk_predicate
      ) into current_row using before_data;

      if current_row is null then
        insert into public.sfi_primary_mirror_applied_operations(operation_id,source_txid,table_name,operation)
        values(op_id,p_source_txid,table_name,operation_name);
        skipped_count:=skipped_count+1;
        continue;
      end if;
      if current_row is distinct from before_data then
        raise exception 'SFI_PRIMARY_MIRROR_CONFLICT:%:%',table_name,op_id;
      end if;

      execute format('alter table public.%I disable trigger user',table_name);
      execute format(
        'delete from public.%1$I t using jsonb_populate_record(null::public.%1$I,$1) r where %2$s',
        table_name,pk_predicate
      ) using before_data;
      execute format('alter table public.%I enable trigger user',table_name);

    elsif before_data is null then
      execute format(
        'select to_jsonb(t) from public.%1$I t cross join jsonb_populate_record(null::public.%1$I,$1) r where %2$s limit 1',
        table_name,pk_predicate
      ) into current_row using row_data;

      if current_row is not null then
        if current_row = row_data then
          insert into public.sfi_primary_mirror_applied_operations(operation_id,source_txid,table_name,operation)
          values(op_id,p_source_txid,table_name,operation_name);
          skipped_count:=skipped_count+1;
          continue;
        end if;
        raise exception 'SFI_PRIMARY_MIRROR_INSERT_CONFLICT:%:%',table_name,op_id;
      end if;

      execute format('alter table public.%I disable trigger user',table_name);
      execute format(
        'insert into public.%1$I (%2$s)%3$s select %4$s from jsonb_populate_record(null::public.%1$I,$1) r',
        table_name,writable_columns,
        case when has_identity_always then ' overriding system value' else '' end,
        writable_select
      ) using row_data;
      execute format('alter table public.%I enable trigger user',table_name);

    else
      execute format(
        'select to_jsonb(t) from public.%1$I t cross join jsonb_populate_record(null::public.%1$I,$1) r where %2$s limit 1',
        table_name,pk_predicate
      ) into current_row using before_data;

      if current_row = row_data then
        insert into public.sfi_primary_mirror_applied_operations(operation_id,source_txid,table_name,operation)
        values(op_id,p_source_txid,table_name,operation_name);
        skipped_count:=skipped_count+1;
        continue;
      end if;
      if current_row is null or current_row is distinct from before_data then
        raise exception 'SFI_PRIMARY_MIRROR_CONFLICT:%:%',table_name,op_id;
      end if;

      execute format('alter table public.%I disable trigger user',table_name);
      execute format(
        'update public.%1$I t set %2$s from jsonb_populate_record(null::public.%1$I,$1) r_new, jsonb_populate_record(null::public.%1$I,$2) r where %3$s',
        table_name,writable_set,pk_predicate
      ) using row_data,before_data;
      execute format('alter table public.%I enable trigger user',table_name);
    end if;

    insert into public.sfi_primary_mirror_applied_operations(operation_id,source_txid,table_name,operation)
    values(op_id,p_source_txid,table_name,operation_name);
    applied_count:=applied_count+1;
  end loop;

  update public.sfi_data_plane_state
  set primary_mirror_last_source_txid=p_source_txid,
      updated_at=now()
  where id='institution';

  return jsonb_build_object(
    'ok',true,
    'sourceTxid',p_source_txid,
    'applied',applied_count,
    'alreadyApplied',skipped_count
  );
end;
$$;

create or replace function public.sfi_set_primary_mirror_certification_v1(
  p_certified boolean,
  p_backlog integer,
  p_error text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare result jsonb;
begin
  update public.sfi_data_plane_state
  set primary_mirror_certified=p_certified,
      primary_mirror_verified_at=case when p_certified then now() else primary_mirror_verified_at end,
      primary_mirror_backlog=greatest(coalesce(p_backlog,0),0),
      primary_mirror_last_error=case when p_error is null then null else left(p_error,4000) end,
      updated_at=now()
  where id='institution'
  returning jsonb_build_object(
    'mode',mode,
    'baselineCertifiedAt',baseline_certified_at,
    'mirrorCertified',primary_mirror_certified,
    'mirrorVerifiedAt',primary_mirror_verified_at,
    'mirrorBacklog',primary_mirror_backlog,
    'mirrorError',primary_mirror_last_error
  ) into result;
  return result;
end;
$$;

revoke all on function public.sfi_apply_primary_mirror_batch_v1(bigint,jsonb) from public,sfi_continuity_anonymous;
revoke all on function public.sfi_set_primary_mirror_certification_v1(boolean,integer,text) from public,sfi_continuity_anonymous;
grant execute on function public.sfi_apply_primary_mirror_batch_v1(bigint,jsonb) to sfi_continuity_service;
grant execute on function public.sfi_set_primary_mirror_certification_v1(boolean,integer,text) to sfi_continuity_service;

create or replace function public.sfi_data_plane_fingerprint()
returns table (table_name text,row_count bigint,hash_a numeric,hash_b numeric)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare r record; c bigint; a numeric; b numeric;
begin
  for r in
    select c.relname
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r'
      and c.relname not in (
        'sfi_continuity_state','sfi_continuity_runs','sfi_capability_health_checks',
        'sfi_institutional_incidents','sfi_founder_decision_queue','sfi_continuity_reports',
        'sfi_data_plane_state','sfi_data_plane_write_journal',
        'sfi_continuity_applied_operations','sfi_data_plane_primary_outbox',
        'sfi_primary_mirror_applied_operations'
      )
    order by c.relname
  loop
    execute format(
      'select count(*)::bigint,
              coalesce(sum(((''x''||substr(md5(to_jsonb(t)::text),1,16))::bit(64)::bigint)::numeric),0),
              coalesce(sum(((''x''||substr(md5(to_jsonb(t)::text),17,16))::bit(64)::bigint)::numeric),0)
       from public.%I t',r.relname
    ) into c,a,b;
    table_name:=r.relname; row_count:=c; hash_a:=a; hash_b:=b; return next;
  end loop;
end;
$$;