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

export const SFI_MATERIAL_EXECUTION_ELIGIBILITY_STATES = [
  'ELIGIBLE',
  'BLOCKED_SOURCE_RIGHTS',
  'BLOCKED_TARGET_RIGHTS',
  'BLOCKED_NOT_PRODUCTION',
  'BLOCKED_PACKAGE_VERIFICATION',
] as const;
export type SfiMaterialExecutionEligibilityState = (typeof SFI_MATERIAL_EXECUTION_ELIGIBILITY_STATES)[number];

// Material-rights eligibility is a technical rights check only. It never grants institutional execution authority.
export const SFI_MATERIAL_RIGHTS_ELIGIBILITY_IS_NOT_AUTHORITY = true as const;

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
  rightsEvidenceRef?: string | null;
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

export type SfiCulturalReferenceRightsRevisionInput = {
  referenceId: string;
  rightsStatus: SfiMaterialRightsStatus;
  rightsEvidenceRef: string;
};

export type SfiCulturalReferenceSnapshot = Pick<SfiCulturalReferenceInput, 'rightsStatus'> & {
  id: string;
  version: number;
};

export type SfiMaterialExecutionEligibilityInput = {
  sourceReferenceId: string | null;
  sourceRightsStatus: SfiMaterialRightsStatus | null;
  instrumentRightsStatus: SfiMaterialRightsStatus;
  qualityState: SfiInstrumentQualityState;
  packageRef: string | null;
  packageHash: string | null;
  verifiedAt: string | null;
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

export function deriveCurrentMaterialExecutionEligibility(
  input: SfiMaterialExecutionEligibilityInput,
): SfiMaterialExecutionEligibilityState {
  if (input.sourceReferenceId && (!input.sourceRightsStatus || !rightsAllowExecutableMaterialization(input.sourceRightsStatus))) {
    return 'BLOCKED_SOURCE_RIGHTS';
  }
  if (!rightsAllowExecutableMaterialization(input.instrumentRightsStatus)) {
    return 'BLOCKED_TARGET_RIGHTS';
  }
  if (input.qualityState !== 'PRODUCTION') {
    return 'BLOCKED_NOT_PRODUCTION';
  }
  if (!input.packageRef || !input.packageHash || !input.verifiedAt) {
    return 'BLOCKED_PACKAGE_VERIFICATION';
  }
  return 'ELIGIBLE';
}

export function assertCurrentMaterialExecutionEligible(input: SfiMaterialExecutionEligibilityInput) {
  const state = deriveCurrentMaterialExecutionEligibility(input);
  if (state !== 'ELIGIBLE') throw new Error(`SFI_AUDIO_CURRENT_EXECUTION_RIGHTS_BLOCKED:${state}`);
  return state;
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

export function assertCulturalReferenceRightsRevisionInput(input: SfiCulturalReferenceRightsRevisionInput) {
  requireText(input.referenceId, 'SFI_AUDIO_REFERENCE_ID_REQUIRED');
  requireText(input.rightsStatus, 'SFI_AUDIO_RIGHTS_STATE_REQUIRED');
  requireText(input.rightsEvidenceRef, 'SFI_AUDIO_RIGHTS_REVISION_EVIDENCE_REQUIRED');
  return input;
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
