alter table public.epistemic_events
drop constraint if exists epistemic_events_logbook_id_check;


alter table public.epistemic_events
add constraint epistemic_events_logbook_id_check
check (
  length(logbook_id) > 0
);