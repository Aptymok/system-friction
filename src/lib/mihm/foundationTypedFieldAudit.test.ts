import test from 'node:test';
import * as typedField from './foundationTypedFieldAudit';

function runtimeFixture() {
  const input=fixture();
  return {
    nodeId:'system:sfi',
    lineage:['fixture:claimed-real-provenance-not-independently-verified','case:1','cycle:1'],
    attributes:{mihmTypedFieldAudit:{caseRef:{id:'case:1'},cycleRef:{id:'cycle:1'},input}},
  };
}
function executeNode(node:unknown,now='2026-10-29T00:00:00Z'):any {
  const execute=(typedField as any).executeMihmTypedFieldForNode;
  assert.equal(typeof execute,'function','existing scientific caller has no typed MIHM executor');
  return execute(node,now);
}
test('persisted-node MIHM execution computes a bounded result with case/cycle lineage',()=>{
  const out=executeNode(runtimeFixture());
  assert.equal(out.status,'EXECUTED');
  assert.equal(out.family,'MIHM_TYPED_FIELD');
  assert.equal(out.executionLevel,'BOUNDED_SCREENING');
  assert.equal(out.result.caseRef.id,'case:1');
  assert.equal(out.result.cycleRef.id,'cycle:1');
  assert.equal(out.result.audit.acceptedSampleIds.length,5);
  assert.equal(out.result.audit.dimensionTrajectories[0].observedLimitViolations,1);
  assert.equal(out.result.calibration.status,'NOT_CALIBRATED');
  assert.equal(out.result.audit.homeostasisEstablished,false);
  assert.equal(out.result.sourceValuesIndependentlyVerified,false);
  assert(out.evidenceRefs.includes('fixture:claimed-real-provenance-not-independently-verified'));
});
test('a node without typed observations stays absent instead of inventing an input',()=>{
  assert.equal(executeNode({nodeId:'none',lineage:[],attributes:{}}),null);
});
test('foreign subject, absent source lineage, future cut and malformed input abstain',()=>{
  for(const change of ['subject','lineage','future','malformed']) {
    const n=runtimeFixture();
    if(change==='subject')n.nodeId='another:subject';
    if(change==='lineage')n.lineage=[];
    if(change==='future')n.attributes.mihmTypedFieldAudit.input.frame.timeCut='2099-01-01T00:00:00Z';
    if(change==='malformed')(n.attributes.mihmTypedFieldAudit as any).input={samples:[null]};
    const out=executeNode(n);
    assert.equal(out.status,'ABSTAINED',change);
    assert.equal(out.result.audit,null,change);
    assert(out.missing.length>0);
  }
});
test('invalid audit remains abstained with diagnostics rather than advertising a computed capability',()=>{
  const n=runtimeFixture();n.attributes.mihmTypedFieldAudit.input.samples[0].unit='seconds';
  const out=executeNode(n);
  assert.equal(out.status,'ABSTAINED');
  assert.equal(out.result.audit.readiness,'BLOCKED');
  assert.equal(out.result.audit.homeostasisEstablished,false);
});
import assert from 'node:assert/strict';
import { SFI_SYSTEM_CONTRACT } from '../../core/contracts/system';
import { SFI_MIHM_FOUNDATION_RESEARCH_CONTRACT } from './foundationResearchContract';
import {
  SFI_MIHM_TYPED_FIELD_AUDIT,
  auditMihmTypedField,
  type MihmTypedFieldAuditInput,
} from './foundationTypedFieldAudit';

