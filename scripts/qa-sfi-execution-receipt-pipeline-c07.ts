import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Static wiring check. The behavioral atomic-append failure test lives in
// qa-sfi-agent-persistence-c07.ts. Server-only modules cannot be imported by
// a standalone Node process; this check deliberately does not claim a live run.
const read = (path: string) => readFileSync(path, 'utf8');
const route = read('src/app/api/root/cognitive-runtime/route.ts');
const mission = read('src/lib/sfi/cognitive-runtime/missionDispatch.ts');
const manual = read('src/lib/sfi/cognitive-runtime/manualExecution.ts');
const executor = read('src/lib/sfi/cognitive-runtime/runtimeAgentExecutor.ts');
const repository = read('src/infrastructure/events/cognitiveRuntimeEventRepository.ts');
const persistence = read('src/lib/sfi/cognitive-runtime/eventPersistence.ts');

assert.match(route, /requireRootActor\('root\.cognitive-runtime\.operate'\)/);
assert.match(route, /validateMissionDispatchRequest\(body\)/);
assert.match(route, /executeManualCognitiveAgent\(executionBody/);
assert.match(mission, /listBoundedCognitiveMissions\(\)/);
assert.match(mission, /mission_agent_mismatch/);
assert.match(mission, /mission_target_kind_or_identity_invalid/);
assert.match(manual, /missionId,/);
assert.match(manual, /runCognitiveAgent\(agentId, context\)/);
assert.match(manual, /SFI_AGENT_EXECUTION_RECEIPT_NOT_PERSISTED/);
assert.match(manual, /verifyCognitiveExecutionReceipt\(receiptRead\.data/);
assert.match(manual, /\.eq\('event_id', result\.receipt\.eventId\)/);
assert.match(manual, /\.eq\('logbook_id', context\.logbookId\)/);
assert.match(manual, /SFI_AGENT_EXECUTION_RECEIPT_READBACK_REJECTED/);
assert.match(manual, /llmAugmentation: missionId === null/);
assert.match(manual, /llmAugmentationAgents: missionId === null \? \[agentId\] : \[\]/);
assert.match(manual, /researchEligible = missionId === null && researchCapable/);
assert.match(manual, /DETERMINISTIC_ONLY_NO_EXTERNAL_MODEL_OR_RESEARCH/);
assert.match(manual, /reconciliationRequired: acknowledgedEventId !== null/);
assert.match(manual, /returnObservation: 'NOT_OBSERVED'/);
assert.match(executor, /const durableReceipt = await recordExecution\(/);
assert.match(executor, /'missionId'/);
assert.match(executor, /acknowledgement: 'PERSISTED'/);
assert.match(repository, /const receipt = await persistSFIEvent\(event\)/);
assert.match(repository, /return receipt;/);
assert.match(persistence, /SFI_EVENT_PERSISTENCE_RECEIPT_MISMATCH/);

console.log(JSON.stringify({
  pass: 'C07_STATIC_RUNTIME_RECEIPT_WIRING',
  verified: ['authenticated_route', 'mission_matching', 'existing_executor', 'persisted_receipt', 'return_not_observed'],
  validationKind: 'STATIC_SOURCE_CONTRACT',
  canonicalRuntimeExecuted: false,
  liveDatabaseTouched: false,
  realAgentActivated: false,
}));
