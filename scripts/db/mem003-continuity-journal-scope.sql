-- MEM-003 / phase 1: stop treating plane-local governance and health state
-- as business-data replay. Preserves source images and classification evidence.
-- Tested and deployed only through the existing governed migration path.
create or replace function public.sfi_capture_data_plane_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $sfi_mem003$
declare
  current_mode text;
  current_epoch uuid;
  payload jsonb;
begin
  -- These local tables are excluded by the existing mirror/fingerprint contract.
  -- Their state must not be inserted into the other plane through the user data journal.
  if tg_table_name = any(array[
    'sfi_continuity_state',
    'sfi_continuity_runs',
    'sfi_capability_health_checks',
    'sfi_institutional_incidents',
    'sfi_founder_decision_queue',
    'sfi_continuity_reports',
    'sfi_data_plane_state',
    'sfi_data_plane_write_journal',
    'sfi_continuity_applied_operations',
    'sfi_data_plane_primary_outbox',
    'sfi_primary_mirror_applied_operations'
  ]::text[]) then
    return coalesce(new,old);
  end if;

  select mode, epoch into current_mode, current_epoch
  from public.sfi_data_plane_state where id='institution';

  if current_mode not in ('CONTINUITY','RECOVERY') then
    return coalesce(new,old);
  end if;

  payload := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.sfi_data_plane_write_journal
    (epoch,source_txid,table_name,operation,row_data,before_data)
  values (current_epoch,txid_current(),tg_table_name,
    case when tg_op='DELETE' then 'DELETE' else 'UPSERT' end,
    payload,case when tg_op='INSERT' then null else to_jsonb(old) end);
  return coalesce(new,old);
end;
$sfi_mem003$;


-- Existing operations retain their payload, original before image, ID, epoch and
-- source transaction. LOCAL_ONLY means intentionally NOT applied to Supabase.
-- The conflict is real but out of scope of bilateral business-data replay.
alter table public.sfi_data_plane_write_journal
  drop constraint sfi_data_plane_write_journal_status_check,
  add constraint sfi_data_plane_write_journal_status_check
  check (status in ('PENDING','REPLAYING','REPLAYED','CONFLICT','LOCAL_ONLY'));

-- A bounded update of the exact same plane-local table set as the trigger guard
-- above. Existing REPLAYED receipts remain REPLAYED; no journal rows are deleted.
update public.sfi_data_plane_write_journal j
   set status='LOCAL_ONLY',
       last_error=left(
         concat_ws(' | ',nullif(j.last_error,''),
           'MEM003_LOCAL_CONTROL_PLANE_EXCLUDED_FROM_BILATERAL_REPLAY'),4000),
       updated_at=now()
 where j.status in ('PENDING','CONFLICT')
   and j.table_name in (
     'sfi_continuity_state',
     'sfi_continuity_runs',
     'sfi_capability_health_checks',
     'sfi_institutional_incidents',
     'sfi_founder_decision_queue',
     'sfi_continuity_reports',
     'sfi_data_plane_state',
     'sfi_data_plane_write_journal',
     'sfi_continuity_applied_operations',
     'sfi_data_plane_primary_outbox',
     'sfi_primary_mirror_applied_operations'
   );
-- No PRIMARY promotion or outbox acknowledgement occurs here.