const ref=(id:string)=>({id});
function fixture():MihmTypedFieldAuditInput {
  const frame={
    contract:SFI_MIHM_FOUNDATION_RESEARCH_CONTRACT,
    systemContract:SFI_SYSTEM_CONTRACT,
    boundary:{
      id:'bound:test',subjectRef:ref('system:sfi'),
      includedRefs:[ref('node:a'),ref('node:b')],excludedRefs:[],
      boundaryRule:'Only two synthetic fixtures; no production action.',
      assumptions:[],limitations:['Synthetic values; not real performance.'],version:'1',
    },
    model:{
      id:'model:research',boundaryRef:ref('bound:test'),
      nodeRefs:[ref('node:a'),ref('node:b')],
      dimensionRefs:[ref('dim:availability'),ref('dim:retries')],
      relationRefs:[ref('rel:a-b')],flowRefs:[],constraintRefs:[ref('constraint:availability')],
      stateRefs:[],frictionRefs:[],perturbationRefs:[],trajectoryRefs:[],
      attractorRefs:[ref('attractor:availability')],transitionRefs:[],emergenceRefs:[],
      evidenceRefs:[],modelVersion:'research-v1',implementationStatus:'EXPERIMENTAL' as const,
      uncertainty:null,
    },
    primaryMethod:'SFI_INSTITUTIONAL' as const,
    question:'What is observable about degradation and resource use?',
    studyMode:'RETROSPECTIVE' as const,
    timeCut:'2026-10-28T12:00:00Z',
    sourceVintages:[{
      sourceId:'source:log',sourceKind:'ORIGINAL_LOG' as const,
      eventAt:'2026-10-25T00:00:00Z',availableAt:'2026-10-28T01:00:00Z',
      recordRef:'fixture:claimed-real-provenance-not-independently-verified',sourceClass:'REAL_TELEMETRY' as const,
    }],
  };
  const sample=(id:string,node:string,dim:string,value:number,at:string,unit:string,
    family:'OPERATIONAL'|'DIGITAL')=>({
    id,entityKind:'STATE' as const,nodeRef:ref(node),dimensionRef:ref(dim),
    fieldFamily:family,unit,value,state:'MEASURED' as const,
    observedAt:at,availableAt:'2026-10-28T02:00:00Z',sourceRef:ref('source:log'),
  });
  return {
    contract:SFI_MIHM_TYPED_FIELD_AUDIT,frame,
    samples:[
      sample('m1','node:a','dim:availability',.99,'2026-10-25T00:00:00Z','ratio','OPERATIONAL'),
      sample('m2','node:a','dim:availability',.94,'2026-10-26T00:00:00Z','ratio','OPERATIONAL'),
      sample('m3','node:a','dim:availability',.8,'2026-10-27T00:00:00Z','ratio','OPERATIONAL'),
      sample('r1','node:b','dim:retries',1,'2026-10-26T00:00:00Z','count','DIGITAL'),
      sample('r2','node:b','dim:retries',2,'2026-10-27T00:00:00Z','count','DIGITAL'),
    ],
    viabilityLimits:[{id:'limit:a',dimensionRef:ref('dim:availability'),
      unit:'ratio',lower:.9,upper:null,direction:'HIGHER_IS_BETTER'}],
    attractors:[{id:'a:1',attractorRef:ref('attractor:availability'),
      nodeRef:ref('node:a'),dimensionRef:ref('dim:availability'),unit:'ratio',lower:.7,upper:1}],
    relations:[{relationRef:ref('rel:a-b'),sourceNodeRef:ref('node:a'),
      targetNodeRef:ref('node:b'),sourceDimensionRef:ref('dim:availability'),
      targetDimensionRef:ref('dim:retries'),status:'HYPOTHESIZED',lagMs:null,
      sourceRefs:[ref('source:log')]}],
    resources:[
      {id:'resource:1',cycleRef:ref('cycle:1'),resource:'TOKENS',unit:'token',amount:100,
       state:'MEASURED',sourceRef:ref('source:log'),observedAt:'2026-10-27T10:00:00Z',
       availableAt:'2026-10-28T02:00:00Z'},
      {id:'resource:2',cycleRef:ref('cycle:2'),resource:'TOKENS',unit:'token',amount:0,
       state:'MEASURED',sourceRef:ref('source:log'),observedAt:'2026-10-27T11:00:00Z',
       availableAt:'2026-10-28T02:00:00Z'},
    ],
    requestedProjectionHorizonMs:86400000,
  };
}

