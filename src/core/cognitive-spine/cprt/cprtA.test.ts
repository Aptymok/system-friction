import assert from 'node:assert/strict';
import test from 'node:test';

import {
  materializeCognitiveSnapshot,
  projectCognitiveState,
  semanticSnapshotHash,
} from '../projector/cognitiveStateProjector';
import {
  CPRT_A_PROFILE,
  cprtAProjectionInputA,
  cprtAProjectionInputB,
} from './fixture';

const CPRT_A_EXPECTED_HASH = '8c10f1f8b70833b2e4584a53684248e213e955bcff46003255eefdfd49be66fb';
const CPRT_A_EXPECTED_LINEAGE_ROOT = '64586008fa8de2ea17d541d52f48eb2a2d2fff5d0b32bdeb4af1e53f56e83302';

test('CPRT-A: semantically identical inputs produce the same snapshot hash', () => {
  const leftPayload = projectCognitiveState(cprtAProjectionInputA());
  const rightPayload = projectCognitiveState(cprtAProjectionInputB());
  const leftHash = semanticSnapshotHash(leftPayload);
  const rightHash = semanticSnapshotHash(rightPayload);

  assert.deepEqual(leftPayload, rightPayload);
  assert.equal(leftHash, rightHash);
  assert.equal(leftHash, CPRT_A_EXPECTED_HASH);
});

test('CPRT-A: artifact identity does not alter semantic identity', () => {
  const input = cprtAProjectionInputA();
  const left = materializeCognitiveSnapshot(input, {
    snapshotId: 'CT-fixture-left',
    createdAt: '2026-08-16T07:40:00.000Z',
    runtimeMetadata: { runner: 'local' },
  });
  const right = materializeCognitiveSnapshot(input, {
    snapshotId: 'CT-fixture-right',
    createdAt: '2031-04-02T10:11:12.000Z',
    reconstructedAt: '2031-04-02T10:11:12.000Z',
    runtimeMetadata: { runner: 'future-worker', requestId: 'different' },
  });

  assert.notEqual(left.snapshotId, right.snapshotId);
  assert.equal(left.snapshotHash, right.snapshotHash);
  assert.equal(left.snapshotHash, CPRT_A_EXPECTED_HASH);
  assert.deepEqual(left.semanticPayload, right.semanticPayload);
});

test('CPRT-A: frozen semantic payload materializes every contract field', () => {
  const payload = projectCognitiveState(cprtAProjectionInputA());

  assert.deepEqual(payload.eventRefs, ['EV-001']);
  assert.deepEqual(payload.evidenceRefs, ['EVID-001']);
  assert.deepEqual(payload.hypothesisRefs, ['H-001']);
  assert.deepEqual(payload.questionRefs, ['Q-001']);
  assert.deepEqual(payload.epistemicStateRefs, ['EA-001', 'EA-002', 'EA-003']);
  assert.equal(payload.projectionProfile, CPRT_A_PROFILE);
  assert.equal(payload.temporalState.visibleRecordCount, 4);
  assert.equal(payload.verificationDebt.absolute, 1);
  assert.equal(payload.derivedState.sourceCount, 4);
  assert.equal(payload.derivedState.debt.VERIFICATION, 1);
  assert.equal(payload.derivedState.independentLineageRootCount, 3);
  assert.equal(payload.sourceManifest.length, 4);
  assert.equal(payload.sourceHashes.length, 4);
  assert.equal(payload.lineageRoot, CPRT_A_EXPECTED_LINEAGE_ROOT);
});

test('CPRT-A: evidence must arrive with prior epistemic assessment', () => {
  const input = cprtAProjectionInputA();
  input.records.push({
    ref: 'EVID-UNASSESSED',
    kind: 'EVIDENCE',
    recordedAt: '2026-08-16T07:20:00.000Z',
    sourceHash: 'f'.repeat(64),
  });

  assert.throws(
    () => projectCognitiveState(input),
    /COGNITIVE_SPINE_UNASSESSED_EVIDENCE:EVID-UNASSESSED/,
  );
});

test('CPRT-A: semantic policy, projector or operating-mode ref changes semantic identity', () => {
  const baseline = cprtAProjectionInputA();
  const changedPolicy = { ...cprtAProjectionInputA(), policyVersion: 'E2' };
  const changedProjector = { ...cprtAProjectionInputA(), projectorVersion: 'P2' };
  const changedOperatingMode = { ...cprtAProjectionInputA(), operatingModeRef: 'MODE-001' };

  const baselineHash = semanticSnapshotHash(projectCognitiveState(baseline));
  assert.notEqual(baselineHash, semanticSnapshotHash(projectCognitiveState(changedPolicy)));
  assert.notEqual(baselineHash, semanticSnapshotHash(projectCognitiveState(changedProjector)));
  assert.notEqual(baselineHash, semanticSnapshotHash(projectCognitiveState(changedOperatingMode)));
});
