import assert from 'node:assert/strict';
import test from 'node:test';

import type { CognitiveSpineSourceRecord } from '../contracts/snapshot';
import { materializeCognitiveSpineProfileSnapshot } from '../profiles/materializeProfile';

const records: CognitiveSpineSourceRecord[] = [
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
  },
  {
    ref: 'sfi_cognitive_twin_decisions:D-001',
    kind: 'DECISION',
    recordedAt: '2026-08-16T08:02:00.000Z',
    sourceHash: 'c'.repeat(64),
    visibilityProfiles: ['*'],
  },
];

test('exact allowlist selects only requested refs under the profile', () => {
  const result = materializeCognitiveSpineProfileSnapshot({
    records,
    sourceCutoff: '2026-08-16T08:10:00.000Z',
    executionId: 'LAB-ALLOW-001',
    createdAt: '2026-08-16T08:10:01.000Z',
    profileId: 'LAB_EXPERIMENT_CONTEXT_V1',
    consume: true,
    allowedRefs: ['sfi_amv_memory:M-001', 'root_evidence_entries:E-001'],
    requireAllAllowedRefs: true,
  });

  assert.deepEqual(result.requestedAllowedRefs, [
    'root_evidence_entries:E-001',
    'sfi_amv_memory:M-001',
  ]);
  assert.deepEqual(result.missingAllowedRefs, []);
  assert.equal(result.visibleRecordCount, 2);
  assert.deepEqual(result.snapshot.semanticPayload.evidenceRefs, ['root_evidence_entries:E-001']);
  assert.deepEqual(result.snapshot.semanticPayload.memoryRefs, ['sfi_amv_memory:M-001']);
  assert.deepEqual(result.snapshot.semanticPayload.decisionRefs, []);
});

test('same explicit allowlist is insertion-order independent', () => {
  const common = {
    sourceCutoff: '2026-08-16T08:10:00.000Z',
    createdAt: '2026-08-16T08:10:01.000Z',
    profileId: 'LAB_EXPERIMENT_CONTEXT_V1' as const,
    consume: true,
    requireAllAllowedRefs: true,
  };
  const left = materializeCognitiveSpineProfileSnapshot({
    ...common,
    records,
    executionId: 'LAB-ALLOW-LEFT',
    allowedRefs: ['sfi_amv_memory:M-001', 'root_evidence_entries:E-001'],
  });
  const right = materializeCognitiveSpineProfileSnapshot({
    ...common,
    records: [...records].reverse(),
    executionId: 'LAB-ALLOW-RIGHT',
    allowedRefs: ['root_evidence_entries:E-001', 'sfi_amv_memory:M-001'],
  });

  assert.equal(left.snapshot.snapshotHash, right.snapshot.snapshotHash);
  assert.deepEqual(left.snapshot.semanticPayload, right.snapshot.semanticPayload);
});

test('required allowlist fails closed when a ref is missing or profile-denied', () => {
  assert.throws(() => materializeCognitiveSpineProfileSnapshot({
    records,
    sourceCutoff: '2026-08-16T08:10:00.000Z',
    executionId: 'LAB-ALLOW-MISSING',
    createdAt: '2026-08-16T08:10:01.000Z',
    profileId: 'LAB_EXPERIMENT_CONTEXT_V1',
    consume: true,
    allowedRefs: ['sfi_amv_memory:M-404'],
    requireAllAllowedRefs: true,
  }), /COGNITIVE_SPINE_ALLOWED_REF_UNAVAILABLE:sfi_amv_memory:M-404/);
});

test('PERSON_CT cannot enter institutional Lab context through an allowlist', () => {
  const withPerson: CognitiveSpineSourceRecord[] = [
    ...records,
    {
      ref: 'person_ct:CT-A01:REP-001',
      kind: 'PERSON_CT',
      recordedAt: '2026-08-16T08:03:00.000Z',
      sourceHash: 'd'.repeat(64),
      visibilityProfiles: ['*'],
    },
  ];

  assert.throws(() => materializeCognitiveSpineProfileSnapshot({
    records: withPerson,
    sourceCutoff: '2026-08-16T08:10:00.000Z',
    executionId: 'LAB-ALLOW-PERSON',
    createdAt: '2026-08-16T08:10:01.000Z',
    profileId: 'LAB_EXPERIMENT_CONTEXT_V1',
    consume: true,
    allowedRefs: ['person_ct:CT-A01:REP-001'],
    requireAllAllowedRefs: true,
  }), /COGNITIVE_SPINE_ALLOWED_REF_UNAVAILABLE:person_ct:CT-A01:REP-001/);
});
