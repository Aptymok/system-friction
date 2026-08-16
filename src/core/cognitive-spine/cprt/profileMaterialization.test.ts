import assert from 'node:assert/strict';
import test from 'node:test';

import type { CognitiveSpineSourceRecord } from '../contracts/snapshot';
import { materializeCognitiveSpineProfileSnapshot } from '../profiles/materializeProfile';

function fixtureRecords(): CognitiveSpineSourceRecord[] {
  return [
    {
      ref: 'root_evidence_entries:E-001',
      kind: 'EVIDENCE',
      recordedAt: '2026-08-16T08:00:00.000Z',
      sourceHash: 'a'.repeat(64),
      epistemicAssessmentRef: 'EA-001',
      epistemicClass: 'OBSERVED',
      ancestryRoots: ['OBS-001'],
      visibilityProfiles: ['*'],
    },
    {
      ref: 'sfi_amv_memory:M-001',
      kind: 'MEMORY',
      recordedAt: '2026-08-16T08:01:00.000Z',
      sourceHash: 'b'.repeat(64),
      visibilityProfiles: ['*'],
      debtType: 'VERIFICATION',
    },
    {
      ref: 'sfi_hypotheses:H-001',
      kind: 'HYPOTHESIS',
      recordedAt: '2026-08-16T08:02:00.000Z',
      sourceHash: 'c'.repeat(64),
      visibilityProfiles: ['*'],
      debtType: 'VERIFICATION',
    },
    {
      ref: 'person_ct:CT-A01:REP-001',
      kind: 'PERSON_CT',
      recordedAt: '2026-08-16T08:03:00.000Z',
      sourceHash: 'd'.repeat(64),
      visibilityProfiles: ['*'],
    },
  ];
}

test('Runtime profile seals institutional refs and excludes direct PERSON_CT inheritance', () => {
  const result = materializeCognitiveSpineProfileSnapshot({
    records: fixtureRecords(),
    sourceCutoff: '2026-08-16T08:10:00.000Z',
    executionId: 'RUN-001',
    createdAt: '2026-08-16T08:10:01.000Z',
    profileId: 'RUNTIME_GENERAL_CONTEXT_V1',
    consume: true,
  });

  assert.equal(result.trace.ctSnapshotConsumed, true);
  assert.equal(result.trace.projectionProfile, 'RUNTIME_GENERAL_CONTEXT_V1');
  assert.deepEqual(result.snapshot.semanticPayload.evidenceRefs, ['root_evidence_entries:E-001']);
  assert.deepEqual(result.snapshot.semanticPayload.memoryRefs, ['sfi_amv_memory:M-001']);
  assert.deepEqual(result.snapshot.semanticPayload.hypothesisRefs, ['sfi_hypotheses:H-001']);
  assert.deepEqual(result.snapshot.semanticPayload.personCtRefs, []);
  assert.equal(result.snapshot.semanticPayload.verificationDebt.absolute, 2);
});

test('blinded Field profile can record CT availability but exposes and consumes no refs', () => {
  const result = materializeCognitiveSpineProfileSnapshot({
    records: fixtureRecords(),
    sourceCutoff: '2026-08-16T08:10:00.000Z',
    executionId: 'FIELD-BLIND-001',
    createdAt: '2026-08-16T08:10:01.000Z',
    profileId: 'FIELD_BLINDED_OBSERVATION_V1',
    consume: false,
  });

  assert.equal(result.profile.blindedByDefault, true);
  assert.equal(result.trace.ctSnapshotConsumed, false);
  assert.equal(result.trace.blindedObservation, true);
  assert.ok(result.trace.ctSnapshotAvailable);
  assert.equal(result.visibleRecordCount, 0);
  assert.equal(result.snapshot.semanticPayload.sourceManifest.length, 0);
  assert.equal(result.snapshot.semanticPayload.derivedState.sourceCount, 0);
});

test('blinded profiles reject attempted CT consumption', () => {
  assert.throws(() => materializeCognitiveSpineProfileSnapshot({
    records: fixtureRecords(),
    sourceCutoff: '2026-08-16T08:10:00.000Z',
    executionId: 'LAB-BLIND-001',
    createdAt: '2026-08-16T08:10:01.000Z',
    profileId: 'LAB_BLINDED_V1',
    consume: true,
  }), /COGNITIVE_SPINE_BLINDED_PROFILE_CANNOT_CONSUME/);
});

test('same source set in different insertion order yields the same profile snapshot semantic hash', () => {
  const records = fixtureRecords();
  const common = {
    sourceCutoff: '2026-08-16T08:10:00.000Z',
    createdAt: '2026-08-16T08:10:01.000Z',
    profileId: 'ROOT_GOVERNANCE_CONTEXT_V1' as const,
    consume: true,
  };
  const left = materializeCognitiveSpineProfileSnapshot({ ...common, records, executionId: 'ROOT-001' });
  const right = materializeCognitiveSpineProfileSnapshot({ ...common, records: [...records].reverse(), executionId: 'ROOT-002' });

  assert.equal(left.snapshot.snapshotHash, right.snapshot.snapshotHash);
  assert.deepEqual(left.snapshot.semanticPayload, right.snapshot.semanticPayload);
});

test('profile identity is semantic even when visible source refs coincide', () => {
  const records = fixtureRecords();
  const runtime = materializeCognitiveSpineProfileSnapshot({
    records,
    sourceCutoff: '2026-08-16T08:10:00.000Z',
    executionId: 'RUN-001',
    createdAt: '2026-08-16T08:10:01.000Z',
    profileId: 'RUNTIME_GENERAL_CONTEXT_V1',
    consume: true,
  });
  const root = materializeCognitiveSpineProfileSnapshot({
    records,
    sourceCutoff: '2026-08-16T08:10:00.000Z',
    executionId: 'ROOT-001',
    createdAt: '2026-08-16T08:10:01.000Z',
    profileId: 'ROOT_GOVERNANCE_CONTEXT_V1',
    consume: true,
  });

  assert.notEqual(runtime.snapshot.snapshotHash, root.snapshot.snapshotHash);
  assert.equal(runtime.snapshot.semanticPayload.projectionProfile, 'RUNTIME_GENERAL_CONTEXT_V1');
  assert.equal(root.snapshot.semanticPayload.projectionProfile, 'ROOT_GOVERNANCE_CONTEXT_V1');
});
