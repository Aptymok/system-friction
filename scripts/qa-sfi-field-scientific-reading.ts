import { compareMihmTopology } from '../packages/mihm-core/src/index';
import assert from 'node:assert/strict';
import type { CanonicalGraphEdge, CanonicalGraphNode } from '../packages/graph/src';
import { deriveEmpiricalCapacityEnvelope, deriveFieldScientificReading, emergenceReading, relationScientificReading, scientificMethodCandidates, temporalCoordinates } from '../src/lib/mihm/fieldScientificReading';

const node={
  nodeId:'observed-system',label:'Observed system',ontologyType:'case',profile:'sfi',origin:'qa',provenance:'evidence:node',lineage:['obs:1','obs:2'],
  attributes:{sequenceIndex:4,recurrenceIndex:2,timeInState:12,observedAt:'2026-09-28T12:00:00.000Z',presenceState:'OBSERVED_PRESENCE',previousPresenceState:'OBSERVED_ABSENCE',phenomenonRefs:['phenomenon:1'],sourceObservationRefs:['obs:1','obs:2'],aggregationRefs:['aggregate:1'],interventionRef:'action:1',perturbationMagnitude:0.2,capacityResponse:'RECOVERY',recoveryTime:3,returnEvidenceRefs:['return:1']},
  createdAt:'2026-09-28T15:00:00.000Z',updatedAt:'2026-09-28T15:01:00.000Z',
} as CanonicalGraphNode;
const otherEdge={
  edgeId:'edge:2',sourceNodeId:'observed-system',targetNodeId:'third',relation:'coordinates_with',weight:0.8,profile:'sfi',origin:'qa',provenance:'evidence:edge2',lineage:['edge-evidence:2'],attributes:{relationState:'SUPPORTED'},createdAt:'2026-09-28T15:00:00.000Z',updatedAt:'2026-09-28T15:01:00.000Z',
} as CanonicalGraphEdge;
const edge={
  edgeId:'edge:1',sourceNodeId:'observed-system',targetNodeId:'other',relation:'depends_on',weight:0.6,profile:'sfi',origin:'qa',provenance:'evidence:edge',lineage:['edge-evidence:1'],
  attributes:{relationState:'CHALLENGED',previousRelationState:'SUPPORTED',previousWeight:0.9,latency:5,uncertainty:0.2,onsetAt:'2026-09-28T11:00:00.000Z',recurrenceIndex:2},
  createdAt:'2026-09-28T15:00:00.000Z',updatedAt:'2026-09-28T15:01:00.000Z',
} as CanonicalGraphEdge;

const coordinates=temporalCoordinates(node);
assert(coordinates.some(x=>x.basis==='SEQUENCE'));
assert(coordinates.some(x=>x.basis==='RECURRENCE'));
assert(coordinates.some(x=>x.basis==='STATE_OCCUPANCY'));
assert(coordinates.some(x=>x.basis==='CHRONOLOGY'));
assert(!coordinates.some(x=>x.basis==='CYCLE'),'recurrence must not be relabelled as cycle');

const relation=relationScientificReading(edge);
assert.equal(relation.weightDelta,0.30000000000000004);
assert.equal(relation.currentState,'CHALLENGED');
assert.equal(relation.previousState,'SUPPORTED');
assert.equal(relation.provenanceBound,true);

assert.equal(emergenceReading(node).state,'OBSERVED_EMERGENCE');
assert.equal(emergenceReading({...node,attributes:{...node.attributes,previousPresenceState:'UNKNOWN'}}).state,'FIRST_OBSERVED_AT');

const methods=scientificMethodCandidates(node,[edge]);
assert(methods.some(x=>x.family==='CHANGE_POINT'));
assert(methods.some(x=>x.family==='ACTIVE_LEARNING'));
assert(methods.some(x=>x.family==='STATE_SPACE'));
assert(methods.some(x=>x.family==='POINT_PROCESS'));
assert(methods.some(x=>x.family==='DYNAMICAL_SYSTEMS'));
for(const method of methods){assert(method.dataRequired.length);assert(method.assumptions.length);assert(method.failureModes.length);assert(method.falsificationCondition.length);}

