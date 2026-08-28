-- SFI-STUDIO-HYGIENE-1.0
-- Idempotent semantic backfill. It does not delete objects and does not promote traces to EVIDENCE.
-- Production cleanup on 2026-08-27 separately removed two verified debug residues after a 14-table FK audit;
-- those deletions are preserved in sfi_audit_events as STUDIO_DISPOSABLE_RESIDUE_PURGED.

with source as (
  select
    o.id,
    coalesce(o.metadata,'{}'::jsonb) as old_metadata,
    case
      when lower(coalesce(o.title,'')) like 'debug %' then 'DEV_TEST'
      when nullif(o.metadata->>'canonicalState','') is not null then 'CANONICAL'
      when lower(coalesce(o.status,''))='archived' then 'HISTORICAL_REFERENCE'
      else 'ACTIVE'
    end as lifecycle_class,
    coalesce(
      nullif(o.metadata#>>'{studioAudioEngine,checksumSha256}',''),
      substring(coalesce(o.metadata#>>'{studioAudioEngine,idempotencyKey}','') from '([0-9a-fA-F]{64})'),
      nullif(o.metadata->>'contentHash',''),
      nullif(o.metadata->>'checksumSha256','')
    ) as content_hash,
    coalesce(nullif(o.metadata#>>'{studioAudioEngine,status}',''),nullif(o.status,''),'UNKNOWN') as processing_state,
    case
      when upper(coalesce(o.metadata->>'storageState','')) like '%NOT_MATERIALIZED%' then 'IDENTITY_ONLY'
      when nullif(o.source_uri,'') is not null then 'BINARY_RETRIEVABLE_BY_REFERENCE'
      when nullif(o.metadata->>'canonicalState','') is not null then 'IDENTITY_ONLY'
      else 'UNKNOWN'
    end as materialization_state,
    coalesce(nullif(o.metadata#>>'{objectContextSynthesis,traceId}',''),nullif(o.metadata#>>'{objectContextSynthesis,evidenceTraceId}','')) as trace_id,
    nullif(o.metadata->>'canonicalState','') is not null as canonical_verified
  from public.studio_objects o
), prepared as (
  select
    id,
    old_metadata,
    old_metadata || jsonb_build_object(
      'hygiene', jsonb_build_object(
        'contract','SFI-STUDIO-HYGIENE-1.0',
        'lifecycleClass',lifecycle_class,
        'operationalVisibility',case when lifecycle_class in ('ACTIVE','CANONICAL') then 'VISIBLE_BY_DEFAULT' else 'EXCLUDED_BY_DEFAULT' end,
        'contentIdentity',case when content_hash is not null then jsonb_build_object('state','VERIFIED_HASH','hash',lower(content_hash),'algorithm','sha256') else jsonb_build_object('state','UNVERIFIED','hash',null,'algorithm',null) end,
        'contentKey',case when content_hash is null then null else 'sha256:'||lower(content_hash) end,
        'identityRole',case when content_hash is null then 'OBJECT_RECORD' else 'PROCESSING_ATTEMPT' end,
        'processingState',processing_state,
        'identityBoundary',case when content_hash is null then 'Content identity is unverified; title, size or filename similarity must not be treated as duplicate proof.' else 'Objects sharing contentKey are processing attempts of the same verified content identity; attempt outcomes remain separate lineage.' end,
        'materializationState',materialization_state,
        'canonicalIdentityVerified',canonical_verified,
        'binaryRetrievable',materialization_state='BINARY_RETRIEVABLE_BY_REFERENCE',
        'trace',case when trace_id is null then null else jsonb_build_object('id',trace_id,'class','TECHNICAL_LINEAGE','epistemicAuthority','NONE') end,
        'classificationBasis','SFI_STUDIO_HYGIENE_BACKFILL_2026_08_27'
      )
    ) as new_metadata
  from source
), audited as (
  insert into public.sfi_audit_events(action,target_type,target_id,before_state,after_state,context)
  select 'STUDIO_HYGIENE_CLASSIFIED','studio_object',id::text,
    jsonb_build_object('metadata',old_metadata),jsonb_build_object('metadata',new_metadata),
    jsonb_build_object('contract','SFI-STUDIO-HYGIENE-1.0','reason','Lifecycle/content-attempt/materialization/trace classification; no evidence authority granted.')
  from prepared where new_metadata is distinct from old_metadata
  returning target_id
)
update public.studio_objects o
set metadata=p.new_metadata,updated_at=now()
from prepared p
where o.id=p.id and p.new_metadata is distinct from p.old_metadata;

-- Reclassify only obvious UX/support phrases that were previously stored as creative prohibited effects.
with expanded as (
  select o.id,o.metadata,e.value
  from public.studio_objects o
  cross join lateral jsonb_array_elements_text(
    case when jsonb_typeof(o.metadata#>'{context,prohibitedEffects}')='array' then o.metadata#>'{context,prohibitedEffects}' else '[]'::jsonb end
  ) e(value)
), grouped as (
  select
    id,
    max(metadata::text)::jsonb as old_metadata,
    coalesce(jsonb_agg(to_jsonb(value)) filter (where lower(value) like '%recordatorio%'),'[]'::jsonb) as support_need,
    coalesce(jsonb_agg(to_jsonb(value)) filter (where lower(value) like '%no entiendo%' or lower(value) like '%no recuerdo%' or lower(value) like '%herramienta%'),'[]'::jsonb) as ux_friction,
    coalesce(jsonb_agg(to_jsonb(value)) filter (where not (lower(value) like '%recordatorio%' or lower(value) like '%no entiendo%' or lower(value) like '%no recuerdo%' or lower(value) like '%herramienta%')),'[]'::jsonb) as creative_constraints,
    count(*) filter (where lower(value) like '%recordatorio%' or lower(value) like '%no entiendo%' or lower(value) like '%no recuerdo%' or lower(value) like '%herramienta%') as moved_count
  from expanded group by id
), prepared as (
  select id,old_metadata,
    old_metadata || jsonb_build_object('context',coalesce(old_metadata->'context','{}'::jsonb) || jsonb_build_object(
      'prohibitedEffects',creative_constraints,
      'creativeConstraints',jsonb_build_object('prohibitedEffects',creative_constraints),
      'operatorFeedback',coalesce(old_metadata#>'{context,operatorFeedback}','{}'::jsonb) || jsonb_build_object(
        'uxFriction',coalesce(old_metadata#>'{context,operatorFeedback,uxFriction}','[]'::jsonb) || ux_friction,
        'supportNeed',coalesce(old_metadata#>'{context,operatorFeedback,supportNeed}','[]'::jsonb) || support_need,
        'notes',coalesce(old_metadata#>'{context,operatorFeedback,notes}','[]'::jsonb)
      )
    )) as new_metadata,moved_count
  from grouped where moved_count>0
), audited as (
  insert into public.sfi_audit_events(action,target_type,target_id,before_state,after_state,context)
  select 'STUDIO_CONTEXT_SEMANTIC_RECLASSIFICATION','studio_object',id::text,
    jsonb_build_object('metadata',old_metadata),jsonb_build_object('metadata',new_metadata),
    jsonb_build_object('contract','SFI-STUDIO-HYGIENE-1.0','reason','UX/support language is not a creative prohibited effect.','movedItems',moved_count)
  from prepared returning target_id
)
update public.studio_objects o set metadata=p.new_metadata,updated_at=now()
from prepared p where o.id=p.id;