test('typed field research reports trajectory and resource use without asserting systemic homeostasis',()=>{
  const o=auditMihmTypedField(fixture());
  assert.equal(o.readiness,'DOCUMENTARY_DIAGNOSTIC_ONLY');
  assert.deepEqual(o.acceptedSampleIds,['m1','m2','m3','r1','r2']);
  const t=o.dimensionTrajectories.find(x=>x.dimensionId==='dim:availability');
  assert.equal(t?.interpretation,'DEGRADATION_CANDIDATE');
  assert.ok(Math.abs((t?.delta??0)+.19)<1e-10);
  assert.equal(t?.observedLimitViolations,1);
  assert.equal(o.attractorChecks[0].state,'REPEATED_BAND_OCCUPANCY_ONLY');
  assert.equal(o.attractorChecks[0].attractorIdentified,false);
  assert.equal(o.propagation[0].state,'TEMPORAL_ASSOCIATION_CANDIDATE');
  assert.equal(o.propagation[0].causal,false);
  assert.equal(o.resourceTotals[0].amount,100);
  assert.equal(o.resourceTotals[0].status,'COMPLETE_DECLARED_RECEIPTS');
  assert.equal(o.homeostasisEstablished,false);
  assert.equal(o.canonicalPhiCalculated,false);
  assert.equal(o.observedReturnCreated,false);
  assert.equal(o.requestedProjection.projectedState,null);
});

test('explicit zero is measured; unknown, contradicting and simulated values cannot silently become zero',()=>{
  const a=fixture();a.samples[2].value=0;
  const zero=auditMihmTypedField(a);
  assert.equal(zero.acceptedSampleIds.includes('m3'),true);
  const b=fixture();b.samples[2].state='MISSING';b.samples[2].value=null;
  const missing=auditMihmTypedField(b);
  assert.equal(missing.acceptedSampleIds.includes('m3'),false);
  assert.equal(missing.excludedSampleIds.includes('m3'),true);
  const c=fixture();c.samples[2].state='SIMULATED';
  assert.equal(auditMihmTypedField(c).acceptedSampleIds.includes('m3'),false);
  const d=fixture();d.samples[2].state='CONTRADICTED';
  assert.equal(auditMihmTypedField(d).readiness,'BLOCKED');
  assert(d!==undefined);
});

test('a simulation-labelled parent source cannot be laundered into a MEASURED reading',()=>{
  const a=fixture();a.frame.sourceVintages[0].sourceClass='SIMULATED';
  const r=auditMihmTypedField(a);
  assert.equal(r.readiness,'BLOCKED');
  assert.equal(r.acceptedSampleIds.length,0);
  assert(r.reasons.includes('MEASURED_FROM_NON_REAL_SOURCE:m1'));
});

test('unavailable source times or fabricated time order block measured interpretation',()=>{
  const a=fixture();a.samples[2].availableAt=null;
  assert.equal(auditMihmTypedField(a).acceptedSampleIds.includes('m3'),false);
  const b=fixture();b.samples[2].availableAt='2026-10-29T00:00:00Z';
  assert.equal(auditMihmTypedField(b).acceptedSampleIds.includes('m3'),false);
  const c=fixture();c.samples[2].availableAt='2026-10-26T00:00:00Z';
  const out=auditMihmTypedField(c);
  assert.equal(out.readiness,'BLOCKED');
  assert(out.reasons.includes('SOURCE_AVAILABLE_BEFORE_OBSERVATION:m3'));
  const d=fixture();d.samples[2].observedAt='2026-02-30T10:00:00Z';
  assert.equal(auditMihmTypedField(d).readiness,'BLOCKED');
});

test('units and families are not pooled and duplicate samples are rejected',()=>{
  const a=fixture();a.samples[2].unit='ms';
  assert(auditMihmTypedField(a).reasons.some(x=>x.startsWith('DIMENSION_UNIT_CONFLICT:')));
  const b=fixture();b.samples[2].fieldFamily='DIGITAL';
  assert(auditMihmTypedField(b).reasons.includes('DIMENSION_FAMILY_CONFLICT:dim:availability'));
  const c=fixture();c.samples.push(structuredClone(c.samples[2]));
  assert(auditMihmTypedField(c).reasons.some(x=>x.startsWith('DUPLICATE_SAMPLE:')));
});

