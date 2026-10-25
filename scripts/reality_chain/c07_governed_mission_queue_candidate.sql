-- C07 isolated candidate only. NOT A DEPLOYMENT MIGRATION.
-- This proposal is to be exercised solely in a disposable PG17 database.
-- Reuses the existing SFI cognitive agent registry/executor; not an agent runtime.
create extension if not exists pgcrypto;

create table public.sfi_c07_mission_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  actor_id uuid not null,
  mission_id text not null check (length(mission_id) between 8 and 160),
  agent_id text not null check (length(agent_id) between 3 and 120),
  execution_id uuid not null default gen_random_uuid() unique,
  idempotency_key text not null check (length(idempotency_key) between 8 and 160),
  request_digest text not null check (request_digest ~ '^[0-9a-f]{64}$'),
  request_payload jsonb not null check (jsonb_typeof(request_payload) = 'object' and pg_column_size(request_payload) <= 32768),
  status text not null default 'QUEUED' check(status in ('QUEUED','RUNNING','COMPLETED','BLOCKED','CANCELLED')),
  attempts int not null default 0 check (attempts >= 0),
  max_attempts int not null default 2 check (max_attempts between 1 and 3),
  available_at timestamptz not null default now(),
  expires_at timestamptz,
  worker_id text,
  lease_token uuid,
  lease_until timestamptz,
  cancel_requested_at timestamptz,
  receipt_event_id text,
  receipt_hash text,
  last_error_code text,
  return_observation text not null default 'NOT_OBSERVED' check(return_observation = 'NOT_OBSERVED'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, idempotency_key),
  check (status <> 'COMPLETED' or (receipt_event_id is not null and receipt_hash is not null))
);
create index sfi_c07_mission_jobs_claim_idx
  on public.sfi_c07_mission_jobs(status, available_at, created_at)
  where status in ('QUEUED','RUNNING');

alter table public.sfi_c07_mission_jobs enable row level security;
revoke all on public.sfi_c07_mission_jobs from public, anon, authenticated;
grant select, insert, update on public.sfi_c07_mission_jobs to service_role;

-- Same tenant + idempotency key produces the same execution identity. A
-- conflicting request digest cannot silently re-use the previous submission.
create function public.sfi_c07_enqueue_mission_v1(
  p_tenant_id uuid, p_actor_id uuid, p_mission_id text, p_agent_id text,
  p_idempotency_key text, p_request_digest text, p_request_payload jsonb,
  p_max_attempts int default 2
) returns public.sfi_c07_mission_jobs
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_job public.sfi_c07_mission_jobs;
begin
  if p_tenant_id is null or p_actor_id is null or p_mission_id is null or
     p_agent_id is null or p_idempotency_key is null or p_request_digest is null or
     p_request_payload is null or p_max_attempts not between 1 and 3 then
    raise exception 'SFI_C07_INVALID_ENQUEUE_REQUEST';
  end if;
  insert into public.sfi_c07_mission_jobs(
    tenant_id, actor_id, mission_id, agent_id, idempotency_key,
    request_digest, request_payload, max_attempts
  ) values(
    p_tenant_id, p_actor_id, p_mission_id, p_agent_id, p_idempotency_key,
    p_request_digest, p_request_payload, p_max_attempts
  ) on conflict (tenant_id, idempotency_key) do nothing;
  select * into v_job from public.sfi_c07_mission_jobs
    where tenant_id=p_tenant_id and idempotency_key=p_idempotency_key;
  if not found then raise exception 'SFI_C07_ENQUEUE_NOT_PERSISTED'; end if;
  if v_job.request_digest <> p_request_digest or
     v_job.mission_id <> p_mission_id or v_job.agent_id <> p_agent_id or
     v_job.actor_id <> p_actor_id or v_job.request_payload <> p_request_payload then
    raise exception 'SFI_C07_IDEMPOTENCY_CONFLICT';
  end if;
  return v_job;
end $$;

