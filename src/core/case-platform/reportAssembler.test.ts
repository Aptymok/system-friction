import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createSfiCaseV1 } from './caseEngine';
import { assembleSfiReportV1, buildSfiRealityChain, assertSfiCaseClosure, renderSfiRealityPassportHtml } from './reportAssembler';
import type { SfiReportV1 } from '../contracts/sfi';

const ref = (id: string) => ({ id, version: '1', hash: 'hash-'+id });
const t0 = '2026-01-01T00:00:00Z', t1 = '2026-01-04T00:00:00Z';
const caseRecord = () => createSfiCaseV1({ id:'case',tenantId:'tenant',serviceProfileId:'CUSTOM_RESEARCH',subject:'SYSTEM',scope:'Test bounded chain',systemBoundaryRef:ref('system'),temporalWindow:{mode:'LONGITUDINAL',basis:'OBSERVED_TIME',start:t0,end:t1,cutoff:t1,timezone:'UTC',reconstructionAsOf:null,horizon:null},createdAt:t0 });
const obj = (id: string, kind: string, payload: Record<string,unknown> = {}, createdAt=t0) => ({id,caseId:'case',tenantId:'tenant',kind,epistemicRole:kind==='SOURCE'?'SOURCE':kind==='EVIDENCE'?'EVIDENCE':'RECORD',canonicalRef:ref(id),sourceRefs:[] as ReturnType<typeof ref>[],recordRefs:[] as ReturnType<typeof ref>[],evidenceRefs:[] as ReturnType<typeof ref>[],payload,observedAt:t0,createdAt});
const hash = (value: unknown):string => {
 const stable=(v:unknown):unknown=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])):v;
 return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
};
function fixture() {
 const source=obj('source','SOURCE',{label:'Original',externalRef:'https://example.org/source'});
 const evidence={...obj('evidence','EVIDENCE'),sourceRefs:[source.canonicalRef]};
 const intervention=obj('action','INTERVENTION',{proposalId:'proposal'},'2026-01-02T00:00:00Z');intervention.observedAt=intervention.createdAt;
 const outcome={...obj('return','RETURN',{proposalId:'proposal',interventionRef:intervention.canonicalRef,outcome:'Measured',measurements:{latency:8}},'2026-01-03T00:00:00Z'),recordRefs:[intervention.canonicalRef],evidenceRefs:[evidence.canonicalRef]};outcome.observedAt=outcome.createdAt;
 const assessment={...obj('assessment','EPISTEMIC_ASSESSMENT',{classification:'EVIDENCE',determinability:'DETERMINED',assessedBy:'operator',assessedAt:t0,rationale:'Original source supports this evidence'}),epistemicRole:'EPISTEMIC_ASSESSMENT',evidenceRefs:[evidence.canonicalRef]};
 const input={caseRecord:caseRecord(),objects:[source,evidence,assessment,intervention,outcome],actions:[{id:'proposal',caseId:'case',createdAt:t0,status:'RETURN_RECORDED',recommendationRef:ref('recommendation'),action:{details:{expectedReturn:{metric:'latency',expected:10,tolerance:1}}},interventionRef:intervention.canonicalRef,returnRef:outcome.canonicalRef}],decisions:[{id:'decision',caseId:'case',proposalId:'proposal',decision:'APPROVE',authorityRole:'OWNER',decidedBy:'operator',createdAt:t0}],t0,t1,readComplete:true};
 return input;
}
function withReport(input: ReturnType<typeof fixture>) {
 const prior=buildSfiRealityChain(input);
 const report=assembleSfiReportV1({id:'report',caseRecord:input.caseRecord,generatedAt:t1,claims:[{id:'claim',statement:'Measured latency',assessmentRef:ref('assessment'),sourceRefs:[ref('source')],recordRefs:[],evidenceRefs:[ref('evidence')],determinability:'DETERMINED',confidence:null,lineage:{executionRef:ref('execution'),outputRelation:'OBSERVATION',support:'SUPPORTED',contradictionRefs:[],refutationConditions:['New measurements contradict this claim']}}],reconstruction:{contract:'SFI-CASE-RECONSTRUCTION-1.0',inputHash:prior.inputHash,t0,t1,narrative:prior.narrative,gaps:prior.gaps,nextObservation:prior.nextObservation,document:JSON.parse(JSON.stringify(prior))}});
 const reportObj={...obj('report','REPORT'),canonicalRef:{id:'report',version:report.version,hash:hash(report)},createdAt:t1};
 return {...input,objects:[...input.objects,reportObj],reports:[report]};
}

