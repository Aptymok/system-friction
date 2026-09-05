import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SFI_AUDIO_RIGHTS_SEPARATION_CONTRACT,
  assertCulturalReferenceInput,
  assertInstrumentRegistryInput,
  assertNoRawAudioPersistence,
  assertReferenceMaterializationAllowed,
  rightsAllowExecutableMaterialization,
  type SfiCulturalReferenceInput,
  type SfiInstrumentRegistryInput,
  type SfiMaterialRightsStatus,
} from './materialRegistryContract';

const draftInstrument: SfiInstrumentRegistryInput = {
  name: 'QA Neutral Instrument',
  family: 'keys',
  origin: null,
  engine: 'sfz',
  packageRef: 'sfi://packages/qa-neutral-instrument/1',
  packageHash: '9e7c1d9b8b64a1098b21b2147969be433ea34d9882622a14d6d3fbb69f9c553d',
  license: 'QA-ONLY',
  rightsStatus: 'EXECUTION_ALLOWED',
  rightsEvidenceRef: 'qa:rights:instrument-1',
  sourceReferenceId: null,
  rangeLow: 36,
  rangeHigh: 84,
  articulations: ['sustain'],
  velocityLayers: 1,
  roundRobins: 1,
  sampleRate: 48000,
  qualityState: 'DRAFT',
  culturalProfiles: [],
  version: 1,
  verifiedAt: null,
};

const reference: SfiCulturalReferenceInput = {
  workIdentifier: 'qa:reference:1',
  source: 'authorized-test-fixture',
  rightsStatus: 'OBSERVATION_ONLY',
  externalAssetRef: 'sfi://references/qa/reference-1',
  referenceHash: 'b6c83ef9e6e4d7aacb5604a4da253eac2ce4f64f7cb27d51f0c6bd9d8d73af17',
  featureManifest: { spectralCentroidHz: 1800 },
  embeddingRef: null,
  fad: { state: 'AVAILABLE' },
  cvf: null,
  mihm: { state: 'AVAILABLE' },
  observedCulturalVector: { cultural: 0.42 },
  observedAt: '2026-09-05T14:30:00.000Z',
  version: 1,
};

test('contract identifier remains exact', () => {
  assert.equal(SFI_AUDIO_RIGHTS_SEPARATION_CONTRACT, 'SFI-AUDIO-RIGHTS-SEPARATION-1.0');
});

test('execution materialization rights fail closed', () => {
  const denied: SfiMaterialRightsStatus[] = ['UNKNOWN', 'OBSERVATION_ONLY', 'PUBLICATION_ALLOWED', 'RESTRICTED'];
  for (const state of denied) assert.equal(rightsAllowExecutableMaterialization(state), false, state);
  assert.equal(rightsAllowExecutableMaterialization('EXECUTION_ALLOWED'), true);
  assert.equal(rightsAllowExecutableMaterialization('DERIVATIVE_ALLOWED'), true);
});

test('missing rights state fails closed', () => {
  assert.throws(
    () => assertInstrumentRegistryInput({ ...draftInstrument, rightsStatus: '' as SfiMaterialRightsStatus }),
    /SFI_AUDIO_RIGHTS_STATE_REQUIRED/,
  );
  assert.throws(
    () => assertCulturalReferenceInput({ ...reference, rightsStatus: '' as SfiMaterialRightsStatus }),
    /SFI_AUDIO_RIGHTS_STATE_REQUIRED/,
  );
});

test('observation-only commercial reference cannot materialize an instrument', () => {
  assert.throws(
    () => assertReferenceMaterializationAllowed(
      { id: 'reference-1', rightsStatus: 'OBSERVATION_ONLY' },
      { sourceReferenceId: 'reference-1', rightsStatus: 'EXECUTION_ALLOWED' },
    ),
    /SFI_AUDIO_REFERENCE_EXECUTION_RIGHTS_REQUIRED/,
  );
});

test('materialization requires explicit reference lineage and independent instrument rights', () => {
  assert.throws(
    () => assertReferenceMaterializationAllowed(
      { id: 'reference-1', rightsStatus: 'DERIVATIVE_ALLOWED' },
      { sourceReferenceId: null, rightsStatus: 'DERIVATIVE_ALLOWED' },
    ),
    /SFI_AUDIO_REFERENCE_LINEAGE_REQUIRED/,
  );
  assert.throws(
    () => assertReferenceMaterializationAllowed(
      { id: 'reference-1', rightsStatus: 'DERIVATIVE_ALLOWED' },
      { sourceReferenceId: 'reference-1', rightsStatus: 'OBSERVATION_ONLY' },
    ),
    /SFI_AUDIO_INSTRUMENT_EXECUTION_RIGHTS_REQUIRED/,
  );
  assert.doesNotThrow(() => assertReferenceMaterializationAllowed(
    { id: 'reference-1', rightsStatus: 'DERIVATIVE_ALLOWED' },
    { sourceReferenceId: 'reference-1', rightsStatus: 'EXECUTION_ALLOWED' },
  ));
});

test('raw audio payloads are rejected while refs and hashes remain persistable', () => {
  assert.throws(
    () => assertNoRawAudioPersistence({ featureManifest: { bytes: new Uint8Array([1, 2, 3]) } }),
    /SFI_AUDIO_RAW_MEDIA_PERSISTENCE_FORBIDDEN/,
  );
  assert.doesNotThrow(() => assertInstrumentRegistryInput(draftInstrument));
  assert.doesNotThrow(() => assertCulturalReferenceInput(reference));
});

test('production instrument requires executable rights, package identity and verification', () => {
  assert.throws(
    () => assertInstrumentRegistryInput({ ...draftInstrument, qualityState: 'PRODUCTION', rightsStatus: 'OBSERVATION_ONLY' }),
    /SFI_AUDIO_PRODUCTION_RIGHTS_REQUIRED/,
  );
  assert.throws(
    () => assertInstrumentRegistryInput({ ...draftInstrument, qualityState: 'PRODUCTION', packageHash: null }),
    /SFI_AUDIO_PRODUCTION_PACKAGE_HASH_REQUIRED/,
  );
  assert.doesNotThrow(() => assertInstrumentRegistryInput({
    ...draftInstrument,
    qualityState: 'PRODUCTION',
    verifiedAt: '2026-09-05T14:30:00.000Z',
  }));
});
