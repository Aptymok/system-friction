import assert from 'node:assert/strict';
import { resolveMihmMethod } from '../src/lib/mihm/methodSelectionResolver';
import { deriveCanonicalFieldMethodSignal, resolveRootCaseMethodology } from '../src/lib/mihm/rootCaseMethodology';
import type { CanonicalGraphEdge, CanonicalGraphNode } from '../packages/graph/src';
import { proposeMethodLabFieldProtocol, resolveMethodLabFieldProjection } from '../src/lib/method-lab/fieldProjection';

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

const cycleObservedCase = resolveRootCaseMethodology({
  id: 'cycle-observed-case',
  title: 'Observed recurrence without declared day span',
  type: 'case',
  status: 'closed',
  cycle_index: 3,
  phase: 'RECOVERY',
  evidence_count: 2,
  evidence_type: 'telemetry',
});
assert.equal(cycleObservedCase.input.temporalScope, 'LONGITUDINAL');
assert.equal(cycleObservedCase.input.observationSpanDays, 0);
assert.equal(cycleObservedCase.input.requiresTrajectory, true);
assert.equal(cycleObservedCase.resolution.primary?.methodId, 'PPOI');

const multiEvidenceSnapshot = resolveMihmMethod({
  subject: 'ARTIFACT',
  temporalScope: 'POINT_IN_TIME',
  evidenceModalities: ['AUDIO', 'INSTITUTIONAL_RECORD'],
  subjectId: 'artifact-multi-evidence',
  evidenceCount: 4,
});
assert.equal(multiEvidenceSnapshot.status, 'READY');
assert.equal(multiEvidenceSnapshot.primary?.methodId, 'SCOREFRICTION');

const questionDrivenCase = resolveRootCaseMethodology({
  id: 'question-driven-case',
  title: 'Bounded observation',
  type: 'case',
  status: 'closed',
  research_question: 'Did the relation change across a recurring cycle, and which rival hypothesis would distinguish the transition?',
  evidence_count: 1,
  evidence_type: 'institutional record',
});
assert.equal(questionDrivenCase.input.requiresTrajectory, true);
assert.equal(questionDrivenCase.input.requiresRivalHypothesis, true);
assert.equal(questionDrivenCase.resolution.primary?.methodId, 'PPOI');

const fieldTransitionCase = resolveRootCaseMethodology({
  id: 'field-transition-case',
  title: 'Observed relation transition',
  type: 'case',
  status: 'closed',
  relation_state: 'CHALLENGED',
  previous_relation_state: 'SUPPORTED',
  evidence_count: 1,
  evidence_type: 'institutional record',
});
assert.equal(fieldTransitionCase.input.requiresTrajectory, true);
assert.equal(fieldTransitionCase.resolution.primary?.methodId, 'PPOI');

const returnContrastCase = resolveRootCaseMethodology({
  id: 'return-contrast-case',
  title: 'Observed return differs from bounded expectation',
  type: 'case',
  status: 'closed',
  expected_return: 2,
  observed_return: 10,
  evidence_count: 1,
  evidence_type: 'institutional record',
});
assert.equal(returnContrastCase.input.requiresRivalHypothesis, true);
assert.equal(returnContrastCase.resolution.primary?.methodId, 'PPOI');

const canonicalFieldNode = {
  nodeId: 'field-node-1',
  label: 'Observed object',
  ontologyType: 'case',
  profile: 'sfi',
  origin: 'test',
  provenance: 'evidence:node:1',
  lineage: ['evidence:node:1'],
  attributes: { cycleIndex: 2, epistemicClass: 'OBSERVED' },
  createdAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
} as CanonicalGraphNode;

const canonicalFieldEdge = {
  edgeId: 'field-edge-1',
  sourceNodeId: 'field-node-1',
  targetNodeId: 'field-node-2',
  relation: 'depends_on',
  weight: 0.7,
  profile: 'sfi',
  origin: 'test',
  provenance: 'evidence:edge:1',
  lineage: ['evidence:edge:1'],
  attributes: {
    relationState: 'CHALLENGED',
    previousRelationState: 'SUPPORTED',
    previousWeight: 0.9,
    counterevidence: ['evidence:counter:1'],
    transitionIndex: 4,
  },
  createdAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
} as CanonicalGraphEdge;

