import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SFI_ACOUSTIC_INSTRUMENT_PACKAGE_CONTRACT,
  SFI_AUDIO_EPHEMERAL_ASSET_CONTRACT,
  SFI_AUDIO_PERFORMANCE_CONTRACT,
  SFI_AUDIO_RENDER_RECEIPT_CONTRACT,
  assertRenderRightsBoundary,
  canonicalJson,
  type SfiAcousticInstrumentManifest,
} from './acousticPackageContract';
import { parseSfz } from './sfzAdapter';

test('material execution contracts remain exact and separate', () => {
  assert.equal(SFI_ACOUSTIC_INSTRUMENT_PACKAGE_CONTRACT, 'SFI-ACOUSTIC-INSTRUMENT-PACKAGE-1.0');
  assert.equal(SFI_AUDIO_PERFORMANCE_CONTRACT, 'SFI-AUDIO-PERFORMANCE-1.0');
  assert.equal(SFI_AUDIO_RENDER_RECEIPT_CONTRACT, 'SFI-AUDIO-RENDER-RECEIPT-1.0');
  assert.equal(SFI_AUDIO_EPHEMERAL_ASSET_CONTRACT, 'SFI-AUDIO-EPHEMERAL-ASSET-1.0');
});

test('canonical JSON is stable by key order', () => {
  assert.equal(canonicalJson({ b: 2, a: 1 }), '{"a":1,"b":2}');
});

test('SFZ parser renders only the explicitly supported subset and rejects fake support', () => {
  const regions = parseSfz('<global> volume=-3\n<region> sample=samples/a.wav lokey=60 hikey=61 pitch_keycenter=60');
  assert.equal(regions.length, 1);
  assert.equal(regions[0].sample, 'samples/a.wav');
  assert.equal(regions[0].volumeDb, -3);
  assert.throws(
    () => parseSfz('<region> sample=samples/a.wav lokey=60 ampeg_release=0.2'),
    /SFI_AUDIO_SFZ_OPCODE_UNSUPPORTED:ampeg_release/,
  );
});

test('rights eligibility cannot substitute for institutional authorization', () => {
  const manifest: SfiAcousticInstrumentManifest = {
    contract: 'SFI-ACOUSTIC-INSTRUMENT-PACKAGE-1.0',
    packageId: 'fixture',
    packageVersion: '1.0.0',
    packageHash: `sha256:${'1'.repeat(64)}` as `sha256:${string}`,
    packageHashAlgorithm: 'sha256:path-sha256-v1',
    instrument: { instrumentRef: 'instrument', name: 'Fixture', family: 'QA', engine: 'SFZ', rangeLow: 0, rangeHigh: 127 },
    mapping: { format: 'SFZ', path: 'instrument.sfz', sha256: `sha256:${'2'.repeat(64)}` as `sha256:${string}`, adapterMinimumVersion: '1.0.0' },
    samples: [{ path: 'samples/a.wav', sha256: `sha256:${'3'.repeat(64)}` as `sha256:${string}`, format: { container: 'WAV', sampleRate: 48000, bitDepth: 24, channels: 1 }, rightsAssertionRef: 'fixture:rights' }],
    roomIr: null,
    rights: { status: 'EXECUTION_ALLOWED', assertionId: 'fixture:rights', evidenceRefs: ['fixture:evidence'], publicAccessUsedAsRightsEvidence: false },
    lineage: { sourceReferenceId: null, parentPackageRef: null, materializationRefs: [] },
  };

  assert.throws(() => assertRenderRightsBoundary(manifest, {
    instrumentRightsStatus: 'EXECUTION_ALLOWED',
    materialRightsEligibility: 'ELIGIBLE',
    materialRightsEvidenceRefs: ['fixture:rights'],
    institutionalAuthorization: { authorizationRef: '', authorityClass: 'EXECUTE_REVERSIBLE', authorized: true },
    culturalReferenceUsedAsExecutableMaterial: false,
    publicAccessUsedAsExecutionRightsEvidence: false,
  }), /SFI_AUDIO_INSTITUTIONAL_EXECUTION_AUTHORIZATION_REQUIRED/);
});
