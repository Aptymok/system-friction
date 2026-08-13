-- SFI schema retirement plan after canonical architecture consolidation.
-- This file is intentionally NOT under supabase/migrations.
-- Execute only through scripts/db/run-retirement-with-snapshot.mjs so a full
-- PostgreSQL snapshot ZIP + SHA-256 receipt exists and is verified first.
-- No CASCADE is used: any hidden dependency must block retirement.

begin;

-- Derived read models superseded by canonical owners.
drop view if exists public.vw_sfi_attractor_alignment_queue;
drop view if exists public.vw_sfi_perturbation_history;
drop view if exists public.vw_sfi_reality_console_state;

-- Empty, unconsumed tables confirmed by the 2026-08-12 live read-only audit.
drop table if exists public.graph_history;
drop table if exists public.institutional_memory_audit_log;
drop table if exists public.mihm_state_registry;
drop table if exists public.sfi_ejectors;
drop table if exists public.sfi_graph_edges;
drop table if exists public.sfi_reports;

commit;
