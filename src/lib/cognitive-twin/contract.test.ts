import test from 'node:test';
import assert from 'node:assert/strict';
import { createCognitiveTwinEnvelope, evaluateCognitiveTwinAuthority } from './contract';

test('founder-reserved actions never become autonomous during absence', () => {
  for (const action of ['publish', 'mutate_canon', 'change_formula', 'grant_root_access', 'transfer_ip', 'execute_irreversible'] as const) {
    const result = evaluateCognitiveTwinAuthority({ action, founderAbsent: true, evidencePresent: true });
    assert.equal(result.decision, 'REQUIRE_HUMAN');
  }
});

test('institutional memory cannot persist unevidenced facts', () => {
  const result = evaluateCognitiveTwinAuthority({ action: 'persist_memory', founderAbsent: false, evidencePresent: false });
  assert.equal(result.decision, 'DENY');
});

test('executor cannot verify itself', () => {
  const result = evaluateCognitiveTwinAuthority({ action: 'verify', founderAbsent: false, selfVerification: true });
  assert.equal(result.decision, 'DENY');
});

test('institutional envelope never defaults to approved or released', () => {
  const envelope = createCognitiveTwinEnvelope({ taskId: 'test-task' });
  assert.equal(envelope.status, 'PROPOSED');
  assert.equal(envelope.recommendedTransition, 'VERIFYING');
});
