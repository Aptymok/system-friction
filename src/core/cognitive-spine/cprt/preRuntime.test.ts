import assert from 'node:assert/strict';
import test from 'node:test';

import { PERSON_INSTITUTION_GATE_SCHEMA_VERSION } from '../contracts/personInstitutionGate';
import { evaluatePersonInstitutionGate } from '../gates/personInstitutionGate';
import { materializeCognitiveSnapshot } from '../projector/cognitiveStateProjector';
import { buildCognitiveContextConsumptionTrace } from '../trace/consumptionTrace';
import { buildCognitiveSpineTransition } from '../transitions/buildTransition';
import { cprtAProjectionInputA } from './fixture';

function baseSnapshot() {
  return materializeCognitiveSnapshot(cprtAProjectionInputA(), {
    snapshotId: 'CT-v1',
    createdAt: '2026-08-16T07:40:00.000Z',
  });
}

test('PERSON_CT content is not institutionally eligible by inheritance', () => {
  const pending = evaluatePersonInstitutionGate({
    schemaVersion: PERSON_INSTITUTION_GATE_SCHEMA_VERSION,
    contributionRef: 'PC-001',
    personCtRef: 'CT-A01',
    representationRef: 'REP-001',
    contributionHash: 'a'.repeat(64),
    intakeRef: 'INTAKE-001',
    disposition: 'PENDING',
    assessedAt: '2026-08-16T07:30:00.000Z',
  });

  assert.equal(pending.institutionalStateEligible, false);
  assert.ok(pending.reasons.includes('intake_pending'));
  assert.ok(pending.reasons.includes('canonical_record_missing'));
  assert.ok(pending.reasons.includes('epistemic_assessment_missing'));
});

test('PERSON_CT contribution becomes eligible only after admitted canonical intake and assessment', () => {
  const admitted = evaluatePersonInstitutionGate({
    schemaVersion: PERSON_INSTITUTION_GATE_SCHEMA_VERSION,
    contributionRef: 'PC-001',
    personCtRef: 'CT-A01',
    representationRef: 'REP-001',
    contributionHash: 'a'.repeat(64),
    intakeRef: 'INTAKE-002',
    disposition: 'ADMITTED',
    canonicalRecordRef: 'EV-PERSON-001',
    epistemicAssessmentRef: 'EA-PERSON-001',
    governanceRef: 'ROOT-D-001',
    assessedAt: '2026-08-16T07:31:00.000Z',
  });

  assert.equal(admitted.institutionalStateEligible, true);
  assert.deepEqual(admitted.reasons, []);
});

test('CT AVAILABLE is distinct from CT CONSUMED', () => {
  const trace = buildCognitiveContextConsumptionTrace({
    executionId: 'RUN-001',
    ctSnapshotAvailable: 'CT-v145',
    ctSnapshotHashAvailable: 'a'.repeat(64),
    ctSnapshotConsumed: false,
    recordedAt: '2026-08-16T07:32:00.000Z',
  });

  assert.equal(trace.ctSnapshotAvailable, 'CT-v145');
  assert.equal(trace.ctSnapshotConsumed, false);
  assert.equal(trace.consumedSnapshotId, null);
});

test('blinded observation cannot consume CT context', () => {
  assert.throws(() => buildCognitiveContextConsumptionTrace({
    executionId: 'RUN-BLIND-001',
    ctSnapshotAvailable: 'CT-v145',
    ctSnapshotHashAvailable: 'a'.repeat(64),
    ctSnapshotConsumed: true,
    consumedSnapshotId: 'CT-v145',
    consumedSnapshotHash: 'a'.repeat(64),
    projectionProfile: 'FIELD_CASE_CONTEXT_V2',
    blindedObservation: true,
    recordedAt: '2026-08-16T07:33:00.000Z',
  }), /COGNITIVE_SPINE_BLINDED_OBSERVATION_CANNOT_CONSUME_CT/);
});

test('epistemic delta can occur without source delta', () => {
  const from = baseSnapshot();
  const nextInput = cprtAProjectionInputA();
  nextInput.records = nextInput.records.map((record) => record.ref === 'H-001'
    ? { ...record, epistemicClass: 'INVALIDATED' as const, invalidated: true }
    : record);
  const to = materializeCognitiveSnapshot(nextInput, {
    snapshotId: 'CT-v2',
    createdAt: '2026-08-16T07:41:00.000Z',
  });

  const transition = buildCognitiveSpineTransition(from, to, {
    transitionId: 'TR-001',
    createdAt: '2026-08-16T07:42:00.000Z',
    transitionInputs: ['EA-INVALIDATE-H-001'],
    admittedEpistemicRefs: ['EA-INVALIDATE-H-001'],
    unchangedCriticalRefs: ['EVID-001'],
  });

  assert.equal(transition.semanticPayload.sourceDelta.changed, false);
  assert.equal(transition.semanticPayload.epistemicDelta.changed, true);
  assert.deepEqual(transition.semanticPayload.epistemicDelta.changedRefs, ['H-001']);
  assert.equal(transition.semanticPayload.cognitiveStateDelta.changed, true);
  assert.equal(transition.semanticPayload.governanceDelta.changed, false);
});

test('transition semantic hash is independent from transition artifact metadata', () => {
  const from = baseSnapshot();
  const nextInput = cprtAProjectionInputA();
  nextInput.records.push({
    ref: 'ROOT-D-002',
    kind: 'DECISION',
    recordedAt: '2026-08-16T07:20:00.000Z',
    sourceHash: '9'.repeat(64),
    epistemicAssessmentRef: 'EA-ROOT-D-002',
    epistemicClass: 'DECLARED',
  });
  const to = materializeCognitiveSnapshot(nextInput, {
    snapshotId: 'CT-v2-governance',
    createdAt: '2026-08-16T07:41:00.000Z',
  });

  const left = buildCognitiveSpineTransition(from, to, {
    transitionId: 'TR-left',
    createdAt: '2026-08-16T07:42:00.000Z',
    transitionInputs: ['ROOT-D-002'],
    admittedEpistemicRefs: ['EA-ROOT-D-002'],
    runtimeMetadata: { runner: 'local' },
  });
  const right = buildCognitiveSpineTransition(from, to, {
    transitionId: 'TR-right',
    createdAt: '2031-04-02T10:11:12.000Z',
    transitionInputs: ['ROOT-D-002'],
    admittedEpistemicRefs: ['EA-ROOT-D-002'],
    runtimeMetadata: { runner: 'worker' },
  });

  assert.equal(left.semanticPayload.sourceDelta.changed, true);
  assert.equal(left.semanticPayload.governanceDelta.changed, true);
  assert.equal(left.transitionHash, right.transitionHash);
});
