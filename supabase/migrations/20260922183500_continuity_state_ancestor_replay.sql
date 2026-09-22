-- SFI systemic data-plane recovery hardening.
--
-- During a provider-level API restriction, the authorized Neon continuity plane
-- can advance sfi_continuity_state heartbeat timestamps before the systemic
-- data-plane governor records the first journaled continuity transaction.
-- In that bounded case the canonical primary can legitimately be an older
-- heartbeat ancestor of the first journal before-image.
--
-- Preserve strict conflict semantics for every other table and for every
-- non-temporal continuity-state divergence.

create or replace function public.sfi_apply_continuity_batch_v1(
  p_epoch uuid,
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
  stale_ancestor_count integer := 0;
begin
  if jsonb_typeof(p_entries) <> 'array' then
    raise exception 'SFI_CONTINUITY_BATCH_ARRAY_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtext('SFI_CONTINUITY_REPLAY_V1'));

  for entry in select value from jsonb_array_elements(p_entries)
  loop
    op_id := nullif(entry->>'operation_id','')::uuid;
    table_name := nullif(entry->>'table_name','');
    operation_name := upper(coalesce(entry->>'operation',''));
    row_data := entry->'row_data';
    before_data := entry->'before_data';

    if op_id is null or table_name is null or row_data is null then
      raise exception 'SFI_CONTINUITY_ENTRY_INVALID';
    end if;
    if operation_name not in ('UPSERT','DELETE') then
      raise exception 'SFI_CONTINUITY_OPERATION_INVALID:%', operation_name;
    end if;

    if exists (
      select 1 from public.sfi_continuity_applied_operations
      where operation_id = op_id
    ) then
      skipped_count := skipped_count + 1;
      continue;
    end if;

    select c.oid
    into rel_oid
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = table_name
      and c.relkind = 'r'
    limit 1;

    if rel_oid is null
       or table_name in ('sfi_continuity_applied_operations','sfi_data_plane_state','sfi_data_plane_write_journal') then
      raise exception 'SFI_CONTINUITY_TABLE_NOT_ALLOWED:%', table_name;
    end if;

    select string_agg(
             format('t.%1$I is not distinct from r.%1$I', a.attname),
             ' and ' order by k.ord
           )
    into pk_predicate
    from pg_index i
    join lateral unnest(i.indkey) with ordinality as k(attnum, ord) on true
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
    where i.indrelid = rel_oid
      and i.indisprimary;

    if pk_predicate is null then
      raise exception 'SFI_CONTINUITY_PRIMARY_KEY_REQUIRED:%', table_name;
    end if;

    select
      string_agg(format('%I', a.attname), ', ' order by a.attnum),
      string_agg(format('r.%I', a.attname), ', ' order by a.attnum),
      string_agg(format('%1$I = r_new.%1$I', a.attname), ', ' order by a.attnum),
      coalesce(bool_or(a.attidentity = 'a'), false)
    into writable_columns, writable_select, writable_set, has_identity_always
    from pg_attribute a
    where a.attrelid = rel_oid
      and a.attnum > 0
      and not a.attisdropped
      and a.attgenerated = '';

    if writable_columns is null then
      raise exception 'SFI_CONTINUITY_NO_WRITABLE_COLUMNS:%', table_name;
    end if;

    if operation_name = 'DELETE' then
      if before_data is null then
        raise exception 'SFI_CONTINUITY_DELETE_BEFORE_IMAGE_REQUIRED:%', table_name;
      end if;

      execute format(
        'select to_jsonb(t) from public.%1$I t cross join jsonb_populate_record(null::public.%1$I, $1) r where %2$s limit 1',
        table_name, pk_predicate
      ) into current_row using before_data;

      if current_row is null or current_row is distinct from before_data then
        raise exception 'SFI_CONTINUITY_CONFLICT:%:%', table_name, op_id;
      end if;

      execute format('alter table public.%I disable trigger user', table_name);
      execute format(
        'delete from public.%1$I t using jsonb_populate_record(null::public.%1$I, $1) r where %2$s',
        table_name, pk_predicate
      ) using before_data;
      execute format('alter table public.%I enable trigger user', table_name);

    elsif before_data is null then
      execute format(
        'select to_jsonb(t) from public.%1$I t cross join jsonb_populate_record(null::public.%1$I, $1) r where %2$s limit 1',
        table_name, pk_predicate
      ) into current_row using row_data;

      if current_row is not null then
        if current_row = row_data then
          insert into public.sfi_continuity_applied_operations(
            operation_id, epoch, source_txid, table_name, operation
          ) values (op_id, p_epoch, p_source_txid, table_name, operation_name);
          skipped_count := skipped_count + 1;
          continue;
        end if;
        raise exception 'SFI_CONTINUITY_INSERT_CONFLICT:%:%', table_name, op_id;
      end if;

      execute format('alter table public.%I disable trigger user', table_name);
      execute format(
        'insert into public.%1$I (%2$s)%3$s select %4$s from jsonb_populate_record(null::public.%1$I, $1) r',
        table_name,
        writable_columns,
        case when has_identity_always then ' overriding system value' else '' end,
        writable_select
      ) using row_data;
      execute format('alter table public.%I enable trigger user', table_name);

    else
      execute format(
        'select to_jsonb(t) from public.%1$I t cross join jsonb_populate_record(null::public.%1$I, $1) r where %2$s limit 1',
        table_name, pk_predicate
      ) into current_row using before_data;

      if current_row is null then
        raise exception 'SFI_CONTINUITY_CONFLICT:%:%', table_name, op_id;
      end if;

      if current_row is distinct from before_data then
        if table_name = 'sfi_continuity_state'
           and current_row->>'id' = 'institution'
           and before_data->>'id' = 'institution'
           and nullif(current_row->>'updated_at','') is not null
           and nullif(before_data->>'updated_at','') is not null
           and (current_row - 'updated_at' - 'last_heartbeat_at' - 'last_successful_run_at')
               = (before_data - 'updated_at' - 'last_heartbeat_at' - 'last_successful_run_at')
           and (current_row->>'updated_at')::timestamptz
               <= (before_data->>'updated_at')::timestamptz
        then
          stale_ancestor_count := stale_ancestor_count + 1;
        else
          raise exception 'SFI_CONTINUITY_CONFLICT:%:%', table_name, op_id;
        end if;
      end if;

      execute format('alter table public.%I disable trigger user', table_name);
      execute format(
        'update public.%1$I t set %2$s from jsonb_populate_record(null::public.%1$I, $1) r_new, jsonb_populate_record(null::public.%1$I, $2) r where %3$s',
        table_name, writable_set, pk_predicate
      ) using row_data, before_data;
      execute format('alter table public.%I enable trigger user', table_name);
    end if;

    insert into public.sfi_continuity_applied_operations(
      operation_id, epoch, source_txid, table_name, operation
    ) values (op_id, p_epoch, p_source_txid, table_name, operation_name);

    applied_count := applied_count + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'epoch', p_epoch,
    'sourceTxid', p_source_txid,
    'applied', applied_count,
    'alreadyApplied', skipped_count,
    'staleAncestorsReconciled', stale_ancestor_count
  );
end;
$$;

revoke all on function public.sfi_apply_continuity_batch_v1(uuid,bigint,jsonb) from public, anon, authenticated;
grant execute on function public.sfi_apply_continuity_batch_v1(uuid,bigint,jsonb) to service_role;