const reading=deriveFieldScientificReading(node,[edge,otherEdge]);
assert.equal(reading.temporal.multipleClocks,true);
assert(reading.temporal.availableResolutions.includes('EVENT'));
assert(reading.temporal.availableResolutions.includes('TRANSITION'));
assert(reading.temporal.availableResolutions.includes('CYCLE'));
assert(reading.temporal.availableResolutions.includes('PHENOMENON'));
assert.equal(reading.capacity?.response,'RECOVERY');
const secondCapacityNode={...node,nodeId:'observed-system-2',lineage:['obs:3'],attributes:{interventionRef:'action:2',perturbationMagnitude:0.5,capacityResponse:'DEGRADATION',returnEvidenceRefs:['return:2']}} as CanonicalGraphNode;
const envelope=deriveEmpiricalCapacityEnvelope([node,secondCapacityNode]);
assert.equal(envelope.status,'OBSERVED_RANGE');
assert.equal(envelope.minPerturbation,0.2);
assert.equal(envelope.maxPerturbation,0.5);
assert.equal(envelope.responses.RECOVERY,1);
assert.equal(envelope.responses.DEGRADATION,1);
assert.equal(deriveEmpiricalCapacityEnvelope([node]).status,'INSUFFICIENT');
assert.equal(reading.distributedConfiguration.state,'CANDIDATE');
assert.equal(reading.distributedConfiguration.memberNodeIds.length,3);
assert.equal(reading.evidenceGeometry.authority,'OBSERVED_RELATION_MEASURE');
assert.equal(reading.evidenceGeometry.strongestRelationId,'edge:2');
assert.equal(reading.nextAction.decision,'OBSERVE_NEXT','challenged rival structure must prefer observation before perturbation');
assert.equal(reading.reversibility.reconstructable,true);
assert(reading.boundaries.includes('RECURRENCE_NOT_ATTRACTOR'));
assert.equal(reading.propertyDiscovery.status,'CANDIDATES');
assert(reading.propertyDiscovery.candidates.some(x=>x.property==='RELATION_WEIGHT_CHANGE'));
assert(reading.propertyDiscovery.candidates.some(x=>x.property==='RELATION_STATE_CHANGE'));
assert(reading.propertyDiscovery.candidates.some(x=>x.property==='RECURRENCE'));
assert.equal(reading.attractor.state,'ATTRACTOR_CANDIDATE','recurrence plus observed recovery and provenance-bound stable relation may become a candidate, never an established attractor');
assert.equal(reading.methodCompetition.state,'COMPETING');
assert(reading.methodCompetition.candidates.some(x=>x.family==='CHANGE_POINT'&&x.assumptionCheck==='OBSERVABLE'));
assert(reading.methodCompetition.candidates.some(x=>x.family==='NETWORK_SCIENCE'&&x.assumptionCheck==='OBSERVABLE'));
assert(reading.methodCompetition.candidates.some(x=>x.family==='ACTIVE_LEARNING'&&x.assumptionCheck==='OBSERVABLE'));
assert(reading.methodCompetition.candidates.some(x=>x.family==='STATE_SPACE'&&x.assumptionCheck==='OBSERVABLE'));
assert(reading.methodCompetition.candidates.some(x=>x.family==='POINT_PROCESS'&&x.assumptionCheck==='OBSERVABLE'));
assert(reading.methodCompetition.candidates.some(x=>x.family==='DYNAMICAL_SYSTEMS'&&x.assumptionCheck==='OBSERVABLE'));
assert.ok(reading.methodCompetition.nextObservation?.includes('smallest observation'));

const recordOnly={...node,nodeId:'record-only',lineage:[],provenance:'',attributes:{},createdAt:'2026-09-28T15:00:00.000Z',updatedAt:'2026-09-28T15:01:00.000Z'} as CanonicalGraphNode;
assert.equal(temporalCoordinates(recordOnly).length,0,'database record timestamps must not become observed-world time');
assert.equal(emergenceReading(recordOnly).state,'NOT_ESTABLISHED');
assert.equal(deriveFieldScientificReading(recordOnly,[]).capacity,null);
assert.equal(deriveFieldScientificReading(recordOnly,[]).propertyDiscovery.status,'INSUFFICIENT');
assert.equal(deriveFieldScientificReading(recordOnly,[]).attractor.state,'NOT_ESTABLISHED');
assert.equal(deriveFieldScientificReading(recordOnly,[]).methodCompetition.state,'NO_CANDIDATE');

const fakeCapacityFromGenericLineage={
  ...node,
  nodeId:'generic-lineage-not-capacity',
  lineage:['evidence:generic'],
  attributes:{interventionCandidateRefs:['action:candidate']},
} as CanonicalGraphNode;
const fakeCapacityReading=deriveFieldScientificReading(fakeCapacityFromGenericLineage,[]);
assert.equal(fakeCapacityReading.capacity,null,'generic provenance must never be treated as empirical capacity evidence');
assert.notEqual(fakeCapacityReading.nextAction.decision,'REVIEW_PERTURBATION_CANDIDATE','perturbation review requires intervention-linked observed RETURN capacity');


// MIHM Foundation F1: topology contrast is descriptive and cannot mint emergence/prediction claims.
const topologyProtocol = {
  boundaryId: 'synthetic-six-node-system',
  relationSemanticsId: 'undirected-contact-v1',
  observerId: 'sfi-qa',
  resolution: 'NODE_RELATION' as const,
  temporalResolution: 'INSTANT' as const,
  directed: false,
};
const topologyNodeIds = ['a', 'b', 'c', 'd', 'e', 'f'];
const topologyRelations = (pairs: string[][]) => pairs.map(([sourceNodeId, targetNodeId]) =>
  ({ sourceNodeId, targetNodeId, relation: 'contact' }));
