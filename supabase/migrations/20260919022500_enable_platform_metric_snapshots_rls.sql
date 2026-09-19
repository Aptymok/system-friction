-- SFI security hardening: platform_metric_snapshots is an internal/runtime table.
-- Observed production state before this migration:
-- - 0 rows
-- - no anon/authenticated grants
-- - only postgres + service_role privileges
-- - no application/runtime readers in the repository
-- RLS is therefore enabled fail-closed with no client policy. Service-role operations remain unaffected.

alter table public.platform_metric_snapshots
  enable row level security;
