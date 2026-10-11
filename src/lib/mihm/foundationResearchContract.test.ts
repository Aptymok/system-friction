import test from 'node:test';
import assert from 'node:assert/strict';
import { MIHM_DIMENSIONAL_TRANSFER_MODEL_V0, SFI_SYSTEM_CONTRACT, type SfiDimensionalTransferV0 } from '../../core/contracts/system';
import {
 SFI_MIHM_FOUNDATION_RESEARCH_CONTRACT,
 assessSfiMihmFoundation,
 type SfiMihmFoundationFrame,
} from './foundationResearchContract';

const ref=(id:string)=>({id});
const input=():SfiMihmFoundationFrame=>({
  contract:SFI_MIHM_FOUNDATION_RESEARCH_CONTRACT,
  systemContract:SFI_SYSTEM_CONTRACT,
  boundary:{
    id:'BOUND-KNIGHT-2012',subjectRef:ref('knight:smars'),
    includedRefs:[ref('knight:smars-server-8'),ref('knight:order-routing')],
    excludedRefs:[],
    boundaryRule:'The disclosed SMARS deployment and its bounded order-routing effects; other market systems excluded.',
    assumptions:['Regulatory statements are retrospective published findings.'],
    limitations:['Original SMARS machine log receipts unavailable to this published case.'],
    version:'1.0',
  },
  model:{
    id:'MIHM-SYSTEM-KNIGHT-2012',
    boundaryRef:ref('BOUND-KNIGHT-2012'),
    nodeRefs:[ref('knight:smars-server-8'),ref('knight:order-routing')],
    dimensionRefs:[ref('knight:deployment'),ref('knight:execution')],
    relationRefs:[ref('knight:regulatory-deployment-link')],
    flowRefs:[],constraintRefs:[],stateRefs:[],frictionRefs:[],perturbationRefs:[],
    trajectoryRefs:[],attractorRefs:[],transitionRefs:[],emergenceRefs:[],
    evidenceRefs:[], // Source docs not automatically canonical evidence
    modelVersion:'1.0',
    implementationStatus:'EXPERIMENTAL',
    uncertainty:null,
  },
  primaryMethod:'SCOREFRICTION',
  question:'What historical configurations and relations can be reconstructed from official records?',
  studyMode:'RETROSPECTIVE',
  // Day-after cutoff deliberately avoids inventing the exact SEC release hour.
  timeCut:'2013-10-18T00:00:00Z',
  sourceVintages:[{
    sourceId:'SEC-KNIGHT-70694',sourceKind:'OFFICIAL_DOCUMENT',
    sourceClass:'REAL_DOCUMENTARY',
    eventAt:null,availableAt:'2013-10-17T00:00:00Z',
    recordRef:'https://www.sec.gov/litigation/admin/2013/34-70694.pdf'
  }]
});
const temporal=():SfiDimensionalTransferV0=>({
  contract:MIHM_DIMENSIONAL_TRANSFER_MODEL_V0,
  status:'EXPERIMENTAL',
  sourceDimensionRef:ref('knight:deployment'),
  targetDimensionRef:ref('knight:execution'),
  sourceObservable:'source-document deployment state',
  targetObservable:'source-document executed-share volume',
  magnitude:null,direction:'SOURCE_TO_TARGET',lag:null,lagUnit:null,
  gain:null,attenuation:null,
  constraintRefs:[],contextRefs:[],uncertainty:null,
  epistemicClass:'SIMULATION',evidenceRefs:[],
  conservationAssumed:false,
});
const copy=()=>structuredClone(input());

