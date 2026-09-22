-- Restrict the primary outbox trigger function to the internal service role.
-- Trigger execution remains owned by existing table triggers; this removes
-- direct API execution from PUBLIC/anon/authenticated.

revoke all on function public.sfi_capture_primary_data_plane_write() from public, anon, authenticated;
grant execute on function public.sfi_capture_primary_data_plane_write() to service_role;