-- Atomic claim, with a fresh fencing token on every lease. SKIP LOCKED
-- avoids simultaneous assignment while the first worker has a row lock.
-- Expiration/cancellation transitions are bounded and do not fabricate RETURN.
create function public.sfi_c07_claim_mission_v1(
  p_worker_id text, p_lease_seconds int default 60
) returns public.sfi_c07_mission_jobs
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_job public.sfi_c07_mission_jobs;
begin
  if p_worker_id is null or length(trim(p_worker_id)) not between 3 and 120 or
     p_lease_seconds not between 15 and 900 then
    raise exception 'SFI_C07_INVALID_CLAIM_REQUEST';
  end if;
  update public.sfi_c07_mission_jobs set status='CANCELLED', lease_token=null,
    lease_until=null, worker_id=null, updated_at=clock_timestamp()
    where status='RUNNING' and cancel_requested_at is not null
      and lease_until <= clock_timestamp();
  update public.sfi_c07_mission_jobs set status='BLOCKED',
    last_error_code=case when expires_at <= clock_timestamp()
      then 'TASK_EXPIRED' else 'RETRY_EXHAUSTED' end,
    lease_token=null, lease_until=null, worker_id=null,
    updated_at=clock_timestamp()
    where ((status in ('QUEUED','RUNNING') and expires_at <= clock_timestamp()) or
      (status='RUNNING' and lease_until <= clock_timestamp()
       and attempts >= max_attempts and cancel_requested_at is null));
  with candidate as (
    select id from public.sfi_c07_mission_jobs
    where cancel_requested_at is null
      and (expires_at is null or expires_at > clock_timestamp())
      and attempts < max_attempts
      and ((status='QUEUED' and available_at <= clock_timestamp())
        or (status='RUNNING' and lease_until <= clock_timestamp()))
    order by available_at, created_at, id
    for update skip locked limit 1
  )
  update public.sfi_c07_mission_jobs j
    set status='RUNNING', attempts=j.attempts+1, worker_id=p_worker_id,
      lease_token=gen_random_uuid(),
      lease_until=clock_timestamp()+make_interval(secs => p_lease_seconds),
      updated_at=clock_timestamp()
    from candidate where j.id=candidate.id
    returning j.* into v_job;
  return v_job;
end $$;

-- A stale lease cannot renew, complete or retry another worker's task.
create function public.sfi_c07_renew_mission_v1(
  p_id uuid, p_token uuid, p_lease_seconds int default 60
) returns boolean language plpgsql security invoker
set search_path = pg_catalog, public as $$
declare v_id uuid;
begin
  if p_lease_seconds not between 15 and 900 then return false; end if;
  update public.sfi_c07_mission_jobs
    set lease_until=clock_timestamp()+make_interval(secs => p_lease_seconds),
      updated_at=clock_timestamp()
    where id=p_id and status='RUNNING' and lease_token=p_token
      and lease_until>clock_timestamp() and cancel_requested_at is null
    returning id into v_id;
  return v_id is not null;
end $$;

create function public.sfi_c07_cancel_mission_v1(p_id uuid, p_tenant uuid)
returns text language plpgsql security invoker
set search_path = pg_catalog, public as $$
declare v_status text;
begin
  update public.sfi_c07_mission_jobs
    set cancel_requested_at=clock_timestamp(),
      status=case when status='QUEUED' then 'CANCELLED' else status end,
      updated_at=clock_timestamp()
    where id=p_id and tenant_id=p_tenant and status in ('QUEUED','RUNNING')
    returning status into v_status;
  return coalesce(v_status,'NOT_CANCELLABLE');
end $$;

create function public.sfi_c07_fail_mission_v1(
  p_id uuid, p_token uuid, p_reason text, p_retry_seconds int default 30
) returns text language plpgsql security invoker
set search_path = pg_catalog, public as $$
declare v_status text;
begin
  if p_reason is null or length(trim(p_reason)) not between 3 and 120 or
    p_retry_seconds not between 0 and 3600 then
    raise exception 'SFI_C07_INVALID_FAILURE_DISPOSITION';
  end if;
  update public.sfi_c07_mission_jobs
    set status=case when cancel_requested_at is not null then 'CANCELLED'
                    when attempts >= max_attempts then 'BLOCKED'
                    else 'QUEUED' end,
      available_at=clock_timestamp()+make_interval(secs => p_retry_seconds),
      last_error_code=p_reason, lease_token=null, lease_until=null,
      worker_id=null, updated_at=clock_timestamp()
    where id=p_id and status='RUNNING' and lease_token=p_token
      and lease_until>clock_timestamp()
    returning status into v_status;
  return coalesce(v_status,'STALE_OR_NOT_RUNNING');
end $$;

