import assert from 'node:assert/strict';
import test from 'node:test';
import {makeEntryUnit,collect} from './mihm-exp001-timezero.mjs';
const cutoff='2026-10-11T23:59:59Z', sha='abcdef123';
const commit={sha,commit:{committer:{date:'2026-10-10T10:00:00Z'}},parents:[{sha:'parent'}],
  files:[{filename:'src/a.ts',additions:2,deletions:1}]};
const run={id:1,head_sha:sha,workflow_id:12,name:'SFI Verify',event:'pull_request',
  created_at:'2026-10-10T10:01:00Z',updated_at:'2026-10-10T10:05:00Z',
  status:'completed',conclusion:'failure'};
const unit=(changes={})=>makeEntryUnit({prNumber:20,commit,run:{...run,...changes},cutoff});
test('eventual failure never becomes a forecast feature',()=>{
  const x=unit(); assert.equal(x.preOutcomeFeatures.changedFiles,1);
  assert.equal(x.preOutcomeFeatures.priorSameShaWorkflowFailureCount,0);
  assert.equal(x.outcomeAudit.conclusion,'failure');
  assert.equal(x.eligibleForProspectiveScientificValidation,false);
});
test('future commit date blocks entry',()=>{
  const x=makeEntryUnit({prNumber:20,commit:{...commit,commit:{committer:{date:'2026-10-12T10:00:00Z'}}},run,cutoff});
  assert.equal(x.preOutcomeFeatures,null);
});
test('mismatched commit SHA blocks entry',()=>assert.equal(unit({head_sha:'wrong'}).preOutcomeFeatures,null));
test('run after cutoff blocks entry',()=>assert.equal(unit({created_at:'2026-10-12T10:00:00Z'}).preOutcomeFeatures,null));
test('missing commit file list does not become zero',()=>{
  const x=makeEntryUnit({prNumber:20,commit:{...commit,files:undefined},run,cutoff});
  assert.equal(x.preOutcomeFeatures,null);
});
test('only previously finished same-workflow runs are input features',()=>{
  const past={...run,id:2,created_at:'2026-10-10T09:00:00Z',updated_at:'2026-10-10T09:10:00Z'};
  const late={...run,id:3,created_at:'2026-10-10T09:00:00Z',updated_at:'2026-10-10T10:04:00Z'};
  const x=makeEntryUnit({prNumber:20,commit,run,cutoff,priorRuns:[past,late]});
  assert.equal(x.preOutcomeFeatures.priorSameShaWorkflowFailureCount,1);
});
test('collector uses historical commits rather than final PR head',async()=>{
  const replies={
    '/pulls?state=closed&sort=created&direction=desc&per_page=1':[{number:20,created_at:'2026-10-10T09:00:00Z',head:{sha:'NOT_HISTORICAL'}}],
    '/pulls/20/commits?per_page=1':[{sha}],
    [`/commits/${sha}`]:commit,
    [`/actions/runs?head_sha=${sha}&per_page=100`]:{workflow_runs:[run],total_count:1}
  };
  const out=await collect({fetchJson:async p=>{assert.ok(p in replies,p);return replies[p];},maxPrs:1,maxCommits:1,cutoff});
  assert.equal(out.records[0].source.commitSha,sha);
  assert.equal(out.counts.prospectiveValidations,0);
});
test('incomplete run pagination prohibits admissibility',async()=>{
  const many=Array.from({length:100},(_,i)=>({...run,id:i+1}));
  const replies={
    '/pulls?state=closed&sort=created&direction=desc&per_page=1':[{number:20,created_at:'2026-10-10T09:00:00Z'}],
    '/pulls/20/commits?per_page=1':[{sha}],
    [`/commits/${sha}`]:commit,
    [`/actions/runs?head_sha=${sha}&per_page=100`]:{workflow_runs:many,total_count:101}
  };
  const out=await collect({fetchJson:async p=>replies[p],maxPrs:1,maxCommits:1,cutoff});
  assert.equal(out.records[0].eligibleForExploratoryCiEntryReconstruction,false);
});