alter table public.worldspect_snapshots
drop constraint if exists worldspect_snapshots_ingest_mode_check;

alter table public.worldspect_snapshots
add constraint worldspect_snapshots_ingest_mode_check
check (ingest_mode in ('daily_cron', 'manual', 'diagnostic', 'fallback_runtime'));
