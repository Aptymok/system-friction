import test from 'node:test';
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