test('SFI MIHM parent independently accepts a bounded real retrospective record without CIMPS or Phi',()=>{
  const x=assessSfiMihmFoundation(input());
  assert.equal(x.readiness,'READY_FOR_BOUNDED_RESEARCH');
  assert.equal(x.parentModelId,'MIHM-SYSTEM-KNIGHT-2012');
  assert.equal(x.miHmTStatus,'NOT_REQUESTED');
  assert.deepEqual(x.admittedSourceIds,['SEC-KNIGHT-70694']);
  assert.equal(x.cimpsPublicationPrerequisite,false);
  assert.equal(x.canonicalPhiCalculated,false);
  assert.equal(x.universalPhiIntroduced,false);
  assert.equal(x.scientificStatus,'FOUNDATION_RESEARCH_NOT_VALIDATED');
});
test('MIHM-T can enter only as experimental child referencing two actual parent dimensions',()=>{
  const f=input();f.temporalExtension=temporal();
  const x=assessSfiMihmFoundation(f);
  assert.equal(x.readiness,'READY_FOR_BOUNDED_RESEARCH');
  assert.equal(x.miHmTStatus,'EXPERIMENTAL_CHILD');
  assert.equal(x.prospectiveValidationClaimed,false);
  assert.equal(x.causalIdentificationClaimed,false);
});
test('MIHM-T cannot invent dimension identifiers outside parent system',()=>{
  const f=input();f.temporalExtension=temporal();f.temporalExtension.targetDimensionRef.id='not-in-parent';
  const x=assessSfiMihmFoundation(f);
  assert.equal(x.readiness,'BLOCKED');
  assert.equal(x.miHmTStatus,'BLOCKED');
  assert.ok(x.reasons.includes('TEMPORAL_EXTENSION_WITHOUT_VALID_PARENT_DIMENSIONS'));
});
test('MIHM-T cannot silently assume cross-dimensional conservation',()=>{
  const f=input();f.temporalExtension={...temporal(),conservationAssumed:true as false};
  assert.equal(assessSfiMihmFoundation(f).readiness,'BLOCKED');
});
test('incorrect parent system or missing system boundary blocks research eligibility',()=>{
  const f=copy();f.model.boundaryRef.id='OTHER_BOUNDARY';
  assert.ok(assessSfiMihmFoundation(f).reasons.includes('SYSTEM_MODEL_INVALID'));
  const b=copy();b.boundary.boundaryRule='';
  assert.ok(assessSfiMihmFoundation(b).reasons.includes('SYSTEM_BOUNDARY_NOT_WELL_FORMED'));
});
test('2013 SEC findings cannot be made public admissible at August 1 2012 knowledge cutoff',()=>{
  const f=input();f.timeCut='2012-08-01T12:00:00Z';
  const x=assessSfiMihmFoundation(f);
  assert.equal(x.readiness,'BLOCKED');
  assert.deepEqual(x.admittedSourceIds,[]);
  assert.deepEqual(x.excludedSourceIds,['SEC-KNIGHT-70694']);
  assert.ok(x.reasons.includes('NO_SOURCE_ADMISSIBLE_AT_CUT'));
});
test('missing knowledge availability stays missing; historic event date never substitutes publication',()=>{
  const f=input();f.sourceVintages[0].availableAt=null;
  const x=assessSfiMihmFoundation(f);
  assert.equal(x.readiness,'BLOCKED');
  assert.ok(x.sourceGaps.includes('KNOWLEDGE_AVAILABILITY_UNKNOWN:SEC-KNIGHT-70694'));
});
test('original official source can be real without automatic admission to canonical evidence',()=>{
  const f=input();f.model.evidenceRefs=[ref('unverified-archive-document')];
  const x=assessSfiMihmFoundation(f);
  assert.equal(x.readiness,'READY_FOR_BOUNDED_RESEARCH');
  assert.ok(x.warnings.includes('REFERENCES_ARE_NOT_AUTOMATICALLY_ADMITTED_EVIDENCE'));
  assert.equal(x.canonicalPhiCalculated,false);
});
test('model outputs cannot masquerade as real original documentary sources',()=>{
  const f=input();f.sourceVintages[0].sourceKind='MODEL_OUTPUT';
  const x=assessSfiMihmFoundation(f);
  assert.equal(x.readiness,'BLOCKED');
  assert.ok(x.reasons.includes('MODEL_OUTPUT_CANNOT_BE_ORIGINAL_REAL_SOURCE'));
});
test('missing and duplicated node/dimension IDs must not be quietly accepted',()=>{
  const f=input();f.model.nodeRefs=[ref('same'),ref('same')];
  assert.ok(assessSfiMihmFoundation(f).reasons.includes('INVALID_MODEL_REFERENCES:nodeRefs'));
  const g=input();g.model.dimensionRefs=[];
  assert.ok(assessSfiMihmFoundation(g).reasons.includes('NODES_AND_DIMENSIONS_REQUIRED'));
});
test('boundary cannot simultaneously include and exclude the same node',()=>{
  const f=input();f.boundary.excludedRefs=[ref('knight:smars-server-8')];
  assert.ok(assessSfiMihmFoundation(f).reasons.includes('BOUNDARY_CONTRADICTION'));
});
test('null is unknown, not an invented zero-valued scientific uncertainty',()=>{
  const f=input();f.model.uncertainty=null;
  const x=assessSfiMihmFoundation(f);
  assert.equal(x.readiness,'READY_FOR_BOUNDED_RESEARCH');
  assert.equal(x.prospectiveValidationClaimed,false);
  assert.equal(x.causalIdentificationClaimed,false);
});