-- Defense in depth: older live deployments can call certification(true) as
-- soon as the primary outbox is drained, before Neon -> Supabase recovery ends.
-- Enforce the actual recovery boundary inside the Neon RPC itself.
create or replace function public.sfi_set_primary_mirror_certification_v1(
  p_certified boolean,
  p_backlog integer,
  p_error text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $mem003_cert$
declare
  result jsonb;
  current_mode text;
  journal_open boolean;
  effective boolean;
begin
  select mode into current_mode
  from public.sfi_data_plane_state
  where id='institution'
  for update;
  if current_mode is null then
    raise exception 'MEM003_DATA_PLANE_STATE_MISSING';
  end if;

  select exists (
    select 1 from public.sfi_data_plane_write_journal
    where status in ('PENDING','REPLAYING','CONFLICT')
  ) into journal_open;

  -- MEM003_CERTIFICATE_ONLY_AFTER_FULL_RECOVERY
  effective := coalesce(p_certified,false)
               and current_mode='PRIMARY'
               and not journal_open;

  update public.sfi_data_plane_state
  set primary_mirror_certified=effective,
      primary_mirror_verified_at=case when effective then now() else primary_mirror_verified_at end,
      primary_mirror_backlog=greatest(coalesce(p_backlog,0),0),
      primary_mirror_last_error=case
        when coalesce(p_certified,false) and not effective then
          left(concat('MEM003_CERTIFICATION_BLOCKED:mode=',current_mode,
                      ':journalOpen=',journal_open,
                      case when p_error is not null then concat(':',p_error) else '' end),4000)
        else left(p_error,4000)
      end,
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
$mem003_cert$;


-- Expired OAuth authorization codes are time-bound credentials, not business
-- facts requiring activation in the recovered identity provider.
-- Keep original source image and source transaction for forensic inspection.
-- A fresh, unexpired code is never included in this archival classification.
alter table public.sfi_data_plane_write_journal
  drop constraint sfi_data_plane_write_journal_status_check,
  add constraint sfi_data_plane_write_journal_status_check
  check (status in ('PENDING','REPLAYING','REPLAYED','CONFLICT',
                   'LOCAL_ONLY','EXPIRED_CREDENTIAL'));

update public.sfi_data_plane_write_journal j
   set status='EXPIRED_CREDENTIAL',
       last_error=left(concat_ws(' | ',nullif(j.last_error,''),
         'MEM003_OAUTH_CODE_EXPIRED_NO_CREDENTIAL_REACTIVATION'),4000),
       updated_at=now()
 where j.status='PENDING'
   and j.table_name='sfi_oauth_authorization_codes'
   and j.operation='UPSERT'
   and nullif(j.row_data->>'expires_at','') is not null
   and (j.row_data->>'expires_at')::timestamptz <= now();


-- MEM003 EXPIRED_OAUTH_NONREPLAYABLE
-- An OAuth authorization code is a short-lived one-time authorization
-- challenge, not durable entitlement. An expired one must never be revived
-- through the recovery path. Preserve the entire source row and old journal
-- image while recording a distinct LOCAL_ONLY reason.
update public.sfi_data_plane_write_journal j
   set status='LOCAL_ONLY',
       last_error=left(
         concat_ws(' | ',nullif(j.last_error,''),
         'MEM003_EXPIRED_OAUTH_AUTHORIZATION_CODE_NOT_REPLAYED'),4000),
       updated_at=now()
  from public.sfi_oauth_authorization_codes c
 where j.status='PENDING'
   and j.table_name='sfi_oauth_authorization_codes'
   and j.operation='UPSERT'
   and j.row_data->>'id'=c.id::text
   and j.row_data->>'code_hash'=c.code_hash
   and c.expires_at<=now()
   and (j.row_data->>'expires_at')::timestamptz<=now();


-- MEM003 EMPTY_PUBLIC_INTAKE_SCHEMA_PARITY
-- Reproduce two zero-row primary intake tables on the continuity plane.
-- Source: supabase/migrations/20260929175019_public_contact_and_newsletter_intake.sql.
-- Neon uses sfi_continuity_service rather than Supabase's service_role.
create table if not exists public.sfi_public_contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  organization text,
  subject text not null,
  message text not null,
  consent boolean not null default false,
  source text not null default 'PUBLIC',
  status text not null default 'RECEIVED' check (status in ('RECEIVED','REVIEWED','ARCHIVED')),
  created_at timestamptz not null default now()
);
create table if not exists public.sfi_public_newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  consent boolean not null default false,
  source text not null default 'PUBLIC',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','UNSUBSCRIBED')),
  consented_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists sfi_public_contact_created_idx
  on public.sfi_public_contact_submissions(created_at desc);
create index if not exists sfi_public_newsletter_status_idx
  on public.sfi_public_newsletter_subscribers(status, updated_at desc);
alter table public.sfi_public_contact_submissions enable row level security;
alter table public.sfi_public_newsletter_subscribers enable row level security;
revoke all on public.sfi_public_contact_submissions from public, authenticated;
revoke all on public.sfi_public_newsletter_subscribers from public, authenticated;
grant select, insert, update on public.sfi_public_contact_submissions to sfi_continuity_service;
grant select, insert, update on public.sfi_public_newsletter_subscribers to sfi_continuity_service;
drop policy if exists sfi_intake_service_restricted on public.sfi_public_contact_submissions;
create policy sfi_intake_service_restricted on public.sfi_public_contact_submissions
  for all to sfi_continuity_service using (true) with check (true);
drop policy if exists sfi_intake_service_restricted on public.sfi_public_newsletter_subscribers;
create policy sfi_intake_service_restricted on public.sfi_public_newsletter_subscribers
  for all to sfi_continuity_service using (true) with check (true);
-- Attach to the existing journal writer, so any future submitted intake row
-- is captured and recovered; no public or anonymous role is granted access.
do $mem003_public_triggers$
declare tbl text; trig text;
begin
 for tbl in select unnest(array[
    'sfi_public_contact_submissions','sfi_public_newsletter_subscribers'
 ]) loop
    trig := 'sfi_data_plane_capture_' || substr(md5(tbl),1,12);
    if not exists (
      select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid
      where c.relnamespace='public'::regnamespace and c.relname=tbl
        and t.tgname=trig and not t.tgisinternal
    ) then
      execute format(
       'create trigger %I after insert or update or delete on public.%I for each row execute function public.sfi_capture_data_plane_write()',
       trig,tbl);
    end if;
 end loop;
end;
$mem003_public_triggers$;
