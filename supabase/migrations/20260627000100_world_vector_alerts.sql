create table if not exists public.world_vector_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null check (alert_type in ('silent','degraded','failed','stale','low_coverage','write_failed')),
  severity text not null check (severity in ('info','warning','critical')),
  detected_at timestamptz not null default now(),
  resolved_at timestamptz null,
  message text not null,
  last_good_snapshot_at timestamptz null,
  probable_cause text null,
  recommended_action text null,
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists world_vector_alerts_status_detected_at_idx
  on public.world_vector_alerts (status, detected_at desc);

create index if not exists world_vector_alerts_alert_type_detected_at_idx
  on public.world_vector_alerts (alert_type, detected_at desc);
