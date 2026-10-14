import assert from 'node:assert/strict';
import test from 'node:test';
import {makeUnit,collect,classifyConclusionAtCutoff} from './mihm-exp001-g2c-cohort.mjs';
const cutoff='2026-10-11T23:59:59Z';
const pr={number:300,created_at:'2026-10-09T08:00:00Z',html_url:'https://github.com/example/pull/300'};
const commit={sha:'ABC',commit:{committer:{date:'2026-10-09T09:00:00Z'}},
  files:[{filename:'src/index.ts',additions:3,deletions:2}],parents:[{}]};
const run={id:5,workflow_id:12,name:'SFI Verify',event:'pull_request',head_sha:'ABC',
  created_at:'2026-10-09T09:10:00Z',updated_at:'2026-10-09T09:12:00Z',
  status:'completed',conclusion:'failure'};
const unit=(override={})=>makeUnit({pr,commit,run:{...run,...override},cutoff});
test('outcome never enters pre-outcome features',()=>{
  const x=unit();assert.equal(x.outcomeAsOfCutoff.binaryLabel,1);
  assert.equal(x.preOutcomeFeatures.changedFiles,1);
  assert.ok(!('conclusion' in x.preOutcomeFeatures));
});
test('future completion must be censored even when final conclusion is known',()=>{
  const x=unit({updated_at:'2026-10-12T01:00:00Z'});
  assert.equal(x.outcomeAsOfCutoff.binaryLabel,null);
  assert.equal(x.outcomeAsOfCutoff.category,'UNKNOWN_OR_CENSORED');
});
test('cancellation is neither success nor failure',()=>{
  const x=unit({conclusion:'cancelled'});
  assert.equal(x.outcomeAsOfCutoff.category,'NONBINARY_CANCELLED');
  assert.equal(x.outcomeAsOfCutoff.binaryLabel,null);
});
test('missing completion time does not imply zero risk',()=>{
  assert.equal(classifyConclusionAtCutoff({...run,updated_at:null},cutoff).binaryLabel,null);
});
test('pre-PR CI run cannot be treated as this PR event',()=>{
  assert.equal(unit({created_at:'2026-10-08T01:00:00Z'}).preOutcomeFeatures,null);
});
test('mismatched SHA not admissible',()=>assert.equal(unit({head_sha:'OTHER'}).preOutcomeFeatures,null));
test('missing file inventory is not interpreted as no changed files',()=>{
  const x=makeUnit({pr,commit:{...commit,files:undefined},run,cutoff});
  assert.equal(x.preOutcomeFeatures,null);
});
test('incomplete API run pagination prohibits descriptive eligibility',()=>{
  const x=makeUnit({pr,commit,run,cutoff,runHistoryIncomplete:true});
  assert.equal(x.eligibleForDescriptiveChronology,false);
});
test('bounded commit sample is disclosed rather than presumed complete',()=>{
  const x=makeUnit({pr,commit,run,cutoff,commitCohortTruncated:true});
  assert.ok(x.flags.includes('PR_COMMITS_PARTIAL_SAMPLE'));
});
function mock(){
  return {
    '/pulls?state=all&sort=created&direction=desc&per_page=100&page=1':[
      {number:302,created_at:'2026-10-12T10:00:00Z',state:'closed'},
      {...pr,state:'open'},
      {number:299,created_at:'2026-10-08T10:00:00Z',state:'closed'}],
    '/pulls/300/commits?per_page=100&page=1':[{sha:'ABC'}],
    '/commits/ABC':commit,
    '/actions/runs?head_sha=ABC&per_page=100':{workflow_runs:[run],total_count:1},
    '/pulls/299/commits?per_page=100&page=1':[{sha:'DEF'}],
    '/commits/DEF':{...commit,sha:'DEF'},
    '/actions/runs?head_sha=DEF&per_page=100':{
      workflow_runs:[{...run,id:6,head_sha:'DEF',conclusion:'success'}],total_count:1}
  };
}
test('creation-date cohort admits open/closed but excludes future-created PRs',async()=>{
  const data=mock();
  const a=await collect({fetchJson:async path=>{assert.ok(path in data,path);return data[path];},
    targetPRs:5,maxPages:1,maxCommitsPerPR:2,cutoff});
  assert.equal(a.cohort.selectedPRs,2);
  assert.equal(a.counts.distinctPRs,2);
  assert.deepEqual(a.records.map(x=>x.group.prNumber).sort(),[299,300]);
  assert.equal(a.counts.observedBinaryOutcomes,2);
});
test('multiple CI workflows do not inflate independent PR groups',async()=>{
  const data=mock();
  data['/actions/runs?head_sha=ABC&per_page=100'].workflow_runs.push({...run,id:9,workflow_id:13,name:'Other'});
  const a=await collect({fetchJson:async x=>data[x],targetPRs:5,maxPages:1,maxCommitsPerPR:2,cutoff});
  assert.equal(a.counts.ciEntries,3);assert.equal(a.counts.distinctPRs,2);
});
test('incomplete CI pagination is excluded, not silently omitted',async()=>{
  const data=mock();data['/actions/runs?head_sha=ABC&per_page=100'].total_count=110;
  const a=await collect({fetchJson:async x=>data[x],targetPRs:5,maxPages:1,maxCommitsPerPR:2,cutoff});
  assert.equal(a.records[0].eligibleForDescriptiveChronology,false);
  assert.equal(a.counts.eligibleDescriptiveEntries,1);
});
test('old PR outside observation window excluded',async()=>{
  const data=mock();
  data['/pulls?state=all&sort=created&direction=desc&per_page=100&page=1']
    .push({number:200,created_at:'2026-09-10T01:00:00Z'});
  const a=await collect({fetchJson:async x=>data[x],targetPRs:5,maxPages:1,maxCommitsPerPR:2,cutoff});
  assert.equal(a.cohort.selectedPRs,2);
});
test('uniform date coverage includes middle and old PR rather than only most recent',async()=>{
  const cutoff='2026-10-11T23:59:59Z';
  const prs=[300,299,298,297,296].map((number,i)=>({
    number,created_at:'2026-10-0'+(9-i)+'T08:00:00Z'}));
  const replies={
    '/pulls?state=all&sort=created&direction=desc&per_page=100&page=1':prs
  };
  for(const number of [300,298,296]) {
    const sha='SHA'+number,created=prs.find(x=>x.number===number).created_at;
    replies['/pulls/'+number+'/commits?per_page=100&page=1']=[{sha}];
    replies['/commits/'+sha]={
      sha,commit:{committer:{date:created}},files:[{filename:'src/x.ts',additions:1,deletions:0}],parents:[{}]
    };
    replies['/actions/runs?head_sha='+sha+'&per_page=100']={
      workflow_runs:[{id:number,workflow_id:20,name:'CI',event:'pull_request',head_sha:sha,
        created_at:'2026-10-10T12:00:00Z',updated_at:'2026-10-10T12:05:00Z',
        status:'completed',conclusion:'success'}],total_count:1
    };
  }
  const a=await collect({fetchJson:async path=>{
    assert.ok(path in replies,'Unexpected API path: '+path);return replies[path];
  },targetPRs:3,maxPages:1,maxCommitsPerPR:1,cutoff});
  assert.equal(a.cohort.windowCandidatePRs,5);
  assert.equal(a.cohort.selectedPRs,3);
  assert.deepEqual(a.records.map(x=>x.group.prNumber),[300,298,296]);
  assert.equal(a.counts.distinctPRs,3);
});

