-- Reduce PostgREST pool pressure from ROOT/runtime observation reads.
-- No persistence semantics change: indexes only.

create index if not exists epistemic_events_sequence_desc_idx
  on public.epistemic_events (sequence desc);

create index if not exists sfi_amv_memory_module_memory_key_created_idx
  on public.sfi_amv_memory (module, created_at desc)
  where ((memory_delta -> 'raw' ->> 'memoryKey') is not null);
