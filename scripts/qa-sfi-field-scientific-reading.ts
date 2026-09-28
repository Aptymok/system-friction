import assert from 'node:assert/strict';
import type { CanonicalGraphEdge, CanonicalGraphNode } from '../packages/graph/src';
import { deriveFieldScientificReading, emergenceReading, relationScientificReading, scientificMethodCandidates, temporalCoordinates } from '../src/lib/mihm/fieldScientificReading';

const node={
  nodeId:'observed-system',label:'Observed system',ontologyType:'case',profile:'sfi',origin:'qa',provenance:'evidence:node',lineage:['obs:1','obs:2'],
  attributes:{sequenceIndex:4,recurrenceIndex:2,timeInState:12,observedAt:'2026-09-28T12:00:00.000Z',presenceState:'OBSERVED_PRESENCE',previousPresenceState:'OBSERVED_ABSENCE',phenomenonRefs:['phenomenon:1'],sourceObservationRefs:['obs:1','obs:2'],aggregationRefs:['aggregate:1'],interventionRef:'action:1',perturbationMagnitude:0.2,capacityResponse:'RECOVERY',recoveryTime:3,returnEvidenceRefs:['return:1']},
  createdAt:'2026-09-28T15:00:00.000Z',updatedAt:'2026-09-28T15:01:00.000Z',
} as CanonicalGraphNode;
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
for(const method of methods){assert(method.dataRequired.length);assert(method.assumptions.length);assert(method.failureModes.length);assert(method.falsificationCondition.length);}

const reading=deriveFieldScientificReading(node,[edge]);
assert.equal(reading.temporal.multipleClocks,true);
assert(reading.temporal.availableResolutions.includes('EVENT'));
assert(reading.temporal.availableResolutions.includes('TRANSITION'));
assert(reading.temporal.availableResolutions.includes('CYCLE'));
assert(reading.temporal.availableResolutions.includes('PHENOMENON'));
assert.equal(reading.capacity?.response,'RECOVERY');
assert.equal(reading.reversibility.reconstructable,true);
assert(reading.boundaries.includes('RECURRENCE_NOT_ATTRACTOR'));

const recordOnly={...node,nodeId:'record-only',lineage:[],provenance:'',attributes:{},createdAt:'2026-09-28T15:00:00.000Z',updatedAt:'2026-09-28T15:01:00.000Z'} as CanonicalGraphNode;
assert.equal(temporalCoordinates(recordOnly).length,0,'database record timestamps must not become observed-world time');
assert.equal(emergenceReading(recordOnly).state,'NOT_ESTABLISHED');
assert.equal(deriveFieldScientificReading(recordOnly,[]).capacity,null);

console.log('SFI field scientific reading QA passed.');