const fieldSignal = deriveCanonicalFieldMethodSignal(canonicalFieldNode, [canonicalFieldEdge]);
assert.equal(fieldSignal.relationCount, 1);
assert.equal(fieldSignal.evidenceBoundRelationCount, 1);
assert.equal(fieldSignal.relationTransition, true);
assert.equal(fieldSignal.weightChangeObserved, true);
assert.equal(fieldSignal.temporalStructureObserved, true);
assert.equal(fieldSignal.counterevidenceObserved, true);
assert.equal(fieldSignal.requiresTrajectory, true);
assert.equal(fieldSignal.requiresRivalHypothesis, true);
assert.equal(fieldSignal.observedWeightDelta, 0.2);
assert.equal(fieldSignal.relationSupportRatio, 0);
assert.equal(fieldSignal.provenanceCoverage, 1);
assert.equal(fieldSignal.reorganizationMagnitude, 0);
assert.equal(fieldSignal.projectionAuthority, 'NONE');
assert.equal(fieldSignal.expectationObserved, false);
assert.equal(fieldSignal.returnObserved, false);
assert.equal(fieldSignal.contrastReady, false);

const staticFieldEdge = {
  ...canonicalFieldEdge,
  edgeId: 'field-edge-static',
  weight: 0.7,
  lineage: [],
  provenance: '',
  attributes: {},
} as CanonicalGraphEdge;
const staticFieldSignal = deriveCanonicalFieldMethodSignal(
  { ...canonicalFieldNode, attributes: { epistemicClass: 'OBSERVED' } },
  [staticFieldEdge],
);
assert.equal(staticFieldSignal.requiresTrajectory, false);
assert.equal(staticFieldSignal.requiresRivalHypothesis, false);

const contrastFieldSignal = deriveCanonicalFieldMethodSignal(
  {
    ...canonicalFieldNode,
    nodeId: 'field-node-contrast',
    attributes: {
      epistemicClass: 'OBSERVED',
      expectedCondition: 'signal remains below declared threshold',
      observedReturn: 'signal exceeded declared threshold',
      discriminatingObservations: ['independent observation after the bounded window'],
      stoppingCondition: 'window closed',
    },
  },
  [],
);
assert.equal(contrastFieldSignal.expectationObserved, true);
assert.equal(contrastFieldSignal.returnObserved, true);
assert.equal(contrastFieldSignal.discriminatingObservationObserved, true);
assert.equal(contrastFieldSignal.stoppingConditionObserved, true);
assert.equal(contrastFieldSignal.contrastReady, true);

const promotedLearningFieldSignal = deriveCanonicalFieldMethodSignal(
  {
    ...canonicalFieldNode,
    nodeId: 'field-learning-promoted',
    attributes: {
      eventName: 'SFI_UNIVERSAL_LEARNING_PROMOTED',
      assessmentClass: 'VERIFIED_CONTRAST',
      epistemicClass: 'DERIVED',
    },
  },
  [],
);
assert.equal(promotedLearningFieldSignal.learningPromoted, true);
assert.equal(promotedLearningFieldSignal.fieldReorganizationState, 'LEARNING_PROMOTED');

const quarantinedLearningFieldSignal = deriveCanonicalFieldMethodSignal(
  {
    ...canonicalFieldNode,
    nodeId: 'field-learning-candidate',
    attributes: {
      eventName: 'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED',
      epistemicClass: 'DERIVED',
    },
  },
  [],
);
assert.equal(quarantinedLearningFieldSignal.learningCandidateObserved, true);
assert.equal(quarantinedLearningFieldSignal.learningPromoted, false);
assert.equal(quarantinedLearningFieldSignal.fieldReorganizationState, 'LEARNING_QUARANTINED');

const uncalibratedContrastFieldSignal = deriveCanonicalFieldMethodSignal(
  {
    ...canonicalFieldNode,
    nodeId: 'field-contrast-inconclusive',
    attributes: {
      eventName: 'SFI_UNIVERSAL_RETURN_CONTRASTED',
      calibrationStatus: 'REQUIRES_REVIEW',
    },
  },
  [],
);
assert.equal(uncalibratedContrastFieldSignal.contrastRecorded, false);
assert.equal(uncalibratedContrastFieldSignal.fieldReorganizationState, 'UNCHANGED');