-- Completion is only a verified INTERNAL execution receipt, never external
-- RETURN. It independently checks the persisted epistemic event identity.
create function public.sfi_c07_complete_mission_v1(
  p_id uuid, p_token uuid, p_receipt_event_id text, p_receipt_hash text
) returns boolean language plpgsql security invoker
set search_path = pg_catalog, public as $$
declare v_job public.sfi_c07_mission_jobs;
declare v_id uuid;
begin
  select * into v_job from public.sfi_c07_mission_jobs
    where id=p_id and status='RUNNING' and lease_token=p_token
      and lease_until>clock_timestamp() and cancel_requested_at is null
    for update;
  if not found then return false; end if;
  if not exists (
    select 1 from public.epistemic_events e
    where e.event_id=p_receipt_event_id and e.hash_self=p_receipt_hash
      and e.logbook_id=('sfi-c07:' || v_job.execution_id::text)
      and e.event_name='SFI_AGENT_EXECUTED'
      and e.payload->>'executionId'=v_job.execution_id::text
      and e.payload->'metadata'->'refs'->>'missionId'=v_job.mission_id
      and e.source->>'sourceId'=v_job.agent_id
  ) then return false; end if;
  update public.sfi_c07_mission_jobs set status='COMPLETED',
    receipt_event_id=p_receipt_event_id, receipt_hash=p_receipt_hash,
    lease_token=null, lease_until=null, worker_id=null,
    updated_at=clock_timestamp()
    where id=p_id and lease_token=p_token and status='RUNNING'
      and cancel_requested_at is null returning id into v_id;
  return v_id is not null;
end $$;

-- On restarted workers, reconcile an already persisted result before running
-- the deterministic agent again. Service-role only. This is at-least-once
-- recovery with receipt deduplication, NOT globally exactly-once side effects.
create function public.sfi_c07_reconcile_mission_v1(
  p_id uuid, p_token uuid
) returns text language plpgsql security invoker
set search_path = pg_catalog, public as $c07_recover$
declare v_job public.sfi_c07_mission_jobs;
declare v_count bigint;
declare v_event_id text;
declare v_hash text;
begin
  select * into v_job from public.sfi_c07_mission_jobs
    where id=p_id and status='RUNNING' and lease_token=p_token
      and lease_until>clock_timestamp() and cancel_requested_at is null
      and (expires_at is null or expires_at>clock_timestamp())
    for update;
  if not found then return 'STALE_OR_NOT_RUNNING'; end if;
  select count(*), min(e.event_id), min(e.hash_self)
    into v_count, v_event_id, v_hash
    from public.epistemic_events e
    where e.logbook_id=('sfi-c07:' || v_job.execution_id::text)
      and e.event_name='SFI_AGENT_EXECUTED'
      and e.payload->>'executionId'=v_job.execution_id::text
      and e.payload->'metadata'->'refs'->>'missionId'=v_job.mission_id
      and e.source->>'sourceId'=v_job.agent_id;
  if v_count=0 then return 'NO_RECEIPT'; end if;
  if v_count<>1 or v_event_id is null or v_hash is null
    or length(v_hash)=0 then return 'AMBIGUOUS_OR_INVALID_RECEIPT'; end if;
  update public.sfi_c07_mission_jobs set status='COMPLETED',
      receipt_event_id=v_event_id, receipt_hash=v_hash,
      lease_token=null, lease_until=null, worker_id=null,
      updated_at=clock_timestamp()
    where id=p_id and status='RUNNING' and lease_token=p_token
      and cancel_requested_at is null;
  return 'RECONCILED_COMPLETED';
end $c07_recover$;

revoke all on function public.sfi_c07_enqueue_mission_v1(uuid,uuid,text,text,text,text,jsonb,int) from public, anon, authenticated;
revoke all on function public.sfi_c07_claim_mission_v1(text,int) from public, anon, authenticated;
revoke all on function public.sfi_c07_renew_mission_v1(uuid,uuid,int) from public, anon, authenticated;
revoke all on function public.sfi_c07_cancel_mission_v1(uuid,uuid) from public, anon, authenticated;
revoke all on function public.sfi_c07_fail_mission_v1(uuid,uuid,text,int) from public, anon, authenticated;
revoke all on function public.sfi_c07_complete_mission_v1(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.sfi_c07_enqueue_mission_v1(uuid,uuid,text,text,text,text,jsonb,int) to service_role;
grant execute on function public.sfi_c07_claim_mission_v1(text,int) to service_role;
grant execute on function public.sfi_c07_renew_mission_v1(uuid,uuid,int) to service_role;
grant execute on function public.sfi_c07_cancel_mission_v1(uuid,uuid) to service_role;
grant execute on function public.sfi_c07_fail_mission_v1(uuid,uuid,text,int) to service_role;
revoke all on function public.sfi_c07_reconcile_mission_v1(uuid,uuid) from public, anon, authenticated;
grant execute on function public.sfi_c07_complete_mission_v1(uuid,uuid,text,text) to service_role;
grant execute on function public.sfi_c07_reconcile_mission_v1(uuid,uuid) to service_role;
