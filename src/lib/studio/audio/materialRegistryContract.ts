export const SFI_AUDIO_RIGHTS_SEPARATION_CONTRACT = 'SFI-AUDIO-RIGHTS-SEPARATION-1.0' as const;

export const SFI_MATERIAL_RIGHTS_STATES = [
  'UNKNOWN',
  'OBSERVATION_ONLY',
  'EXECUTION_ALLOWED',
  'DERIVATIVE_ALLOWED',
  'PUBLICATION_ALLOWED',
  'RESTRICTED',
] as const;

export type SfiMaterialRightsStatus = (typeof SFI_MATERIAL_RIGHTS_STATES)[number];

export const SFI_INSTRUMENT_QUALITY_STATES = ['DRAFT', 'VERIFIED', 'PRODUCTION', 'REJECTED'] as const;
export type SfiInstrumentQualityState = (typeof SFI_INSTRUMENT_QUALITY_STATES)[number];

export type SfiInstrumentRegistryInput = {
  name: string;
  family: string;
  origin: string | null;
  engine: string;
  packageRef: string | null;
  packageHash: string | null;
  license: string | null;
  rightsStatus: SfiMaterialRightsStatus;
  rightsEvidenceRef?: string | null;
  sourceReferenceId?: string | null;
  rangeLow: number | null;
  rangeHigh: number | null;
  articulations: string[];
  velocityLayers: number | null;
  roundRobins: number | null;
  sampleRate: number | null;
  qualityState: SfiInstrumentQualityState;
  culturalProfiles: string[];
  version: number;
  verifiedAt: string | null;
};

export type SfiCulturalReferenceInput = {
  workIdentifier: string;
  source: string;
  rightsStatus: SfiMaterialRightsStatus;
  externalAssetRef: string | null;
  referenceHash: string | null;
  featureManifest: Record<string, unknown>;
  embeddingRef: string | null;
  fad: Record<string, unknown> | null;
  cvf: Record<string, unknown> | null;
  mihm: Record<string, unknown> | null;
  observedCulturalVector: Record<string, unknown> | null;
  observedAt: string | null;
  version: number;
};

export type SfiCulturalReferenceSnapshot = Pick<SfiCulturalReferenceInput, 'rightsStatus'> & {
  id: string;
};

const RAW_AUDIO_KEYS = new Set([
  'rawaudio',
  'audiobytes',
  'bytes',
  'blob',
  'base64',
  'datauri',
  'filebytes',
  'payloadbytes',
]);

function normalizedKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function requireText(value: string | null | undefined, code: string) {
  if (!value || value.trim().length === 0) throw new Error(code);
}

function requirePositiveVersion(version: number) {
  if (!Number.isInteger(version) || version < 1) throw new Error('SFI_AUDIO_VERSION_INVALID');
}

export function rightsAllowExecutableMaterialization(rightsStatus: SfiMaterialRightsStatus) {
  return rightsStatus === 'EXECUTION_ALLOWED' || rightsStatus === 'DERIVATIVE_ALLOWED';
}

export function assertNoRawAudioPersistence(value: unknown) {
  const seen = new WeakSet<object>();

  const visit = (current: unknown, path: string) => {
    if (current === null || current === undefined) return;
    if (current instanceof ArrayBuffer || ArrayBuffer.isView(current)) {
      throw new Error(`SFI_AUDIO_RAW_MEDIA_PERSISTENCE_FORBIDDEN:${path}`);
    }
    if (typeof current !== 'object') return;
    if (seen.has(current as object)) return;
    seen.add(current as object);

    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }

    for (const [key, child] of Object.entries(current as Record<string, unknown>)) {
      if (RAW_AUDIO_KEYS.has(normalizedKey(key))) {
        throw new Error(`SFI_AUDIO_RAW_MEDIA_PERSISTENCE_FORBIDDEN:${path}.${key}`);
      }
      visit(child, `${path}.${key}`);
    }
  };

  visit(value, 'root');
}

export function assertInstrumentRegistryInput(input: SfiInstrumentRegistryInput) {
  assertNoRawAudioPersistence(input);
  requireText(input.name, 'SFI_AUDIO_INSTRUMENT_NAME_REQUIRED');
  requireText(input.family, 'SFI_AUDIO_INSTRUMENT_FAMILY_REQUIRED');
  requireText(input.engine, 'SFI_AUDIO_INSTRUMENT_ENGINE_REQUIRED');
  requireText(input.rightsStatus, 'SFI_AUDIO_RIGHTS_STATE_REQUIRED');
  requirePositiveVersion(input.version);

  if (input.rangeLow !== null && !Number.isInteger(input.rangeLow)) {
    throw new Error('SFI_AUDIO_RANGE_LOW_INVALID');
  }
  if (input.rangeHigh !== null && !Number.isInteger(input.rangeHigh)) {
    throw new Error('SFI_AUDIO_RANGE_HIGH_INVALID');
  }
  if (input.rangeLow !== null && input.rangeHigh !== null && input.rangeLow > input.rangeHigh) {
    throw new Error('SFI_AUDIO_RANGE_ORDER_INVALID');
  }
  if (input.sampleRate !== null && (!Number.isInteger(input.sampleRate) || input.sampleRate <= 0)) {
    throw new Error('SFI_AUDIO_SAMPLE_RATE_INVALID');
  }

  if (input.qualityState === 'PRODUCTION') {
    if (!rightsAllowExecutableMaterialization(input.rightsStatus)) {
      throw new Error('SFI_AUDIO_PRODUCTION_RIGHTS_REQUIRED');
    }
    requireText(input.packageRef, 'SFI_AUDIO_PRODUCTION_PACKAGE_REF_REQUIRED');
    requireText(input.packageHash, 'SFI_AUDIO_PRODUCTION_PACKAGE_HASH_REQUIRED');
    requireText(input.verifiedAt, 'SFI_AUDIO_PRODUCTION_VERIFICATION_REQUIRED');
  }
}

export function assertCulturalReferenceInput(input: SfiCulturalReferenceInput) {
  assertNoRawAudioPersistence(input);
  requireText(input.workIdentifier, 'SFI_AUDIO_REFERENCE_WORK_ID_REQUIRED');
  requireText(input.source, 'SFI_AUDIO_REFERENCE_SOURCE_REQUIRED');
  requireText(input.rightsStatus, 'SFI_AUDIO_RIGHTS_STATE_REQUIRED');
  requirePositiveVersion(input.version);
  if (!input.externalAssetRef && !input.referenceHash) {
    throw new Error('SFI_AUDIO_REFERENCE_IDENTITY_REQUIRED');
  }
}

export function assertReferenceMaterializationAllowed(
  reference: SfiCulturalReferenceSnapshot,
  instrument: Pick<SfiInstrumentRegistryInput, 'sourceReferenceId' | 'rightsStatus'>,
) {
  if (!instrument.sourceReferenceId || instrument.sourceReferenceId !== reference.id) {
    throw new Error('SFI_AUDIO_REFERENCE_LINEAGE_REQUIRED');
  }
  if (!rightsAllowExecutableMaterialization(reference.rightsStatus)) {
    throw new Error('SFI_AUDIO_REFERENCE_EXECUTION_RIGHTS_REQUIRED');
  }
  if (!rightsAllowExecutableMaterialization(instrument.rightsStatus)) {
    throw new Error('SFI_AUDIO_INSTRUMENT_EXECUTION_RIGHTS_REQUIRED');
  }
}
