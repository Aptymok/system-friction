import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { normalizeUniversalSignal, type UniversalCycleInput } from '@/lib/sfi/universalSignalCycle';

export const SFI_UNIVERSAL_OBSERVATION_HYDRATOR_CONTRACT = 'SFI-UNIVERSAL-OBSERVATION-HYDRATOR-1.1' as const;

type Row = Record<string, unknown>;
type ServiceDb = ReturnType<typeof createServiceSupabaseClient>;
type HydrationOptions = { resumeCycleId?: string | null };

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function hasMaterialExtraction(value: unknown) {
  const extracted = row(value);
  if (Object.keys(extracted).length === 0) return false;
  const measurements = row(extracted.measurements);
  const schema = extracted.schema
    ?? extracted.fields
    ?? extracted.columns
    ?? extracted.headers
    ?? measurements.schema
    ?? measurements.fields
    ?? measurements.columns
    ?? measurements.headers;
  const count = extracted.rowCount
    ?? extracted.recordCount
    ?? extracted.totalRows
    ?? extracted.count
    ?? measurements.rowCount
    ?? measurements.recordCount
    ?? measurements.totalRows
    ?? measurements.count;
  return (Array.isArray(schema) && schema.length > 0) || (Number.isFinite(Number(count)) && Number(count) >= 0);
}

function tenantMatches(payload: Row, tenantId: string) {
  const eventTenant = text(payload.tenantId);
  return !eventTenant || eventTenant === tenantId;
}

function matchStructuredResult(
  payload: Row,
  normalized: ReturnType<typeof normalizeUniversalSignal>,
  resumeCycleId: string | null,
) {
  const eventCycleId = text(payload.cycleId);
  if (resumeCycleId && eventCycleId === resumeCycleId) return true;

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
  const measurements = row(result.measurements);
  const profile = row(result.profile);
  const observations = row(profile.observations);
  const source = row(profile.source);
  return {
    ...result,
    ...(Object.keys(profile).length ? { profile } : {}),
    schema: result.schema
      ?? result.fields
      ?? result.columns
      ?? result.headers
      ?? measurements.schema
      ?? measurements.fields
      ?? measurements.columns
      ?? measurements.headers
      ?? observations.schema
      ?? observations.headers
      ?? null,
    rowCount: result.rowCount
      ?? result.recordCount
      ?? result.totalRows
      ?? measurements.rowCount
      ?? measurements.recordCount
      ?? measurements.totalRows
      ?? observations.totalRows
      ?? null,
    analyzableRowCount: result.analyzableRowCount
      ?? measurements.analyzableRowCount
      ?? observations.totalAnalyzableRows
      ?? null,
    malformedRows: result.malformedRows
      ?? measurements.malformedRows
      ?? observations.totalMalformedRows
      ?? null,
    sheetCount: result.sheetCount
      ?? measurements.sheetCount
      ?? observations.sheetCount
      ?? null,
    sourceContentHash: text(source.contentHash) ?? text(row(payload.object).objectHash) ?? null,
    structuredResultCycleId: text(payload.cycleId),
    hydrationBasis: 'SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED',
  };
}

async function extractionFromDatasetProfile(db: ServiceDb, payload: Row) {
  const summary = row(payload.summary);
  const caseId = text(payload.caseId);
  const observationId = text(row(payload.observationRef).id);
  let fullProfile: Row = {};
  let observationObjectId: string | null = null;

  if (caseId && observationId) {
    const observations = await db.from('sfi_case_objects')
      .select('id,canonical_ref,payload')
      .eq('case_id', caseId)
      .eq('object_kind', 'OBSERVATION')
      .order('created_at', { ascending: false })
      .limit(250);
    if (!observations.error) {
      const matched = (observations.data ?? []).find((item) => text(row(item.canonical_ref).id) === observationId);
      const objectPayload = row(matched?.payload);
      fullProfile = row(objectPayload.profile);
      observationObjectId = matched?.id ? String(matched.id) : null;
    }
  }

  const profileObservations = row(fullProfile.observations);
  const sheets = Array.isArray(fullProfile.sheets) ? fullProfile.sheets : [];
  const primarySheet = row(sheets[0]);
  const profileHeaders = Array.isArray(primarySheet.headers) ? primarySheet.headers : [];
  const schema = Array.isArray(summary.primaryHeaders) && summary.primaryHeaders.length
    ? summary.primaryHeaders
    : profileHeaders;

  return {
    ...(Object.keys(fullProfile).length ? { profile: fullProfile } : {}),
    schema,
    rowCount: Number(summary.totalRows ?? profileObservations.totalRows ?? 0),
    analyzableRowCount: Number(summary.totalAnalyzableRows ?? profileObservations.totalAnalyzableRows ?? 0),
    malformedRows: Number(summary.totalMalformedRows ?? profileObservations.totalMalformedRows ?? 0),
    sheetCount: Number(summary.sheetCount ?? profileObservations.sheetCount ?? sheets.length ?? 0),
    profileRef: observationId,
    profileObjectId: observationObjectId,
    profileHash: text(payload.profileHash),
    sourceContentHash: text(payload.contentHash),
    hydrationBasis: 'SFI_DATASET_PROFILE_ADMITTED',
  };
}

export async function hydrateUniversalCycleInput(
  input: UniversalCycleInput,
  tenantId: string,
  options: HydrationOptions = {},
) {
  const normalized = normalizeUniversalSignal(input.signal);
  const resumeCycleId = text(options.resumeCycleId);
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
  const eventNames = ['SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED', 'SFI_DATASET_PROFILE_ADMITTED'];
  const cycleEvents = resumeCycleId
    ? await db.from('epistemic_events')
        .select('event_id,event_name,payload,occurred_at')
        .in('event_name', eventNames)
        .eq('payload->>cycleId', resumeCycleId)
        .order('sequence', { ascending: false })
        .limit(100)
    : null;

  if (cycleEvents?.error) {
    return {
      contract: SFI_UNIVERSAL_OBSERVATION_HYDRATOR_CONTRACT,
      hydrated: false,
      basis: 'HYDRATION_LOOKUP_DEGRADED',
      warning: cycleEvents.error.message,
      eventId: null,
      input,
    };
  }

  const fallbackEvents = !resumeCycleId || !(cycleEvents?.data?.length)
    ? await db.from('epistemic_events')
        .select('event_id,event_name,payload,occurred_at')
        .in('event_name', eventNames)
        .order('sequence', { ascending: false })
        .limit(300)
    : null;

  if (fallbackEvents?.error) {
    return {
      contract: SFI_UNIVERSAL_OBSERVATION_HYDRATOR_CONTRACT,
      hydrated: false,
      basis: 'HYDRATION_LOOKUP_DEGRADED',
      warning: fallbackEvents.error.message,
      eventId: null,
      input,
    };
  }

  const candidates = cycleEvents?.data?.length ? cycleEvents.data : fallbackEvents?.data ?? [];
  for (const event of candidates) {
    const payload = row(event.payload);
    if (!tenantMatches(payload, tenantId)) continue;
    if (event.event_name === 'SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED' && matchStructuredResult(payload, normalized, resumeCycleId)) {
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
              hydratedFromCycleId: text(payload.cycleId),
              hydrationContract: SFI_UNIVERSAL_OBSERVATION_HYDRATOR_CONTRACT,
            },
          },
        } as UniversalCycleInput,
      };
    }
    if (event.event_name === 'SFI_DATASET_PROFILE_ADMITTED' && matchDatasetProfile(payload, normalized)) {
      const extracted = await extractionFromDatasetProfile(db, payload);
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
