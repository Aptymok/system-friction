import test from 'node:test';
import assert from 'node:assert/strict';
import { EpistemicClass, GovernanceDecisionContract, SFI_INSTITUTIONAL_CONTRACTS, SFI_INSTITUTIONAL_CONTRACT_MANIFEST } from './institutionalContracts';

const EXPECTED = [
  'Observation', 'Evidence', 'Event', 'Agent', 'AgentExecution', 'Capability',
  'Phenomenon', 'Prediction', 'Formula', 'Memory', 'State', 'Error', 'Operation',
  'Request', 'GovernanceDecision',
].sort();

const CANONICAL_EPISTEMIC_CLASSES = [
  'observed', 'declared', 'imported', 'extracted', 'derived', 'inferred', 'simulated',
  'proposed', 'missing', 'degraded', 'conflicted', 'rejected', 'canonical',
].sort();

const CANONICAL_GOVERNANCE_OUTCOMES = ['ACCEPTED', 'REJECTED', 'NEEDS_EVIDENCE', 'FROZEN', 'SUPERSEDED'];

test('the institutional contract registry contains exactly the 15 approved contracts', () => {
  assert.deepEqual(Object.keys(SFI_INSTITUTIONAL_CONTRACTS).sort(), EXPECTED);
  assert.equal(SFI_INSTITUTIONAL_CONTRACT_MANIFEST.length, 15);
  assert.equal(new Set(SFI_INSTITUTIONAL_CONTRACT_MANIFEST.map((item) => item.name)).size, 15);
});

test('every institutional contract is executable and anchored in an active runtime path', () => {
  for (const item of SFI_INSTITUTIONAL_CONTRACT_MANIFEST) {
    const schema = SFI_INSTITUTIONAL_CONTRACTS[item.name];
    assert.equal(typeof schema.safeParse, 'function', `${item.name} lacks executable validation`);
    assert.ok(item.runtimeAnchor.trim().length > 0, `${item.name} lacks runtime anchor`);
    assert.equal(item.adoption, 'ACTIVE', `${item.name} is not actively anchored`);
  }
});

test('contracts fail closed on empty payloads', () => {
  for (const [name, schema] of Object.entries(SFI_INSTITUTIONAL_CONTRACTS)) {
    assert.equal(schema.safeParse({}).success, false, `${name} accepted an empty object`);
  }
});

test('executable epistemic vocabulary exactly matches canon 02', () => {
  assert.deepEqual([...EpistemicClass.options].sort(), CANONICAL_EPISTEMIC_CLASSES);
  assert.equal(EpistemicClass.safeParse('fixture').success, false, 'fixture must not be an institutional epistemic class');
});

test('governance decisions accept canon 14 outcomes and reject legacy aliases', () => {
  const base = {
    decisionId: 'decision-1', authority: 'ROOT', decidedAt: new Date().toISOString(), action: 'promote.method',
    rationale: 'Evidence and validation satisfy the promotion contract.', evidenceRefs: ['evidence-1'], auditRef: 'audit-1',
  };
  for (const outcome of CANONICAL_GOVERNANCE_OUTCOMES) {
    assert.equal(GovernanceDecisionContract.safeParse({ ...base, outcome }).success, true, outcome);
  }
  assert.equal(GovernanceDecisionContract.safeParse({ ...base, outcome: 'APPROVED' }).success, false);
  assert.equal(GovernanceDecisionContract.safeParse({ ...base, outcome: 'DEFERRED' }).success, false);
});