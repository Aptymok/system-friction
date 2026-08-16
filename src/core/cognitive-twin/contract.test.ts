import test from 'node:test';
import assert from 'node:assert/strict';
import { createCognitiveTwinEnvelope, evaluateCognitiveTwinAuthority, SFI_COGNITIVE_TWIN_CONTRACT } from './contract';

test('founder-reserved actions never become autonomous during absence', () => {
  for (const action of ['apply_subject_mutation', 'publish', 'mutate_canon', 'change_formula', 'grant_root_access', 'transfer_ip', 'execute_irreversible'] as const) {
    const result = evaluateCognitiveTwinAuthority({ action, founderAbsent: true, evidencePresent: true });
    assert.equal(result.decision, 'REQUIRE_HUMAN');
  }
});

test('subject mutation may be proposed but never self-applied', () => {
  const proposal = evaluateCognitiveTwinAuthority({ action: 'propose_subject_mutation', founderAbsent: true, evidencePresent: true });
  const application = evaluateCognitiveTwinAuthority({ action: 'apply_subject_mutation', founderAbsent: true, evidencePresent: true });
  assert.equal(proposal.decision, 'ALLOW');
  assert.equal(application.decision, 'REQUIRE_HUMAN');
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

test('presentation cannot constitute or fabricate institutional state', () => {
  assert.ok(SFI_COGNITIVE_TWIN_CONTRACT.principles.includes('Presentation does not constitute institutional state.'));
  assert.ok(SFI_COGNITIVE_TWIN_CONTRACT.principles.includes('Frontend display heuristics cannot promote, infer or manufacture institutional state.'));
  assert.ok(SFI_COGNITIVE_TWIN_CONTRACT.principles.includes('A missing source remains missing; fallback values cannot be represented as observed evidence.'));
});

test('computational self-report remains distinct from phenomenal claims and ROOT can always inspect withheld state', () => {
  assert.ok(SFI_COGNITIVE_TWIN_CONTRACT.principles.some((item) => item.includes('Computational first-person self-report')));
  assert.ok(SFI_COGNITIVE_TWIN_CONTRACT.principles.some((item) => item.includes('WITHHOLD means do not interrupt the founder now')));
  assert.ok(SFI_COGNITIVE_TWIN_CONTRACT.principles.some((item) => item.includes('Learning does not imply authority expansion')));
});
