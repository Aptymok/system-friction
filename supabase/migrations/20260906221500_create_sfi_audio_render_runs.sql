-- SFI-AUDIO-EPHEMERAL-ASSET-1.0
-- Durable render receipts persist refs/hashes/metrics/versions/rights assertions/lineage only.
-- Raw audio/sample bytes are intentionally absent. GENERATED_RENDER != EXTERNAL OBSERVATION.
-- RIGHTS ELIGIBILITY != INSTITUTIONAL AUTHORIZATION.

create table if not exists public.sfi_audio_render_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  run_id text not null,
  receipt_contract text not null check (receipt_contract = 'SFI-AUDIO-RENDER-RECEIPT-1.0'),
  instrument_id uuid not null references public.sfi_instruments(id) on delete restrict,
  source_reference_id uuid references public.sfi_cultural_references(id) on delete restrict,
  package_ref text not null,
  package_hash text not null check (package_hash ~ '^sha256:[0-9a-f]{64}$'),
  package_version text not null,
  manifest_hash text not null check (manifest_hash ~ '^sha256:[0-9a-f]{64}$'),
  mapping_ref text not null,
  mapping_hash text not null check (mapping_hash ~ '^sha256:[0-9a-f]{64}$'),
  sample_refs jsonb not null default '[]'::jsonb,
  performance_ref text not null,
  performance_hash text not null check (performance_hash ~ '^sha256:[0-9a-f]{64}$'),
  performance_version text not null,
  adapter_id text not null,
  adapter_version text not null,
  output_ref text not null,
  output_hash text not null check (output_hash ~ '^sha256:[0-9a-f]{64}$'),
  output_epistemic_class text not null check (output_epistemic_class = 'GENERATED_RENDER'),
  render_parameters jsonb not null,
  metrics jsonb not null,
  rights_assertions jsonb not null,
  institutional_authorization_ref text not null,
  lineage jsonb not null,
  cleanup_state text not null check (cleanup_state in ('CLEANED', 'FAILED')),
  cleanup_workspace_ref_hash text not null check (cleanup_workspace_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  cleanup_existed_before boolean not null,
  cleanup_exists_after boolean not null,
  cleanup_error text,
  cleanup_at timestamptz not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint sfi_audio_render_runs_owner_run_unique unique (owner_id, run_id),
  constraint sfi_audio_render_runs_time_order check (finished_at >= started_at),
  constraint sfi_audio_render_runs_cleanup_truth check (
    cleanup_state <> 'CLEANED' or (cleanup_existed_before = true and cleanup_exists_after = false and cleanup_error is null)
  )
);

comment on table public.sfi_audio_render_runs is
  'WS-06 durable material-execution receipt owner. Stores references and measurements, never raw audio bytes by default.';
comment on column public.sfi_audio_render_runs.output_epistemic_class is
  'Generated/rendered material class. This row does not admit the output as an external observation.';
comment on column public.sfi_audio_render_runs.institutional_authorization_ref is
  'Explicit governed execution authorization reference; material-rights eligibility alone is insufficient.';

create index if not exists sfi_audio_render_runs_owner_created_idx
  on public.sfi_audio_render_runs(owner_id, created_at desc);
create index if not exists sfi_audio_render_runs_instrument_idx
  on public.sfi_audio_render_runs(instrument_id, created_at desc);
create index if not exists sfi_audio_render_runs_source_reference_idx
  on public.sfi_audio_render_runs(source_reference_id)
  where source_reference_id is not null;

alter table public.sfi_audio_render_runs enable row level security;
alter table public.sfi_audio_render_runs force row level security;

revoke all on public.sfi_audio_render_runs from anon;
revoke all on public.sfi_audio_render_runs from authenticated;
grant select on public.sfi_audio_render_runs to authenticated;

drop policy if exists sfi_audio_render_runs_owner_select on public.sfi_audio_render_runs;
create policy sfi_audio_render_runs_owner_select on public.sfi_audio_render_runs
for select to authenticated
using (owner_id = auth.uid());

create or replace function public.sfi_forbid_audio_render_receipt_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'SFI_AUDIO_RENDER_RECEIPT_IMMUTABLE';
end;
$$;

drop trigger if exists sfi_audio_render_runs_update_guard on public.sfi_audio_render_runs;
create trigger sfi_audio_render_runs_update_guard
before update on public.sfi_audio_render_runs
for each row execute function public.sfi_forbid_audio_render_receipt_mutation();

drop trigger if exists sfi_audio_render_runs_delete_guard on public.sfi_audio_render_runs;
create trigger sfi_audio_render_runs_delete_guard
before delete on public.sfi_audio_render_runs
for each row execute function public.sfi_forbid_audio_render_receipt_mutation();

revoke execute on function public.sfi_forbid_audio_render_receipt_mutation() from public, anon, authenticated;
