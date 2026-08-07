import test from 'node:test';
import assert from 'node:assert/strict';
import { SFI_INSTITUTIONAL_CONTRACTS, SFI_INSTITUTIONAL_CONTRACT_MANIFEST } from './institutionalContracts';

const EXPECTED = [
  'Observation', 'Evidence', 'Event', 'Agent', 'AgentExecution', 'Capability',
  'Phenomenon', 'Prediction', 'Formula', 'Memory', 'State', 'Error', 'Operation',
  'Request', 'GovernanceDecision',
].sort();

test('the institutional contract registry contains exactly the 15 approved contracts', () => {
  assert.deepEqual(Object.keys(SFI_INSTITUTIONAL_CONTRACTS).sort(), EXPECTED);
  assert.equal(SFI_INSTITUTIONAL_CONTRACT_MANIFEST.length, 15);
  assert.equal(new Set(SFI_INSTITUTIONAL_CONTRACT_MANIFEST.map((item) => item.name)).size, 15);
});

test('every institutional contract is an executable zod schema with a runtime anchor', () => {
  for (const item of SFI_INSTITUTIONAL_CONTRACT_MANIFEST) {
    const schema = SFI_INSTITUTIONAL_CONTRACTS[item.name];
    assert.equal(typeof schema.safeParse, 'function', `${item.name} lacks executable validation`);
    assert.ok(item.runtimeAnchor.trim().length > 0, `${item.name} lacks runtime anchor`);
  }
});

test('contracts fail closed on empty payloads', () => {
  for (const [name, schema] of Object.entries(SFI_INSTITUTIONAL_CONTRACTS)) {
    assert.equal(schema.safeParse({}).success, false, `${name} accepted an empty object`);
  }
});