test('incomplete resource receipts never masquerade as zero spend',()=>{
  const a=fixture();a.resources[1].state='MISSING';a.resources[1].amount=null;
  const x=auditMihmTypedField(a).resourceTotals[0];
  assert.equal(x.amount,null);
  assert.equal(x.missingEntries,1);
  assert.equal(x.status,'PARTIAL_OR_UNTRUSTED');
  const b=fixture();b.resources[1].unit='ms';
  const totals=auditMihmTypedField(b).resourceTotals;
  assert.equal(totals.length,2);
  assert(totals.some(x=>x.unit==='ms'));
});

test('duplicate resource receipts do not become duplicated costs',()=>{
  const a=fixture();a.resources.push(structuredClone(a.resources[1]));
  const r=auditMihmTypedField(a);
  assert.equal(r.readiness,'BLOCKED');
  assert(r.reasons.includes('DUPLICATE_RESOURCE_RECEIPT:resource:2'));
  assert.equal(r.resourceTotals[0].amount,null);
  const b=fixture();b.resources[0].availableAt='2026-10-26T00:00:00Z';
  assert.equal(auditMihmTypedField(b).resourceTotals[0].amount,null);
});

test('no projective number or authorized return can be inferred from two measured points',()=>{
  const a=fixture();a.attractors=[];a.resources=[];a.relations=[];
  const x=auditMihmTypedField(a);
  assert.equal(x.requestedProjection.status,'BLOCKED_NOT_CALIBRATED_OR_INDEPENDENTLY_VALIDATED');
  assert.equal(x.causalPropagationEstablished,false);
  assert.equal(x.externalActionAuthorized,false);
  assert.equal(x.resourceCostsIndependentlyVerified,false);
});

test('equivalent offset and fractional timestamps cannot multiply resource receipts',()=>{
  for(const at of ['2026-10-27T10:00:00+00:00','2026-10-27T12:00:00+02:00','2026-10-27T10:00:00.000Z']){
    const a=fixture();a.resources.push({...a.resources[0],observedAt:at});
    const o=auditMihmTypedField(a);
    assert(o.reasons.includes('DUPLICATE_RESOURCE_RECEIPT:resource:1'));
    assert.equal(o.resourceTotals[0].amount,null);
  }
});

test('one observation instant cannot establish repeated occupancy through timestamp aliases',()=>{
  const a=fixture();const first=a.samples[0];
  a.samples=[
    first,
    {...first,id:'alias:1',observedAt:'2026-10-25T02:00:00+02:00'},
    {...first,id:'alias:2',observedAt:'2026-10-25T00:00:00.000Z'},
  ];
  const o=auditMihmTypedField(a);
  assert(o.reasons.some(x=>x.startsWith('DUPLICATE_SAMPLE:')));
  assert.equal(o.acceptedSampleIds.length,1);
  assert.equal(o.dimensionTrajectories.length,0);
  assert.equal(o.attractorChecks[0].state,'INSUFFICIENT_OBSERVATIONS');
});

test('negative and nonfinite resource amounts never advertise complete totals',()=>{
  for(const amount of [-100,NaN,Infinity,-Infinity]){
    const a=fixture();a.resources[0].amount=amount;
    const o=auditMihmTypedField(a);
    assert.equal(o.resourceTotals[0].amount,null);
    assert.equal(o.resourceTotals[0].missingEntries,1);
    assert.equal(o.resourceTotals[0].status,'PARTIAL_OR_UNTRUSTED');
  }
});