const topologyCycle = topologyRelations([
  ['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'f'], ['f', 'a'],
]);
const topologyTriangles = topologyRelations([
  ['a', 'b'], ['b', 'c'], ['a', 'c'], ['d', 'e'], ['e', 'f'], ['d', 'f'],
]);
const topologySnapshot = (relations: typeof topologyCycle, observedAt: string) => ({
  boundaryId: topologyProtocol.boundaryId,
  relationSemanticsId: topologyProtocol.relationSemanticsId,
  observedAt,
  sourceState: 'SIMULATED' as const,
  coverage: 'COMPLETE' as const,
  nodeIds: topologyNodeIds,
  relations,
  evidenceRefs: [] as string[],
});
const topologyT0 = topologySnapshot(topologyCycle, '2026-10-01T00:00:00Z');
const topologyT1 = topologySnapshot(topologyTriangles, '2026-10-02T00:00:00Z');
const topologyCompare = (after = topologyT1, before = topologyT0, protocol = topologyProtocol) =>
  compareMihmTopology({ before, after, protocol });

const topologyChanged = topologyCompare();
assert.equal(topologyChanged.status, 'STRUCTURAL_CHANGE', 'distinct connected components must be detectable');
assert.equal(topologyChanged.counts?.aggregatesEqual, true, 'node/edge count aggregate remains equal');
assert.equal(topologyChanged.delta?.weakComponentsBefore, 1);
assert.equal(topologyChanged.delta?.weakComponentsAfter, 2);
assert.equal(topologyChanged.epistemicClass, 'SIMULATED');
assert.equal(topologyChanged.delta?.addedRelations.length, 2);
assert.equal(topologyChanged.delta?.removedRelations.length, 2);

assert.equal(
  topologyCompare({ ...topologyT0, observedAt: topologyT1.observedAt, relations: topologyCycle.slice().reverse() }).status,
  'EQUIVALENT_WITHIN_PROTOCOL',
  'same typed multiset with new order must be equivalent only within the declared protocol',
);
assert.equal(
  topologyCompare({ ...topologyT0, observedAt: topologyT1.observedAt,
    relations: topologyCycle.map((relation) => ({
      ...relation, sourceNodeId: relation.targetNodeId, targetNodeId: relation.sourceNodeId,
    })) }).status,
  'EQUIVALENT_WITHIN_PROTOCOL',
  'undirected edges must be orientation-invariant',
);
assert.equal(
  topologyCompare({ ...topologyT0, observedAt: topologyT1.observedAt,
    relations: topologyCycle.map((relation) => ({
      ...relation, sourceNodeId: relation.targetNodeId, targetNodeId: relation.sourceNodeId,
    })) }, topologyT0, { ...topologyProtocol, directed: true }).status,
  'STRUCTURAL_CHANGE',
  'directed graph must preserve edge orientation',
);
for (const invalid of [
  { ...topologyT1, coverage: 'PARTIAL' as const },
  { ...topologyT1, boundaryId: 'changed-after-outcome' },
  { ...topologyT1, relationSemanticsId: 'incompatible-v2' },
  { ...topologyT1, observedAt: topologyT0.observedAt },
  { ...topologyT1, sourceState: 'NOT_OBSERVED' as const },
  { ...topologyT1, nodeIds: ['a', 'b'] },
  { ...topologyT1, nodeIds: [...topologyNodeIds, 'a'] },
]) {
  assert.equal(topologyCompare(invalid).status, 'INDETERMINATE', 'invalid coverage/boundary/time/source cannot yield structural claim');
}
assert.equal(
  topologyCompare({ ...topologyT1, sourceState: 'OBSERVED' }, { ...topologyT0, sourceState: 'OBSERVED' }).status,
  'INDETERMINATE',
  'OBSERVED requires evidence refs for both snapshots',
);
const observedTopology = topologyCompare(
  { ...topologyT1, sourceState: 'OBSERVED', evidenceRefs: ['evidence:t1'] },
  { ...topologyT0, sourceState: 'OBSERVED', evidenceRefs: ['evidence:t0'] },
);
assert.equal(observedTopology.epistemicClass, 'DERIVED', 'analytical contrast is not raw observation');
assert.equal(observedTopology.status, 'STRUCTURAL_CHANGE');
assert.equal(
  topologyCompare({ ...topologyT0, observedAt: topologyT1.observedAt,
    relations: [...topologyCycle, topologyCycle[0]] }).delta?.addedRelations[0].count,
  1,
  'parallel relation multiplicity must not be silently collapsed',
);

console.log('SFI field scientific reading QA passed.');
