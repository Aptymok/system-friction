-- SFI Notas Temporales monthly publication candidate.
-- Reuses the existing world_vector_reports persistence owner; no new report table.

alter table public.world_vector_reports
  drop constraint if exists world_vector_reports_report_type_check;

alter table public.world_vector_reports
  add constraint world_vector_reports_report_type_check
  check (report_type in ('internal_daily','public_weekly','cycle_close','temporal_issue_monthly'));

comment on constraint world_vector_reports_report_type_check on public.world_vector_reports is
  'Bounded report classes. temporal_issue_monthly stores a governed Notas Temporales candidate; it does not itself publish or mutate canonical registry state.';
