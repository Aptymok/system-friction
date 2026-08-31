import { strict as assert } from 'node:assert';
import { resolveUniversalResumeIdentity } from '../src/lib/sfi/universalResumeIdentity';

const cycleId = 'ce563b2a-3715-49ce-8806-1cc051f6ad71';
const materialHash = '67e4a8a728796a6b417bb88bf43dd6cfc081037e4eda33f5b0b672e0ad93aac8';
const hydrationEventId = 'b38af0c4-f14d-48a7-9817-781689186cbf';
const current = {
  objectKey: 'dataset:2025_2026.xlsx',
  objectHash: materialHash,
  objectHashBasis: 'CLIENT_CONTENT_FINGERPRINT',
  assetRef: null,
  name: '2025_2026.xlsx',
};
const structuredResult = {
  event_id: hydrationEventId,
  payload: {
    cycleId,
    objectKey: 'dataset:2025_2026.xlsx',
    objectHash: materialHash,
    object: {
      objectKey: 'dataset:2025_2026.xlsx',
      objectHash: materialHash,
      logicalFilename: '2025_2026.xlsx',
      observedTransportFilename: '2025_2026(2).xlsx',
      materialIdentityVerified: true,
    },
    result: {
      profile: {
        source: {
          logicalFilename: '2025_2026.xlsx',
          observedTransportFilename: '2025_2026(2).xlsx',
          contentHash: materialHash,
        },
      },
    },
  },
};

const upgraded = resolveUniversalResumeIdentity({
  openedPayload: {
    objectKey: 'document:2025_2026(2).xlsx',
    objectHash: 'reference-hash',
    referenceHash: 'reference-hash',
    objectHashBasis: 'REFERENCE_IDENTITY',
  },
  structuredResults: [structuredResult],
  hydrationEventId,
  hydrationBasis: 'SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED',
  resumeCycleId: cycleId,
  normalizedSignal: current,
});
assert.equal(upgraded.matches, true);
assert.equal(upgraded.basis, 'CANONICAL_REFERENCE_TO_MATERIAL_UPGRADE');

const exact = resolveUniversalResumeIdentity({
  openedPayload: { objectKey: current.objectKey, objectHash: 'reference-hash', referenceHash: 'reference-hash', objectHashBasis: 'REFERENCE_IDENTITY' },
  structuredResults: [],
  hydrationEventId: null,
  hydrationBasis: null,
  resumeCycleId: cycleId,
  normalizedSignal: current,
});
assert.equal(exact.matches, true);
assert.equal(exact.basis, 'EXACT_OBJECT_KEY');

const materialMatch = resolveUniversalResumeIdentity({
  openedPayload: { objectKey: 'document:renamed.xlsx', objectHash: materialHash, objectHashBasis: 'CLIENT_CONTENT_FINGERPRINT' },
  structuredResults: [],
  hydrationEventId: null,
  hydrationBasis: null,
  resumeCycleId: cycleId,
  normalizedSignal: current,
});
assert.equal(materialMatch.matches, true);
assert.equal(materialMatch.basis, 'MATERIAL_HASH_MATCH');

const materialConflict = resolveUniversalResumeIdentity({
  openedPayload: { objectKey: current.objectKey, objectHash: 'f'.repeat(64), objectHashBasis: 'CLIENT_CONTENT_FINGERPRINT' },
  structuredResults: [structuredResult],
  hydrationEventId,
  hydrationBasis: 'SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED',
  resumeCycleId: cycleId,
  normalizedSignal: current,
});
assert.equal(materialConflict.matches, false);
assert.equal(materialConflict.basis, 'MATERIAL_HASH_CONFLICT');

const wrongCycle = resolveUniversalResumeIdentity({
  openedPayload: { objectKey: 'document:2025_2026(2).xlsx', objectHash: 'reference-hash', referenceHash: 'reference-hash', objectHashBasis: 'REFERENCE_IDENTITY' },
  structuredResults: [{ ...structuredResult, payload: { ...structuredResult.payload, cycleId: 'other-cycle' } }],
  hydrationEventId,
  hydrationBasis: 'SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED',
  resumeCycleId: cycleId,
  normalizedSignal: current,
});
assert.equal(wrongCycle.matches, false);
assert.equal(wrongCycle.basis, 'NO_CANONICAL_IDENTITY_BRIDGE');

const wrongReference = resolveUniversalResumeIdentity({
  openedPayload: { objectKey: 'document:other.xlsx', objectHash: 'reference-hash', referenceHash: 'reference-hash', objectHashBasis: 'REFERENCE_IDENTITY' },
  structuredResults: [structuredResult],
  hydrationEventId,
  hydrationBasis: 'SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED',
  resumeCycleId: cycleId,
  normalizedSignal: current,
});
assert.equal(wrongReference.matches, false);
assert.equal(wrongReference.basis, 'NO_CANONICAL_IDENTITY_BRIDGE');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-RESUME-IDENTITY-QA-1.0',
  canonicalReferenceToMaterialUpgrade: true,
  transportVsLogicalFilenameBridge: true,
  materialHashConflictFailsClosed: true,
  cycleIdAloneIsInsufficient: true,
}, null, 2));
