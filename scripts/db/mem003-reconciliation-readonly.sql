-- MEM-003: non-mutating data-plane reconciliation checks.
-- Run separately on primary and continuity databases; compare result sets.
-- Never interpret an empty optional table as a defect without its writer contract.
select 'profiles' as relation, count(*)::bigint as rows from public.profiles
union all select 'sfi_account_access_grants', count(*) from public.sfi_account_access_grants
union all select 'sfi_audit_events', count(*) from public.sfi_audit_events
union all select 'sfi_cases', count(*) from public.sfi_cases
union all select 'sfi_case_objects', count(*) from public.sfi_case_objects
order by relation;

-- Compare primary and continuity independently using the stable primary key and
-- a digest of the full row, not row counts alone. Do not expose profile data.
select 'profiles' as relation, user_id::text as record_key,
       md5(to_jsonb(t)::text) as row_digest from public.profiles t
union all
select 'sfi_account_access_grants', id::text, md5(to_jsonb(t)::text)
from public.sfi_account_access_grants t
union all
select 'sfi_audit_events', id::text, md5(to_jsonb(t)::text)
from public.sfi_audit_events t
order by relation, record_key;

-- Primary-only: inspect unresolved transaction grouping and error propagation.
-- Do not reset status, delete records or rewrite historic audit events.
-- select source_txid, sequence, table_name, operation, status,
--        (before_data is not null) as has_before, attempts, last_error
-- from public.sfi_data_plane_primary_outbox
-- where status = 'CONFLICT'
-- order by source_txid, sequence;