test('legacy CLOSED without report and RETURN remains administrative and never certified',()=>{
 const c=caseRecord();c.status='CLOSED';const chain=buildSfiRealityChain({caseRecord:c,objects:[],t0,t1,readComplete:true});
 assert.equal(chain.closure.disposition,'ADMINISTRATIVE');assert.equal(chain.closure.certified,false);
 assert(chain.gaps.includes('REPORT_MISSING'));assert(chain.gaps.includes('RETURN_MISSING'));
 assert.throws(()=>assertSfiCaseClosure(chain),/SFI_CASE_CLOSURE_BLOCKED/);
 assert.match(chain.narrative.join(' '),/cerrado administrativamente/i);
});
test('explicit administrative closure requires a reason; empty or forged report cannot close inconclusively',()=>{
 const chain=buildSfiRealityChain({caseRecord:caseRecord(),objects:[obj('fake','REPORT',{certified:true})],t0,t1,readComplete:true});
 assert.throws(()=>assertSfiCaseClosure(chain,'ADMINISTRATIVE',''),/REASON_REQUIRED/);
 assert.doesNotThrow(()=>assertSfiCaseClosure(chain,'ADMINISTRATIVE','Withdrawn by owner'));
 assert.throws(()=>assertSfiCaseClosure(chain,'INCONCLUSIVE','Insufficient records'),/REPORT/);
});
test('T0 uses registration time; backdated observations do not leak into prior knowledge',()=>{
 const late=obj('late','RECORD',{eventAt:'2025-12-20T00:00:00Z'},'2026-01-02T00:00:00Z');
 const chain=buildSfiRealityChain({caseRecord:caseRecord(),objects:[late],t0,t1,readComplete:true});
 assert.equal(chain.temporal.t0.objectRefs.length,0);assert.equal(chain.temporal.t1.objectRefs.length,1);
 assert.equal(chain.timeline[0].eventAt,'2025-12-20T00:00:00.000Z');
 assert.equal(chain.timeline[0].recordedAt,'2026-01-02T00:00:00.000Z');
 assert.equal(chain.temporal.comparison,'INSUFFICIENT_TEMPORAL_EVIDENCE');
});
test('provenance rejects wrong version, dangling references, cycles and foreign tenant objects',()=>{
 const a={...obj('a','EVIDENCE'),recordRefs:[ref('b')]};const b={...obj('b','RECORD'),evidenceRefs:[ref('a')]};
 const foreign={...obj('foreign','SOURCE'),tenantId:'other'};
 const wrong={...obj('wrong','RECORD'),sourceRefs:[{...ref('foreign'),version:'99'}]};
 const chain=buildSfiRealityChain({caseRecord:caseRecord(),objects:[a,b,foreign,wrong],t0,t1,readComplete:true});
 assert(chain.gaps.some(x=>x.startsWith('PROVENANCE_CYCLE')));assert(chain.gaps.some(x=>x.startsWith('UNRESOLVED_REFERENCE')));
 assert(chain.gaps.includes('FOREIGN_OBJECT_EXCLUDED'));assert(!chain.timeline.some(o=>o.ref.id==='foreign'));
});
test('absence of declared expectation is not a successful RETURN contrast',()=>{
 const input=fixture();input.actions[0].action.details={} as typeof input.actions[0]['action']['details'];
 const chain=buildSfiRealityChain(input);
 assert.equal(chain.returns[0].contrast,'PREDICTION_MISSING');assert.equal(chain.closure.certified,false);
});
test('complete synthetic chain links authority, execution, evidence, report and contradicted RETURN',()=>{
 const chain=buildSfiRealityChain(withReport(fixture()));
 assert.deepEqual(chain.gaps,[]);assert.equal(chain.returns[0].contrast,'CONTRADICTED');
 assert.equal(chain.closure.certified,true);assert.doesNotThrow(()=>assertSfiCaseClosure(chain));
 assert.equal(chain.components.length,12);assert.equal(chain.executionAuthority,false);assert.equal(chain.canonicalPromotion,false);
});
test('new data invalidates report binding, and simulated or unapproved execution cannot certify',()=>{
 const input=withReport(fixture());input.objects.push(obj('new','RECORD'));
 assert(buildSfiRealityChain(input).gaps.includes('REPORT_STALE_OR_UNBOUND'));
 const unapproved=withReport(fixture());unapproved.decisions=[];
 assert.equal(buildSfiRealityChain(unapproved).closure.certified,false);
 const simulated=withReport(fixture());simulated.objects.find(o=>o.kind==='RETURN')!.epistemicRole='SIMULATION';
 assert.equal(buildSfiRealityChain(simulated).closure.certified,false);
});
test('documented inconclusive report closes without fabricating evidence or RETURN',()=>{
 const input={caseRecord:caseRecord(),objects:[obj('source','SOURCE')],t0,t1,readComplete:true};
 const prior=buildSfiRealityChain(input);
 const report=assembleSfiReportV1({id:'report',caseRecord:input.caseRecord,generatedAt:t1,reconstruction:{contract:'SFI-CASE-RECONSTRUCTION-1.0',inputHash:prior.inputHash,t0,t1,narrative:prior.narrative,gaps:prior.gaps,nextObservation:prior.nextObservation,document:JSON.parse(JSON.stringify(prior))}});
 const ro={...obj('report','REPORT'),canonicalRef:{id:report.id,version:report.version,hash:hash(report)}};
 const chain=buildSfiRealityChain({...input,objects:[...input.objects,ro],reports:[report]});
 assert.doesNotThrow(()=>assertSfiCaseClosure(chain,'INCONCLUSIVE','Missing historical observations'));
 assert.equal(chain.closure.certified,false);assert.equal(chain.returns.length,0);
});
test('truncation, invalid windows and future inputs block certification',()=>{
 assert(buildSfiRealityChain({...fixture(),readComplete:false}).gaps.includes('READ_INCOMPLETE'));
 assert.throws(()=>buildSfiRealityChain({...fixture(),t0:t1,t1:t0}),/TEMPORAL_WINDOW_INVALID/);
 assert.throws(()=>buildSfiRealityChain({...fixture(),t0:'bad'}),/TEMPORAL_WINDOW_INVALID/);
 const input=withReport(fixture());input.objects.find(o=>o.kind==='INTERVENTION')!.observedAt='2026-01-04T00:00:00Z';
 assert.equal(buildSfiRealityChain(input).closure.certified,false);
});
test('printable Passport escapes source text and includes readable uncertainty and T0/T1',()=>{
 const input=fixture();input.caseRecord.scope='<script>alert(1)</script>';
 const chain=buildSfiRealityChain(input);const html=renderSfiRealityPassportHtml(chain);
 assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));assert.match(html,/T0/);assert.match(html,/T1/);assert.match(html,/Sin certificación/);
});

