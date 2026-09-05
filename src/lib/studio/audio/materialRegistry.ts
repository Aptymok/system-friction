import 'server-only';
import { createServerSupabaseClient, getVerifiedServerUser } from '@/runtime/supabase/server';
import {
  assertCulturalReferenceInput,
  assertInstrumentRegistryInput,
  assertReferenceMaterializationAllowed,
  type SfiCulturalReferenceInput,
  type SfiCulturalReferenceSnapshot,
  type SfiInstrumentRegistryInput,
} from './materialRegistryContract';

type RegistryRow = Record<string, unknown>;

async function authenticatedRegistryContext() {
  const db = await createServerSupabaseClient();
  const user = await getVerifiedServerUser(db);
  if (!user) throw new Error('SFI_AUDIO_REGISTRY_AUTH_REQUIRED');
  return { db, ownerId: user.id };
}

export async function listSfiInstruments(limit = 100): Promise<RegistryRow[]> {
  const { db, ownerId } = await authenticatedRegistryContext();
  const safeLimit = Math.max(1, Math.min(250, Math.floor(limit)));
  const { data, error } = await db
    .from('sfi_instruments')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) throw new Error(`SFI_AUDIO_INSTRUMENT_READ_FAILED:${error.message}`);
  return (data ?? []) as RegistryRow[];
}

export async function getSfiInstrument(instrumentId: string): Promise<RegistryRow | null> {
  const { db, ownerId } = await authenticatedRegistryContext();
  const { data, error } = await db
    .from('sfi_instruments')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('id', instrumentId)
    .maybeSingle();

  if (error) throw new Error(`SFI_AUDIO_INSTRUMENT_READ_FAILED:${error.message}`);
  return (data as RegistryRow | null) ?? null;
}

export async function listSfiCulturalReferences(limit = 100): Promise<RegistryRow[]> {
  const { db, ownerId } = await authenticatedRegistryContext();
  const safeLimit = Math.max(1, Math.min(250, Math.floor(limit)));
  const { data, error } = await db
    .from('sfi_cultural_references')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) throw new Error(`SFI_AUDIO_REFERENCE_READ_FAILED:${error.message}`);
  return (data ?? []) as RegistryRow[];
}

export async function getSfiCulturalReference(referenceId: string): Promise<RegistryRow | null> {
  const { db, ownerId } = await authenticatedRegistryContext();
  const { data, error } = await db
    .from('sfi_cultural_references')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('id', referenceId)
    .maybeSingle();

  if (error) throw new Error(`SFI_AUDIO_REFERENCE_READ_FAILED:${error.message}`);
  return (data as RegistryRow | null) ?? null;
}

export async function registerSfiCulturalReference(input: SfiCulturalReferenceInput): Promise<RegistryRow> {
  assertCulturalReferenceInput(input);
  const { db, ownerId } = await authenticatedRegistryContext();
  const { data, error } = await db
    .from('sfi_cultural_references')
    .insert({
      owner_id: ownerId,
      work_identifier: input.workIdentifier,
      source: input.source,
      rights_status: input.rightsStatus,
      external_asset_ref: input.externalAssetRef,
      reference_hash: input.referenceHash,
      feature_manifest: input.featureManifest,
      embedding_ref: input.embeddingRef,
      fad: input.fad,
      cvf: input.cvf,
      mihm: input.mihm,
      observed_cultural_vector: input.observedCulturalVector,
      observed_at: input.observedAt,
      version: input.version,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`SFI_AUDIO_REFERENCE_WRITE_FAILED:${error?.message ?? 'no_row_returned'}`);
  }
  return data as RegistryRow;
}

async function resolveMaterializationReference(
  sourceReferenceId: string,
  ownerId: string,
): Promise<SfiCulturalReferenceSnapshot> {
  const db = await createServerSupabaseClient();
  const { data, error } = await db
    .from('sfi_cultural_references')
    .select('id,rights_status')
    .eq('owner_id', ownerId)
    .eq('id', sourceReferenceId)
    .maybeSingle();

  if (error) throw new Error(`SFI_AUDIO_REFERENCE_READ_FAILED:${error.message}`);
  if (!data) throw new Error('SFI_AUDIO_REFERENCE_NOT_AVAILABLE_TO_OWNER');
  return {
    id: String(data.id),
    rightsStatus: String(data.rights_status) as SfiCulturalReferenceSnapshot['rightsStatus'],
  };
}

export async function registerSfiInstrument(input: SfiInstrumentRegistryInput): Promise<RegistryRow> {
  assertInstrumentRegistryInput(input);
  const { db, ownerId } = await authenticatedRegistryContext();

  if (input.sourceReferenceId) {
    const reference = await resolveMaterializationReference(input.sourceReferenceId, ownerId);
    assertReferenceMaterializationAllowed(reference, input);
  }

  const { data, error } = await db
    .from('sfi_instruments')
    .insert({
      owner_id: ownerId,
      name: input.name,
      family: input.family,
      origin: input.origin,
      engine: input.engine,
      package_ref: input.packageRef,
      package_hash: input.packageHash,
      license: input.license,
      rights_status: input.rightsStatus,
      rights_evidence_ref: input.rightsEvidenceRef ?? null,
      source_reference_id: input.sourceReferenceId ?? null,
      range_low: input.rangeLow,
      range_high: input.rangeHigh,
      articulations: input.articulations,
      velocity_layers: input.velocityLayers,
      round_robins: input.roundRobins,
      sample_rate: input.sampleRate,
      quality_state: input.qualityState,
      cultural_profiles: input.culturalProfiles,
      version: input.version,
      verified_at: input.verifiedAt,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`SFI_AUDIO_INSTRUMENT_WRITE_FAILED:${error?.message ?? 'no_row_returned'}`);
  }
  return data as RegistryRow;
}
