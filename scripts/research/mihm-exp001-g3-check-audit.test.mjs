import assert from 'node:assert/strict';
import test from 'node:test';
import {CHECKS,stepOutcome,sourceCommands,audit,summarize} from './mihm-exp001-g3-check-audit.mjs';
const workflow='name: SFI Verify\njobs:\n  verify:\n    steps:\n      - name: Check domain boundaries\n        run: npm run check:boundaries\n      - name: Enforce canonical development preflight\n        run: node scripts/qa-canonical-architecture.mjs\n      - name: Verify ROOT graph and navigation convergence\n        run: npx tsx scripts/qa-sfi-root-graph-navigation.ts\n';
const good=(name)=>({name,status:'completed',conclusion:'success'});
const fail=(name)=>({name,status:'completed',conclusion:'failure'});
test('decode declared command, not causal inference',()=>{
 const c=sourceCommands(workflow);
 assert.equal(c['Check domain boundaries'],'npm run check:boundaries');
 assert.equal(c['Enforce canonical development preflight'],'node scripts/qa-canonical-architecture.mjs');
});
test('declared absent step stays absent',()=>{
 assert.equal(sourceCommands(workflow)['Verify bounded Neon continuity heartbeat fallback'],undefined);
});
test('successful step counted only after completed status',()=>{
 assert.equal(stepOutcome({steps:[good('Check domain boundaries')]},'Check domain boundaries').status,'PASS');
 assert.equal(stepOutcome({steps:[{...good('Check domain boundaries'),status:'in_progress'}]},'Check domain boundaries').status,'UNKNOWN');
});
test('failed named check cannot be turned into a successful job',()=>{
 assert.equal(stepOutcome({steps:[fail('Enforce canonical development preflight')]},'Enforce canonical development preflight').status,'FAIL');
});
test('skipped and absent must not be mislabeled failures',()=>{
 assert.equal(stepOutcome({steps:[{...good('Check domain boundaries'),conclusion:'skipped'}]},'Check domain boundaries').status,'SKIPPED');
 assert.equal(stepOutcome({steps:[]},'Check domain boundaries').status,'ABSENT');
});
test('missing/duplicate checks stay unknown',()=>{
 assert.equal(stepOutcome(null,CHECKS[0]).status,'UNKNOWN');
 assert.equal(stepOutcome({steps:[good(CHECKS[0]),good(CHECKS[0])]},CHECKS[0]).status,'UNKNOWN');
});
const cohort={
 records:[1,2].map((id)=>({
   eligibleForDescriptiveChronology:true,
   source:{workflowName:'SFI Verify',workflowRunId:id},
   group:{prNumber:id===1?100:101,commitSha:'sha'+id},
   chronology:{ciRunCreatedAt:'2026-10-10T01:00:00Z'},
   outcomeAsOfCutoff:{category:id===1?'FAILURE':'SUCCESS'}
 }))
};
function mock(){
 const calls={};
 for(const id of [1,2]){
  calls['/contents/.github/workflows/sfi-verify.yml?ref=sha'+id]={
    sha:'blob'+id,content:Buffer.from(workflow).toString('base64')};
  calls['/actions/runs/'+id+'/jobs?per_page=100']={jobs:[
    {name:'Verify SFI boundaries and build',conclusion:id===1?'failure':'success',
     steps:[good('Check domain boundaries'),
      id===1?fail('Enforce canonical development preflight'):good('Enforce canonical development preflight'),
      id===1?{name:'Verify ROOT graph and navigation convergence',status:'completed',conclusion:'skipped'}:
             good('Verify ROOT graph and navigation convergence')]
    }
  ],total_count:1};
 }
 return calls;
}
test('audit is source-grounded, read-only, preserves skipped and failed',async()=>{
 const calls=mock();
 const d=await audit(cohort,{get:async path=>{assert.ok(path in calls,path);return calls[path];}});
 assert.equal(d.summary.runs,2);
 assert.equal(d.summary.independentPrGroups,2);
 assert.equal(d.summary.sourceVersions,2);
 assert.equal(d.summary.byCheck['Enforce canonical development preflight'].fail,1);
 assert.equal(d.summary.byCheck['Verify ROOT graph and navigation convergence'].skipped,1);
 assert.equal(d.summary.byCheck['Check domain boundaries'].pass,2);
 assert.equal(d.summary.byCheck['Enforce canonical development preflight'].scientificEndpointAdmissible,false);
 assert.equal(d.validated,false);
 assert.equal(d.errors.length,0);
});
test('source read failure is explicit, job evidence remains separate',async()=>{
 const calls=mock();
 const d=await audit(cohort,{get:async path=>{
   if(path.includes('ref=sha1'))throw Error('SOURCE_PERMISSION_DENIED');
   return calls[path];}});
 assert.equal(d.summary.sourceReadFailures,1);
 assert.equal(d.records[0].checks['Check domain boundaries'].status,'PASS');
 assert.equal(d.records[0].workflowBlob,null);
 assert.equal(d.records[0].flags.includes('SOURCE_UNKNOWN'),true);
});
test('job read failure yields unknown rather than presumed success',async()=>{
 const calls=mock();
 const d=await audit(cohort,{get:async path=>{
   if(path.includes('/runs/1/'))throw Error('JOB_PERMISSION_DENIED');
   return calls[path];}});
 assert.equal(d.summary.jobReadFailures,1);
 assert.equal(d.records[0].checks['Check domain boundaries'].status,'UNKNOWN');
});
test('multiple runs in one PR are not independent',()=>{
 const rows=[{pr:100,workflowBlob:'a',checks:{},failedSteps:[]},{pr:100,workflowBlob:'b',checks:{},failedSteps:[]}];
 const s=summarize(rows);
 assert.equal(s.runs,2);
 assert.equal(s.independentPrGroups,1);
 assert.equal(s.sourceVersions,2);
});
