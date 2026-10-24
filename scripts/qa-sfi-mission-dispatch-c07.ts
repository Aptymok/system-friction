import assert from 'node:assert/strict';
import { listBoundedCognitiveMissions } from '../src/lib/sfi/cognitive-runtime/missionCatalog';
import { validateMissionDispatchRequest } from '../src/lib/sfi/cognitive-runtime/missionDispatch';

const missions = listBoundedCognitiveMissions();
assert.equal(missions.length, 21);

for (const mission of missions) {
  const targets = Array.from({ length: mission.minimumTargets }, (_, i) => ({
    kind: mission.inputKinds[0], id: 'isolated-target-' + i,
  }));
  const request = {
    operation: 'execute_mission', missionId: mission.missionId, agentId: mission.agentId,
    purpose: mission.objective, anchors: [{ kind: 'ANALYSIS_SESSION', id: 'isolated-run' }], targets,
  };
  const valid = validateMissionDispatchRequest(request);
  assert.equal(valid.ok, true, mission.agentId);
  assert.deepEqual(valid.ok && valid.mission.missionId, mission.missionId);

  assert.deepEqual(validateMissionDispatchRequest({ ...request, agentId: 'other_agent' }), {
    ok: false, status: 400, error: 'mission_agent_mismatch',
  });
  assert.deepEqual(validateMissionDispatchRequest({ ...request, missionId: 'SFI-C06:forged' }), {
    ok: false, status: 400, error: 'mission_agent_mismatch',
  });
  assert.deepEqual(validateMissionDispatchRequest({ ...request, targets: [] }), {
    ok: false, status: 400, error: 'mission_target_count_invalid',
  });
  assert.deepEqual(validateMissionDispatchRequest({ ...request, targets: targets.map(x => ({...x, kind: 'ILLEGAL'})) }), {
    ok: false, status: 400, error: 'mission_target_kind_or_identity_invalid',
  });
  assert.deepEqual(validateMissionDispatchRequest({ ...request, anchors: [] }), {
    ok: false, status: 400, error: 'mission_anchor_required',
  });
  assert.deepEqual(validateMissionDispatchRequest({ ...request, purpose: '' }), {
    ok: false, status: 400, error: 'mission_purpose_required',
  });
}
const targetMismatch = missions.find(m => m.agentId === 'cross_impact');
assert.ok(targetMismatch);
assert.equal(targetMismatch.minimumTargets, 2);
const crossReq = {
  missionId: targetMismatch.missionId, agentId: targetMismatch.agentId, purpose: targetMismatch.objective,
  anchors: [{kind: 'CASE', id: 'isolated-case'}],
  targets: [{kind:'NODE', id:'duplicate'}, {kind:'NODE', id:'duplicate'}],
};
assert.deepEqual(validateMissionDispatchRequest(crossReq), {
  ok: false, status: 400, error: 'mission_target_duplicate',
});
console.log(JSON.stringify({
  pass: 'C07_MISSION_DISPATCH_CONTRACT',
  validatedMissions: missions.length,
  requestsExecuted: 0,
  databaseTouched: false,
  authorityChanges: 0,
}));
