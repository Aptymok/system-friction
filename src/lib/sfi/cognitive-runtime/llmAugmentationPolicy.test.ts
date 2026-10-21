import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agentLlmAugmentationAllowed } from './llmAugmentationPolicy';

const spine={ctSnapshotConsumed:true,aiGovernancePolicyId:'SFI-AIMS-2026-08'};

test('an explicit llmAugmentation:false survives a consumed Cognitive Spine and disables the model',()=>{
  assert.equal(agentLlmAugmentationAllowed('evidence_hunter',{...spine,llmAugmentation:false}),false);
  assert.equal(agentLlmAugmentationAllowed('temporal_resolver',{...spine,llmAugmentation:false,llmAugmentationAgents:['temporal_resolver']}),false);
});
test('governed spine default remains active only when not explicitly disabled',()=>{
  assert.equal(agentLlmAugmentationAllowed('evidence_hunter',spine),true);
  assert.equal(agentLlmAugmentationAllowed('evidence_hunter',{...spine,llmAugmentation:true}),true);
});
test('plain non-spine internal analysis remains deterministic by default',()=>{
  assert.equal(agentLlmAugmentationAllowed('evidence_hunter',{llmAugmentation:undefined}),false);
  assert.equal(agentLlmAugmentationAllowed('evidence_hunter',undefined),false);
});
test('explicit augmentation is still permitted when governed and allowlisted',()=>{
  assert.equal(agentLlmAugmentationAllowed('evidence_hunter',{llmAugmentation:true,llmAugmentationAgents:['evidence_hunter']}),true);
  assert.equal(agentLlmAugmentationAllowed('temporal_resolver',{llmAugmentation:true,llmAugmentationAgents:['evidence_hunter']}),false);
});
test('the spine may not silently bypass an agent allowlist',()=>{
  assert.equal(agentLlmAugmentationAllowed('temporal_resolver',{...spine,llmAugmentationAgents:['evidence_hunter']}),false);
});

test('partial Cognitive Spine provenance does not unlock model execution by default',()=>{
  assert.equal(agentLlmAugmentationAllowed('evidence_hunter',{ctSnapshotConsumed:true,aiGovernancePolicyId:'UNVERIFIED'}),false);
  assert.equal(agentLlmAugmentationAllowed('evidence_hunter',{ctSnapshotConsumed:false,aiGovernancePolicyId:'SFI-AIMS-2026-08'}),false);
});
