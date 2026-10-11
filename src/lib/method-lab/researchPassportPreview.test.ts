import test from 'node:test';
import assert from 'node:assert/strict';
import { previewMethodLabRealityPassport } from './researchPassportPreview';

test('MIHM research object remains a read-only abstaining hypothesis passport', () => {
  const result = previewMethodLabRealityPassport({
    objectId: 'SFI-MIHM-FOUNDATION-001',
    title: 'MIHM scientific foundation',
    epistemicState: 'MIXED',
    returnState: 'PENDING',
    evidenceRefs: ['github:pr:740'],
    lineage: ['github:run:38182873096'],
    version: '0.1.1',
    updatedAt: '2026-10-11T23:12:20.735Z',
    limitations: ['No empirical validation'],
    findings: [{ id: 'MIHM-G1-01', state: 'DERIVED', evidenceRefs: [] }],
  });
  assert.equal(result.graphPersisted, false);
  assert.equal(result.canonicalAuthority, false);
  assert.equal(result.passport.decision, 'ABSTAIN');
  assert.equal(result.passport.epistemicState, 'UNKNOWN');
  assert.equal(result.passport.verification.state, 'NOT VERIFIED');
  assert.equal(result.passport.returnState.status, 'PENDING');
  assert.equal(result.passport.returnState.observed, null);
  assert.equal(result.passport.authority.mayMintReturn, false);
  assert.equal(result.passport.authority.mayPromoteCanon, false);
  assert.equal(result.passport.persistence.represented, false);
  assert.equal(result.completeness.linkToCanonicalGraphVerified, false);
  assert.equal(result.completeness.provenanceRefs, 2);
});

test('read-only preview never upgrades an observed Lab finding to observed global RETURN', () => {
  const result = previewMethodLabRealityPassport({
    objectId: 'diagnostic',
    title: 'Diagnostics',
    epistemicState: 'DERIVED',
    returnState: 'OBSERVED',
    evidenceRefs: [],
    lineage: [],
    version: '0.1',
    updatedAt: null,
    limitations: [],
    findings: [{ id: 'F1', state: 'OBSERVED', evidenceRefs: [] }],
  });
  assert.equal(result.passport.returnState.observed, null);
  assert.equal(result.passport.authority.authorityExpanded, false);
  assert.equal(result.graphPersisted, false);
});
