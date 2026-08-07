import assert from 'node:assert/strict';
import { resolveMihmMethod } from '../src/lib/mihm/methodSelectionResolver';
import { resolveRootCaseMethodology } from '../src/lib/mihm/rootCaseMethodology';

const personal = resolveMihmMethod({
  subject: 'PERSON', temporalScope: 'SESSION', evidenceModalities: ['CONVERSATION'], sessionId: 'session-1',
});
assert.equal(personal.status, 'READY');
assert.equal(personal.primary?.methodId, 'MOP_H');

const object = resolveMihmMethod({
  subject: 'ARTIFACT', temporalScope: 'POINT_IN_TIME', evidenceModalities: ['AUDIO'], subjectId: 'artifact-1',
});
assert.equal(object.status, 'READY');
assert.equal(object.primary?.methodId, 'SCOREFRICTION');

const world = resolveMihmMethod({
  subject: 'WORLD_CONTEXT', temporalScope: 'CURRENT_WORLD_STATE', evidenceModalities: ['DATASET', 'INSTITUTIONAL_RECORD'],
});
assert.equal(world.status, 'READY');
assert.equal(world.primary?.methodId, 'WORLD_VECTOR');

const caseResult = resolveMihmMethod({
  subject: 'CASE', temporalScope: 'LONGITUDINAL', evidenceModalities: ['TEXT', 'CONVERSATION', 'INSTITUTIONAL_RECORD'],
  caseId: 'case-kavak', worldContextRequested: true, requiresTrajectory: true, requiresRivalHypothesis: true,
  requiresInterventionTracking: true, evidenceCount: 8, observationSpanDays: 40,
});
assert.equal(caseResult.status, 'READY');
assert.equal(caseResult.primary?.methodId, 'PPOI');
assert.deepEqual(caseResult.supporting.map((item) => item.methodId).sort(), ['SCOREFRICTION', 'WORLD_VECTOR']);

const institutional = resolveMihmMethod({
  subject: 'SFI_SYSTEM', temporalScope: 'LONGITUDINAL', evidenceModalities: ['TELEMETRY', 'INSTITUTIONAL_RECORD'],
  subjectId: 'sfi-institution', isSfiInternal: true,
});
assert.equal(institutional.status, 'READY');
assert.equal(institutional.primary?.methodId, 'SFI_INSTITUTIONAL');
assert.equal(institutional.requiresGovernanceReview, true);

const missingSession = resolveMihmMethod({
  subject: 'PERSON', temporalScope: 'SESSION', evidenceModalities: ['CONVERSATION'],
});
assert.equal(missingSession.status, 'BLOCKED');
assert.ok(missingSession.blockers.some((item) => item.code === 'SESSION_ID_REQUIRED'));

const conflict = resolveMihmMethod({
  subject: 'WORLD_CONTEXT', temporalScope: 'CURRENT_WORLD_STATE', evidenceModalities: ['DATASET'], requestedMethod: 'MOP_H',
});
assert.equal(conflict.status, 'BLOCKED');
assert.ok(conflict.blockers.some((item) => item.code === 'REQUESTED_METHOD_CONFLICT'));
assert.equal(conflict.requiresGovernanceReview, true);

const internalProposal = resolveRootCaseMethodology({
  id: 'a8abd72b-4518-462e-954f-ab2f507d9c36',
  title: 'cognitive_twin.proposal.created',
  proposal_type: 'cognitive_twin.proposal.created',
  status: 'READY',
  created_at: '2026-06-07T22:31:00.000Z',
});
assert.equal(internalProposal.input.subject, 'SFI_SYSTEM');
assert.equal(internalProposal.input.evidenceCount, 0);
assert.deepEqual(internalProposal.input.evidenceModalities, []);
assert.equal(internalProposal.resolution.primary?.methodId, 'SFI_INSTITUTIONAL');
assert.notEqual(internalProposal.resolution.primary?.methodId, 'PPOI');

const externalCaseWithoutEvidence = resolveRootCaseMethodology({
  id: 'external-case-1',
  title: 'External bounded case',
  type: 'case',
  status: 'open',
});
assert.equal(externalCaseWithoutEvidence.input.evidenceCount, 0);
assert.deepEqual(externalCaseWithoutEvidence.input.evidenceModalities, []);
assert.equal(externalCaseWithoutEvidence.resolution.primary?.methodId, 'PPOI');

console.log('SFI method selection resolver QA passed.');
