-- SFI security hardening for internal trigger functions.
-- These functions are reached through database triggers, not as public RPC capabilities.
-- Remove inherited PUBLIC EXECUTE and pin deterministic search_path where the function body
-- only needs pg_catalog built-ins.

revoke execute on function public.sfi_seed_tenant_owner() from public;
revoke execute on function public.sfi_case_platform_touch_updated_at() from public;
revoke execute on function public.sfi_case_action_touch_updated_at() from public;

alter function public.sfi_case_platform_touch_updated_at()
  set search_path = pg_catalog;

alter function public.sfi_case_action_touch_updated_at()
  set search_path = pg_catalog;