const evidenceDrivenPromotedSignal = deriveCanonicalFieldMethodSignal(
  {
    ...canonicalFieldNode,
    nodeId: 'field-learning-evidence-driven',
    attributes: {
      eventName: 'SFI_UNIVERSAL_LEARNING_PROMOTED',
      assessmentClass: 'VERIFIED_CONTRAST',
      epistemicClass: 'DERIVED',
    },
  },
  [{
    ...canonicalFieldEdge,
    edgeId: 'field-edge-evidence-driven',
    sourceNodeId: 'field-learning-evidence-driven',
    weight: 0.8,
    provenance: 'evidence:edge:promoted',
    lineage: ['evidence:edge:promoted'],
    attributes: {
      relationState: 'SUPPORTED',
      previousRelationState: 'CHALLENGED',
      previousWeight: 0.5,
    },
  }],
);
assert.equal(evidenceDrivenPromotedSignal.learningPromoted, true);
assert.equal(evidenceDrivenPromotedSignal.observedWeightDelta, 0.30000000000000004);
assert.equal(evidenceDrivenPromotedSignal.relationSupportRatio, 1);
assert.equal(evidenceDrivenPromotedSignal.provenanceCoverage, 1);
assert.ok(evidenceDrivenPromotedSignal.reorganizationMagnitude > 0);
assert.ok(evidenceDrivenPromotedSignal.reorganizationMagnitude <= 1);
assert.equal(evidenceDrivenPromotedSignal.projectionAuthority, 'METHOD_LAB_REQUIRED');

const noProtocolProjection = resolveMethodLabFieldProjection({
  protocolId: null,
  ...evidenceDrivenPromotedSignal,
});
assert.equal(noProtocolProjection.decision, 'ABSTAIN');
assert.equal(noProtocolProjection.reason, 'FIELD_PROTOCOL_REQUIRED');

const methodLabProjection = resolveMethodLabFieldProjection({
  protocolId: 'sociotechnical_simulation',
  ...evidenceDrivenPromotedSignal,
});
assert.equal(methodLabProjection.decision, 'SIMULATED_PROJECTION');
assert.equal(methodLabProjection.epistemicClass, 'SIMULATED');
assert.ok(methodLabProjection.displacement);
assert.ok(methodLabProjection.limitations.some((item) => item.includes('not an observed force')));

const unresolvedDirectionProjection = resolveMethodLabFieldProjection({
  protocolId: 'sociotechnical_simulation',
  relationCount: 1,
  evidenceBoundRelationCount: 1,
  observedWeightDelta: 0.3,
  relationSupportRatio: 0.5,
  provenanceCoverage: 1,
  fieldReorganizationState: 'LEARNING_PROMOTED',
});
assert.equal(unresolvedDirectionProjection.decision, 'ABSTAIN');
assert.equal(unresolvedDirectionProjection.reason, 'DIRECTION_UNRESOLVED');

const proposedSociotechnicalProtocol = proposeMethodLabFieldProtocol({
  declaredProtocolId: null,
  primaryMethodId: 'PPOI',
  evidenceModalities: [],
  worldContextRequested: false,
  requiresTrajectory: true,
  requiresRivalHypothesis: true,
  requiresInterventionTracking: false,
  relationCount: evidenceDrivenPromotedSignal.relationCount,
  evidenceBoundRelationCount: evidenceDrivenPromotedSignal.evidenceBoundRelationCount,
  temporalStructureObserved: evidenceDrivenPromotedSignal.temporalStructureObserved,
  relationTransition: evidenceDrivenPromotedSignal.relationTransition,
  weightChangeObserved: evidenceDrivenPromotedSignal.weightChangeObserved,
});
assert.equal(proposedSociotechnicalProtocol.status, 'PROPOSED');
assert.equal(proposedSociotechnicalProtocol.protocolId, 'sociotechnical_simulation');
assert.equal(proposedSociotechnicalProtocol.epistemicClass, 'DERIVED');

const abstainedProtocol = proposeMethodLabFieldProtocol({
  declaredProtocolId: null,
  primaryMethodId: 'PPOI',
  evidenceModalities: [],
  worldContextRequested: false,
  requiresTrajectory: true,
  requiresRivalHypothesis: false,
  requiresInterventionTracking: false,
  relationCount: 0,
  evidenceBoundRelationCount: 0,
  temporalStructureObserved: true,
  relationTransition: false,
  weightChangeObserved: false,
});
assert.equal(abstainedProtocol.status, 'ABSTAIN');
assert.equal(abstainedProtocol.protocolId, null);

console.log('SFI method selection resolver QA passed.');