test('unit or family conflicts suppress accepted samples, trajectories, bands and propagation',()=>{
  for(const mutation of [{unit:'ms'},{fieldFamily:'DIGITAL' as const}]){
    const a=fixture();Object.assign(a.samples[2],mutation);
    const o=auditMihmTypedField(a);
    assert.equal(o.acceptedSampleIds.some(id=>['m1','m2','m3'].includes(id)),false);
    assert.equal(o.dimensionTrajectories.some(t=>t.dimensionId==='dim:availability'),false);
    assert.equal(o.attractorChecks[0].state,'INSUFFICIENT_OBSERVATIONS');
    assert.equal(o.propagation[0].state,'NOT_IDENTIFIABLE');
    assert.equal(o.dimensionTrajectories.some(t=>t.dimensionId==='dim:retries'),true);
  }
});

test('case and cycle cannot be rebound to unrelated persisted identities',()=>{
  for(const field of ['caseRef','cycleRef']) {
    const n=runtimeFixture();
    (n.attributes.mihmTypedFieldAudit as any)[field]={id:'unrelated:id'};
    const out=executeNode(n);
    assert.equal(out.status,'ABSTAINED');
    assert(out.missing.includes('TYPED_FIELD_CASE_CYCLE_LINEAGE_REQUIRED'));
  }
});

test('invalid viability direction cannot reverse the meaning of degradation',()=>{
  const a=fixture();(a.viabilityLimits[0] as any).direction='TYPO';
  const o=auditMihmTypedField(a);
  assert.equal(o.readiness,'BLOCKED');
  assert(o.reasons.includes('INVALID_VIABILITY_LIMIT:limit:a'));
  assert.equal(o.dimensionTrajectories[0].interpretation,'DIRECTION_UNKNOWN');
});

test('existing node caller executes mathematical, redistribution and dynamic mechanisms together',()=>{
 const n=runtimeFixture();
 (n.attributes.mihmTypedFieldAudit as any).mechanisms={sourceRef:{id:n.lineage[0]},
  normalizedNodes:[{id:'a',C:0,E:1,L:0,M:1}],
  redistribution:{nodes:[{id:'a',capacity:10,load:12},{id:'b',capacity:10,load:5}],transfers:[{from:'a',to:'b',amount:3}]},
  dynamics:{state:[2],transition:[[.5]],forcing:[0],steps:2}};
 const out=executeNode(n);
 assert.equal(out.result.mechanisms.mathematics.ihg,-1);
 assert.equal(out.result.mechanisms.redistribution.totalAfter,17);
 assert.deepEqual(out.result.mechanisms.dynamics.trajectory,[[2],[1],[.5]]);
 assert.equal(out.result.audit.homeostasisEstablished,false);
});

test('mechanism parameters cannot use a future vintage merely present in graph lineage',()=>{
 const n=runtimeFixture();n.lineage.push('future:parameters');
 n.attributes.mihmTypedFieldAudit.input.frame.sourceVintages.push({sourceId:'future',sourceKind:'ORIGINAL_LOG',eventAt:'2026-10-29T00:00:00Z',availableAt:'2026-10-29T00:00:00Z',recordRef:'future:parameters',sourceClass:'REAL_TELEMETRY'});
 (n.attributes.mihmTypedFieldAudit as any).mechanisms={sourceRef:{id:'future:parameters'},normalizedNodes:[]};
 assert.equal(executeNode(n).status,'ABSTAINED');
});

test('signed IHG cannot turn worsening coherence in an overloaded node into decision permission',()=>{
 const n=runtimeFixture();
 (n.attributes.mihmTypedFieldAudit as any).mechanisms={sourceRef:{id:n.lineage[0]},normalizedNodes:[{id:'overloaded',C:.2,E:.8,L:.5,M:0,R:.4,K:.5}]};
 const out=executeNode(n);
 assert.equal(out.status,'EXECUTED');
 assert.equal(out.result.decisionUseBlocked,true);
 assert.equal(out.result.instrumentCompatibility.readiness,'CONTRADICTED');
 assert.equal(out.result.instrumentCompatibility.decisionAuthorized,false);
 assert(out.result.instrumentCompatibility.contradictions.some((x:string)=>x.includes('LATENCY_MASKS_OVERLOAD')));
 assert.equal(out.result.mechanisms.mathematics.ihg,0);
});
