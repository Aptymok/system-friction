-- P0 bounded provider-call admission, atomic across Vercel instances.
-- Request admissions are a conservative cost proxy, NOT vendor billing in USD.
-- Migration required BEFORE deploying the application code; missing RPC fails closed.
create table if not exists public.sfi_legacy_ai_admission_buckets (
  bucket_key text primary key,
  window_start timestamptz not null,
  used integer not null default 0 check (used >= 0),
  updated_at timestamptz not null default now()
);
create index if not exists sfi_legacy_ai_admission_buckets_updated_idx
  on public.sfi_legacy_ai_admission_buckets (updated_at);
alter table public.sfi_legacy_ai_admission_buckets enable row level security;
revoke all on public.sfi_legacy_ai_admission_buckets from public, anon, authenticated;
grant select, insert, update, delete on public.sfi_legacy_ai_admission_buckets to service_role;

create or replace function public.sfi_admit_legacy_ai_request_v1(p_actor_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_now timestamptz := transaction_timestamp();
  v_day_key text;
  v_minute_key text;
  v_daily integer;
  v_minute integer;
begin
  if p_actor_id is null then
    return jsonb_build_object('admitted', false, 'reason', 'INVALID_ACTOR');
  end if;

  -- The endpoint allows at most 60 admissions globally per UTC day and
  -- 6 admissions per authenticated actor per UTC minute. No caller limits.
  v_day_key := 'global:day:' || to_char(v_now at time zone 'UTC', 'YYYYMMDD');
  v_minute_key := 'actor:minute:' || p_actor_id::text || ':'
    || to_char(v_now at time zone 'UTC', 'YYYYMMDDHH24MI');

  -- Serialize admissions at the database, not at each serverless instance.
  perform pg_advisory_xact_lock(hashtextextended('sfi_legacy_ai_admission_v1', 0));

  insert into public.sfi_legacy_ai_admission_buckets (bucket_key, window_start, used)
  values (v_day_key, date_trunc('day', v_now), 0),
         (v_minute_key, date_trunc('minute', v_now), 0)
  on conflict (bucket_key) do nothing;

  select used into v_daily from public.sfi_legacy_ai_admission_buckets
    where bucket_key = v_day_key for update;
  select used into v_minute from public.sfi_legacy_ai_admission_buckets
    where bucket_key = v_minute_key for update;
  if v_daily is null or v_minute is null then
    raise exception 'SFI_AI_ADMISSION_UNAVAILABLE';
  end if;

  if v_daily >= 60 then
    return jsonb_build_object('admitted', false, 'reason', 'GLOBAL_DAILY_QUOTA_REACHED');
  end if;
  if v_minute >= 6 then
    return jsonb_build_object('admitted', false, 'reason', 'ACTOR_MINUTE_QUOTA_REACHED');
  end if;

  update public.sfi_legacy_ai_admission_buckets
    set used = used + 1, updated_at = v_now
    where bucket_key in (v_day_key, v_minute_key);

  -- Retention is bounded. Cleanup only removes windows outside their lifespan.
  delete from public.sfi_legacy_ai_admission_buckets
    where updated_at < v_now - interval '3 days';

  return jsonb_build_object(
    'admitted', true, 'reason', 'ADMITTED',
    'globalDailyUsed', v_daily + 1, 'actorMinuteUsed', v_minute + 1,
    'units', 'REQUEST_ADMISSIONS_NOT_USD'
  );
end;
$function$;

revoke all on function public.sfi_admit_legacy_ai_request_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.sfi_admit_legacy_ai_request_v1(uuid)
  to service_role;
