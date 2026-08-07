import test from 'node:test';
import assert from 'node:assert/strict';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';
import { SFI_AGENT_EXECUTION_MAP } from './agentExecutionMap';

const registryIds = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((agent) => agent.id).sort();
const executorIds = Object.keys(SFI_AGENT_EXECUTION_MAP).sort();

test('canonical cognitive runtime has 21 uniquely registered agents', () => {
  assert.equal(registryIds.length, 21);
  assert.equal(new Set(registryIds).size, 21);
});

test('every registered cognitive agent has exactly one executor binding', () => {
  assert.deepEqual(executorIds, registryIds);
});

test('all agent contracts declare authority, memory and events', () => {
  for (const agent of SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY) {
    assert.ok(agent.purpose.trim());
    assert.ok(agent.authorityLevel);
    assert.ok(agent.listensTo.length > 0, `${agent.id}: listensTo empty`);
    assert.ok(agent.emits.length > 0, `${agent.id}: emits empty`);
    assert.ok(agent.readsMemory.length > 0, `${agent.id}: readsMemory empty`);
    assert.ok(agent.writesMemory.length > 0, `${agent.id}: writesMemory empty`);
  }
});
