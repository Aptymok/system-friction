create table if not exists public.sfi_data_plane_primary_outbox (
  sequence bigserial primary key,
  operation_id uuid not null default gen_random_uuid() unique,
  source_txid bigint not null default txid_current(),
  table_name text not null,
  operation text not null check (operation in ('UPSERT','DELETE')),
  row_data jsonb not null,
  before_data jsonb,
  status text not null default 'PENDING' check (status in ('PENDING','CLAIMED','MIRRORED','CONFLICT')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  claimed_at timestamptz,
  mirrored_at timestamptz,
  attempts integer not null default 0,
  last_error text
);

create index if not exists sfi_data_plane_primary_outbox_status_sequence_idx
  on public.sfi_data_plane_primary_outbox (status, sequence);
create index if not exists sfi_data_plane_primary_outbox_tx_idx
  on public.sfi_data_plane_primary_outbox (source_txid, sequence);

alter table public.sfi_data_plane_primary_outbox enable row level security;
revoke all on public.sfi_data_plane_primary_outbox from anon, authenticated;
grant select, insert, update on public.sfi_data_plane_primary_outbox to service_role;

create or replace function public.sfi_capture_primary_data_plane_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.sfi_data_plane_primary_outbox (
    source_txid, table_name, operation, row_data, before_data
  ) values (
    txid_current(),
    tg_table_name,
    case when tg_op = 'DELETE' then 'DELETE' else 'UPSERT' end,
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end,
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
      and c.relname not in (
        'sfi_continuity_state',
        'sfi_continuity_runs',
        'sfi_capability_health_checks',
        'sfi_institutional_incidents',
        'sfi_founder_decision_queue',
        'sfi_continuity_reports',
        'sfi_data_plane_primary_outbox',
        'sfi_continuity_applied_operations',
        'sfi_data_plane_state',
        'sfi_data_plane_write_journal',
        'sfi_primary_mirror_applied_operations'
      )
  loop
    trigger_name := 'sfi_primary_outbox_' || substr(md5(r.relname),1,12);
    if not exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname=r.relname
        and t.tgname=trigger_name
        and not t.tgisinternal
    ) then
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.sfi_capture_primary_data_plane_write()',
        trigger_name, r.relname
      );
    end if;
  end loop;
end;
$$;

create or replace function public.sfi_claim_primary_outbox_batch_v1()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  selected_txid bigint;
  entry_count integer;
  payload jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('SFI_PRIMARY_OUTBOX_CLAIM_V1'));

  select source_txid into selected_txid
  from public.sfi_data_plane_primary_outbox
  where status = 'PENDING'
     or (status = 'CLAIMED' and claimed_at < now() - interval '5 minutes')
  order by sequence asc
  limit 1
  for update skip locked;

  if selected_txid is null then
    return jsonb_build_object('ok',true,'empty',true,'sourceTxid',null,'entries','[]'::jsonb);
  end if;

  select count(*)::int into entry_count
  from public.sfi_data_plane_primary_outbox
  where source_txid = selected_txid
    and status in ('PENDING','CLAIMED');

  if entry_count > 5000 then
    raise exception 'SFI_PRIMARY_OUTBOX_TRANSACTION_TOO_LARGE:%:%', selected_txid, entry_count;
  end if;

  update public.sfi_data_plane_primary_outbox
  set status='CLAIMED', claimed_at=now(), updated_at=now(), attempts=attempts+1
  where source_txid=selected_txid
    and status in ('PENDING','CLAIMED');

  select coalesce(jsonb_agg(jsonb_build_object(
    'operation_id',operation_id,
    'source_txid',source_txid,
    'table_name',table_name,
    'operation',operation,
    'row_data',row_data,
    'before_data',before_data
  ) order by sequence),'[]'::jsonb)
  into payload
  from public.sfi_data_plane_primary_outbox
  where source_txid=selected_txid
    and status='CLAIMED';

  return jsonb_build_object(
    'ok',true,
    'empty',false,
    'sourceTxid',selected_txid,
    'entryCount',jsonb_array_length(payload),
    'entries',payload
  );
end;
$$;

create or replace function public.sfi_ack_primary_outbox_v1(
  p_operation_ids uuid[],
  p_status text,
  p_error text default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare affected integer;
begin
  if p_status not in ('MIRRORED','CONFLICT','PENDING') then
    raise exception 'SFI_PRIMARY_OUTBOX_ACK_STATUS_INVALID:%', p_status;
  end if;

  update public.sfi_data_plane_primary_outbox
  set status=p_status,
      mirrored_at=case when p_status='MIRRORED' then now() else mirrored_at end,
      claimed_at=case when p_status='PENDING' then null else claimed_at end,
      last_error=case when p_error is null then null else left(p_error,4000) end,
      updated_at=now()
  where operation_id = any(p_operation_ids);

  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function public.sfi_primary_outbox_status_v1()
returns jsonb
language sql
security definer
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'pending',count(*) filter (where status in ('PENDING','CLAIMED')),
    'conflicts',count(*) filter (where status='CONFLICT'),
    'oldestPendingAt',min(created_at) filter (where status in ('PENDING','CLAIMED')),
    'lastMirroredAt',max(mirrored_at)
  )
  from public.sfi_data_plane_primary_outbox;
$$;

revoke all on function public.sfi_claim_primary_outbox_batch_v1() from public, anon, authenticated;
revoke all on function public.sfi_ack_primary_outbox_v1(uuid[],text,text) from public, anon, authenticated;
revoke all on function public.sfi_primary_outbox_status_v1() from public, anon, authenticated;
grant execute on function public.sfi_claim_primary_outbox_batch_v1() to service_role;
grant execute on function public.sfi_ack_primary_outbox_v1(uuid[],text,text) to service_role;
grant execute on function public.sfi_primary_outbox_status_v1() to service_role;

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