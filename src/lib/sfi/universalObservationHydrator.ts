import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { normalizeUniversalSignal, type UniversalCycleInput } from '@/lib/sfi/universalSignalCycle';

export const SFI_UNIVERSAL_OBSERVATION_HYDRATOR_CONTRACT = 'SFI-UNIVERSAL-OBSERVATION-HYDRATOR-1.0' as const;

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function hasMaterialExtraction(value: unknown) {
  const extracted = row(value);
  if (Object.keys(extracted).length === 0) return false;
  const schema = extracted.schema ?? extracted.fields ?? extracted.columns ?? extracted.headers;
  const count = extracted.rowCount ?? extracted.recordCount ?? extracted.totalRows ?? extracted.count;
  return (Array.isArray(schema) && schema.length > 0) || (Number.isFinite(Number(count)) && Number(count) >= 0);
}

function tenantMatches(payload: Row, tenantId: string) {
  const eventTenant = text(payload.tenantId);
  return !eventTenant || eventTenant === tenantId;
}

function matchStructuredResult(payload: Row, normalized: ReturnType<typeof normalizeUniversalSignal>) {
  const object = row(payload.object);
  const eventHash = text(payload.objectHash) ?? text(object.objectHash) ?? text(object.contentHash) ?? text(object.fingerprint);
  const eventKey = text(payload.objectKey) ?? text(object.objectKey);
  const eventAssetRef = text(object.assetRef);
  if (eventHash && normalized.objectHashBasis !== 'REFERENCE_IDENTITY' && eventHash === normalized.objectHash) return true;
  if (eventKey && eventKey === normalized.objectKey) return true;
  return Boolean(eventAssetRef && normalized.assetRef && eventAssetRef === normalized.assetRef);
}

function matchDatasetProfile(payload: Row, normalized: ReturnType<typeof normalizeUniversalSignal>) {
  const contentHash = text(payload.contentHash);
  if (contentHash && normalized.objectHashBasis !== 'REFERENCE_IDENTITY' && contentHash === normalized.objectHash) return true;
  const storagePath = text(payload.storagePath);
  const storageAssetRef = storagePath ? `storage://field-evidence/${storagePath}` : null;
  return Boolean(storageAssetRef && normalized.assetRef === storageAssetRef);
}

function extractionFromStructuredResult(payload: Row) {
  const result = row(payload.result);
  const profile = row(result.profile);
  const observations = row(profile.observations);
  const source = row(profile.source);
  return {
    ...result,
    ...(Object.keys(profile).length ? { profile } : {}),
    schema: result.schema ?? result.fields ?? result.columns ?? result.headers ?? observations.schema ?? observations.headers ?? null,
    rowCount: result.rowCount ?? result.recordCount ?? result.totalRows ?? observations.totalRows ?? null,
    analyzableRowCount: result.analyzableRowCount ?? observations.totalAnalyzableRows ?? null,
    malformedRows: result.malformedRows ?? observations.totalMalformedRows ?? null,
    sourceContentHash: text(source.contentHash) ?? null,
  };
}

function extractionFromDatasetProfile(payload: Row) {
  const summary = row(payload.summary);
  return {
    schema: Array.isArray(summary.primaryHeaders) ? summary.primaryHeaders : [],
    rowCount: Number(summary.totalRows ?? 0),
    analyzableRowCount: Number(summary.totalAnalyzableRows ?? 0),
    malformedRows: Number(summary.totalMalformedRows ?? 0),
    sheetCount: Number(summary.sheetCount ?? 0),
    profileRef: text(row(payload.observationRef).id),
    profileHash: text(payload.profileHash),
    sourceContentHash: text(payload.contentHash),
    hydrationBasis: 'SFI_DATASET_PROFILE_ADMITTED',
  };
}

export async function hydrateUniversalCycleInput(input: UniversalCycleInput, tenantId: string) {
  const normalized = normalizeUniversalSignal(input.signal);
  if (hasMaterialExtraction(input.signal.extracted) || input.signal.content !== null && input.signal.content !== undefined) {
    return {
      contract: SFI_UNIVERSAL_OBSERVATION_HYDRATOR_CONTRACT,
      hydrated: false,
      basis: 'INPUT_ALREADY_MATERIAL',
      eventId: null,
      input,
    };
  }

  const db = createServiceSupabaseClient();
  const events = await db.from('epistemic_events')
    .select('event_id,event_name,payload,occurred_at')
    .in('event_name', ['SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED', 'SFI_DATASET_PROFILE_ADMITTED'])
    .order('sequence', { ascending: false })
    .limit(300);
  if (events.error) {
    return {
      contract: SFI_UNIVERSAL_OBSERVATION_HYDRATOR_CONTRACT,
      hydrated: false,
      basis: 'HYDRATION_LOOKUP_DEGRADED',
      warning: events.error.message,
      eventId: null,
      input,
    };
  }

  for (const event of events.data ?? []) {
    const payload = row(event.payload);
    if (!tenantMatches(payload, tenantId)) continue;
    if (event.event_name === 'SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED' && matchStructuredResult(payload, normalized)) {
      const extracted = extractionFromStructuredResult(payload);
      if (!hasMaterialExtraction(extracted)) continue;
      return {
        contract: SFI_UNIVERSAL_OBSERVATION_HYDRATOR_CONTRACT,
        hydrated: true,
        basis: 'SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED',
        eventId: String(event.event_id ?? ''),
        input: {
          ...input,
          signal: {
            ...input.signal,
            extracted: { ...row(input.signal.extracted), ...extracted },
            provenance: {
              ...row(input.signal.provenance),
              hydratedFromEventId: String(event.event_id ?? ''),
              hydrationContract: SFI_UNIVERSAL_OBSERVATION_HYDRATOR_CONTRACT,
            },
          },
        } as UniversalCycleInput,
      };
    }
    if (event.event_name === 'SFI_DATASET_PROFILE_ADMITTED' && matchDatasetProfile(payload, normalized)) {
      const extracted = extractionFromDatasetProfile(payload);
      if (!hasMaterialExtraction(extracted)) continue;
      return {
        contract: SFI_UNIVERSAL_OBSERVATION_HYDRATOR_CONTRACT,
        hydrated: true,
        basis: 'SFI_DATASET_PROFILE_ADMITTED',
        eventId: String(event.event_id ?? ''),
        input: {
          ...input,
          signal: {
            ...input.signal,
            objectHash: text(payload.contentHash) ?? input.signal.objectHash,
            extracted: { ...row(input.signal.extracted), ...extracted },
            provenance: {
              ...row(input.signal.provenance),
              hydratedFromEventId: String(event.event_id ?? ''),
              caseId: text(payload.caseId),
              observationRef: text(row(payload.observationRef).id),
              hydrationContract: SFI_UNIVERSAL_OBSERVATION_HYDRATOR_CONTRACT,
            },
          },
        } as UniversalCycleInput,
      };
    }
  }

  return {
    contract: SFI_UNIVERSAL_OBSERVATION_HYDRATOR_CONTRACT,
    hydrated: false,
    basis: 'NO_MATCHING_MATERIAL_OBSERVATION',
    eventId: null,
    input,
  };
}
