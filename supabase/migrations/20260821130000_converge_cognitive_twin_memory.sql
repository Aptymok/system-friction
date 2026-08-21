-- Converge the former dedicated Cognitive Twin memory table into the canonical
-- institutional memory substrate used by institutionalEventPipeline.
-- Historical rows are preserved as migrated memory records; no parallel store remains.

begin;

insert into public.sfi_amv_memory (
  session_id,
  module,
  input_hash,
  input_summary,
  inference,
  decision,
  output_summary,
  evaluation,
  memory_delta,
  uncertainty,
  source_trust,
  requires_human_validation,
  created_at
)
select
  'cognitive-twin-migrated',
  'institutionalEventPipeline',
  encode(digest('legacy-ct-memory:' || old.id::text || ':' || old.memory_key || ':' || old.version, 'sha256'), 'hex'),
  'Migrated Cognitive Twin memory: ' || old.memory_key,
  jsonb_build_object(
    'migration', 'sfi_cognitive_twin_memory_to_sfi_amv_memory',
    'formerStatus', old.status,
    'formerVersion', old.version
  ),
  '{}'::jsonb,
  coalesce(old.content->>'summary', old.content->>'title', old.memory_key),
  jsonb_build_object(
    'migrationPreserved', true,
    'formerStatus', old.status,
    'formerTable', 'sfi_cognitive_twin_memory'
  ),
  jsonb_build_object(
    'raw', jsonb_build_object(
      'memoryKey', old.memory_key,
      'memoryType', old.memory_type,
      'operation', 'MIGRATE',
      'content', old.content || jsonb_build_object(
        'memoryStatus', case
          when old.status in ('VERIFIED','CANONICAL','REJECTED') then old.status
          when old.status = 'SUPERSEDED' then 'OBSOLETE'
          else 'CANDIDATE'
        end,
        'migratedFrom', 'sfi_cognitive_twin_memory',
        'formerStatus', old.status,
        'formerVersion', old.version
      ),
      'evidenceRefs', to_jsonb(old.evidence_refs),
      'sourceKind', old.source_kind,
      'sourceRef', old.source_ref,
      'createdBy', old.created_by,
      'migrationSourceId', old.id::text
    )
  ),
  1,
  0,
  old.status not in ('VERIFIED','CANONICAL'),
  old.created_at
from public.sfi_cognitive_twin_memory old
where not exists (
  select 1
  from public.sfi_amv_memory m
  where m.module = 'institutionalEventPipeline'
    and m.memory_delta->'raw'->>'migrationSourceId' = old.id::text
);

-- The former memory table has no runtime owner after this migration.
drop table if exists public.sfi_cognitive_twin_memory;

commit;