test('empty, rejected, and unrelated assessments cannot certify evidence',()=>{
 for(const payload of [{},{determinability:'UNDETERMINED',assessedBy:'operator',assessedAt:t0,rationale:'Insufficient'}, {determinability:'DETERMINED',assessedBy:'operator',assessedAt:t0,rationale:'Rejected',decision:'REJECTED'}]) {
   const input=fixture();input.objects.find(o=>o.kind==='EPISTEMIC_ASSESSMENT')!.payload=payload;
   assert.equal(buildSfiRealityChain(withReport(input)).closure.certified,false);
 }
 const input=fixture();input.objects.find(o=>o.kind==='EPISTEMIC_ASSESSMENT')!.evidenceRefs=[];
 assert.equal(buildSfiRealityChain(withReport(input)).closure.certified,false);
});

test('historical Git metadata reconstructs declared event time without backdating knowledge',()=>{
 const commit=obj('commit','RECORD',{committerDate:'2025-12-01T04:00:00Z',subjectLine:'Change recorded in source',commitUrl:'https://github.com/example/repo/commit/a'},'2026-01-02T00:00:00Z');
 const chain=buildSfiRealityChain({caseRecord:caseRecord(),objects:[commit],t0,t1,readComplete:true});
 assert.equal(chain.timeline[0].eventAt,'2025-12-01T04:00:00.000Z');
 assert.equal(chain.timeline[0].eventTimeBasis,'DECLARED_SOURCE_METADATA');
 assert.equal(chain.temporal.t0.objectRefs.length,0);
});

test('evidence adjudication displays accepted, rejected and pending verdicts separately',()=>{
 const input=fixture();assert.equal(buildSfiRealityChain(input).provenance.adjudications[0].state,'ACCEPTED');
 input.objects.find(o=>o.kind==='EPISTEMIC_ASSESSMENT')!.payload.decision='REJECTED';
 assert.equal(buildSfiRealityChain(input).provenance.adjudications[0].state,'REJECTED');
 input.objects.find(o=>o.kind==='EPISTEMIC_ASSESSMENT')!.payload={};
 assert.equal(buildSfiRealityChain(input).provenance.adjudications[0].state,'PENDING');
});