test('PRs with no qualifying CI remain visible; not counted as successful CI',async()=>{
  const data=mock();
  data['/actions/runs?head_sha=DEF&per_page=100']={workflow_runs:[],total_count:0};
  const a=await collect({fetchJson:async p=>data[p],targetPRs:5,maxPages:1,
    maxCommitsPerPR:2,cutoff});
  assert.equal(a.counts.selectedPRsWithQualifyingCI,1);
  assert.equal(a.counts.selectedPRsWithoutQualifyingCI,1);
  const missing=a.selectedPrCoverage.find(x=>x.prNumber===299);
  assert.equal(missing.sourceObservation,'NO_QUALIFYING_CI_OBSERVED');
  assert.equal(a.counts.ciOutcomeCategories.SUCCESS??0,0);
});
test('mixed workflows are blocked from pooling as one scientific endpoint',async()=>{
  const data=mock();
  data['/actions/runs?head_sha=ABC&per_page=100'].workflow_runs.push(
    {...run,id:9,workflow_id:13,name:'Different Workflow'});
  const a=await collect({fetchJson:async p=>data[p],targetPRs:5,maxPages:1,
    maxCommitsPerPR:2,cutoff});
  assert.equal(a.byWorkflow.length,2);
  assert.ok(a.risk.shortfalls.includes('MIXED_WORKFLOWS_REQUIRE_ONE_PRECOMMITTED_TARGET'));
  assert.ok(a.risk.shortfalls.includes('TYPED_PRE_T0_MIHM_RELATIONS_NOT_COLLECTED'));
});
