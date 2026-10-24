import assert from 'node:assert/strict';
import { projectTimelineCaseHistory, type TimelineCaseHistoryBatch } from './timelineCaseHistory';
import { projectTimelineClockProfile } from './timelineClocks';

const when='2026-10-24T12:00:00.000Z', observed='2026-10-23T11:00:00.000Z';
const row=(id:string,caseId='case-a',tenantId='tenant-a')=>({
  id, case_id:caseId,tenant_id:tenantId,created_at:when,
});
const batch:TimelineCaseHistoryBatch = {
  objects:[
    {...row('record1'),object_kind:'SOURCE',epistemic_role:'SOURCE',canonical_ref:{id:'repo:source-1'},payload:{label:'Public source'},observed_at:observed},
    {...row('obs1'),object_kind:'OBSERVATION',epistemic_role:'RECORD',canonical_ref:{id:'repo:observation-1'},payload:{statement:'An observation, not independent verification'},observed_at:observed},
    {...row('intervention1'),object_kind:'INTERVENTION',epistemic_role:'RECORD',canonical_ref:{id:'repo:int-1'},payload:{outcome:'user claimed execution'},observed_at:observed},
    {...row('report-pointer'),object_kind:'REPORT',epistemic_role:'RECORD',canonical_ref:{id:'report:missing'},payload:{label:'not a report'},observed_at:null},
    {...row('foreign-object','case-b','tenant-b'),object_kind:'OBSERVATION',epistemic_role:'RECORD',observed_at:observed},
    {...row('forged-tenant','case-a','tenant-b'),object_kind:'RECORD',epistemic_role:'RECORD',observed_at:observed},
    {...row('bad-time'),object_kind:'RECORD',epistemic_role:'RECORD',created_at:'2026-10-24'},
  ],
  audits:[
    {...row('audit-1'),action:'CASE_OBJECT_RECORDED',actor_id:'actor-a'},
    {...row('foreign-audit','case-b','tenant-b'),action:'CASE_CREATED',actor_id:'actor-b'},
  ],
  proposals:[{...row('proposal1'),status:'APPROVED',risk_level:'LOW',proposed_by:'actor-a'}],
  decisions:[
    {...row('decision1'),proposal_id:'proposal1',authority_role:'OWNER',decided_by:'actor-a',decision:'APPROVE'},
    {...row('decision2'),proposal_id:'proposal1',authority_role:'VIEWER',decided_by:'actor-b',decision:'REJECT'},
  ],
  reports:[{...row('saved-report'),report_contract:'SFI-REPORT-1.0',generated_at:observed}],
};
const project=(b:TimelineCaseHistoryBatch,cs:ReadonlyMap<string,{tenantId:string;subject:string}>=new Map([
  ['case-a',{tenantId:'tenant-a',subject:'CASE A'}],
]))=>projectTimelineCaseHistory(b,cs,'SUPABASE_CANONICAL');
const items=project(batch);
assert.equal(items.length,9,'all nine genuine authorized and explicitly dated records');
assert.ok(items.every(item=>item.lane==='CASE'));
assert.ok(items.every(item=>item.href.startsWith('/reality-chain?caseId=case-a')));
assert.ok(items.find(x=>x.id==='case-object:obs1')?.href.includes('&objectId=obs1'));
assert.ok(items.find(x=>x.id==='case-audit:audit-1')?.href==='/reality-chain?caseId=case-a');
assert.ok(items.every(item=>item.origin.includes('SUPABASE_CANONICAL')));
assert.ok(!items.some(item=>item.id.includes('foreign')||item.id.includes('bad-time')));
const source=items.find(x=>x.id==='case-object:record1')!;
assert.ok(source.clockEvidence?.RECORD);
assert.equal(source.clockEvidence?.OBSERVATION,undefined,'SOURCE observed_at is not a verified independent observation');
const observation=items.find(x=>x.id==='case-object:obs1')!;
assert.equal(observation.clockEvidence?.OBSERVATION?.at,observed);
assert.equal(observation.clockEvidence?.RECORD?.at,when);
const clocks=projectTimelineClockProfile({eventId:observation.id,anchorAt:observation.at,anchorMeaning:observation.clockAnchorMeaning!,clocks:observation.clockEvidence});
assert.equal(clocks.readings.find(x=>x.clock==='OBSERVATION')?.state,'SOURCE_DATED');
assert.equal(clocks.readings.find(x=>x.clock==='KNOWLEDGE')?.state,'UNKNOWN');
assert.equal(clocks.readings.find(x=>x.clock==='EVENT')?.state,'UNKNOWN');
assert.equal(clocks.documentedIntervals.length,1);
const execution=items.find(x=>x.id==='case-object:intervention1')!;
assert.equal(execution.clockEvidence?.EXECUTION,undefined,'unverified intervention row is not execution receipt');
assert.equal(execution.clockEvidence?.RETURN,undefined);
const audit=items.find(x=>x.id==='case-audit:audit-1')!;
assert.equal(audit.clockEvidence?.AUTHORITY,undefined);
assert.equal(audit.clockEvidence?.EXECUTION,undefined);
assert.equal(audit.clockEvidence?.RETURN,undefined);
assert.ok(audit.subtitle.includes('actor-a'));
const proposal=items.find(x=>x.id==='case-proposal:proposal1')!;
assert.equal(proposal.clockEvidence?.AUTHORITY,undefined,'approved proposal state not authority');
const decision=items.find(x=>x.id==='case-decision:decision1')!;
assert.ok(decision.clockEvidence?.AUTHORITY,'OWNER decision row documents authority');
assert.equal(decision.clockEvidence?.EXECUTION,undefined);
const viewerDecision=items.find(x=>x.id==='case-decision:decision2')!;
assert.equal(viewerDecision.clockEvidence?.AUTHORITY,undefined,'VIEWER does not gain decision authority');
const pointer=items.find(x=>x.id==='case-object:report-pointer')!;
assert.match(pointer.title,/not a persisted report/);
const persisted=items.find(x=>x.id==='case-report:saved-report')!;
assert.match(persisted.title,/PERSISTED REPORT/);
assert.equal(persisted.clockEvidence?.RECORD?.at,when);
assert.equal(persisted.recordCreatedAt,undefined,'generated_at must not be mislabeled RECORD CREATED');
assert.match(persisted.subtitle,/Report generated_at metadata/);
assert.equal(project(batch,new Map()).length,0);
assert.equal(project(batch,new Map([['case-a',{tenantId:'tenant-b',subject:'FORGED'}]])).length,1,
  'a forged tenant association must never expose a row belonging to tenant-a; only the deliberately injected wrong-tenant record remains');
assert.equal(project(batch,new Map([['case-b',{tenantId:'tenant-b',subject:'CASE B'}]])).length,2,
  'only source object and audit belonging to case-b may be visible');
console.log('PASS MIHM-T CASE HISTORY: 9 records scoped; audit, observation, authority and report epistemic boundaries; no foreign rows');
