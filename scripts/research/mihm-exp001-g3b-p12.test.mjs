import assert from 'node:assert/strict';
import test from 'node:test';
import {conventionalP12,guardEvidence,relationalView,evaluateSource,audit,summarize,STEP} from './mihm-exp001-g3b-p12.mjs';
const guard=[
  'const interfaceFile=/^src\\/(app\\/(?!api\\/).*\\/page\\.(ts|tsx)$|components\\/)/.test(r);',
  "if(/createServiceSupabaseClient|createClient\\s*\\([^)]*SUPABASE/i.test(s)) report('P12_INTERFACE_NO_SUPABASE',file,'detail');",
  'interfaceFile',
  "if(/\\.from\\s*\\(\\s*['\"][A-Za-z_][A-Za-z0-9_]*['\"]\\s*\\)/.test(s)) report('P12_INTERFACE_NO_RAW_TABLE_ACCESS',file,'detail');"
].join('\n');
const direct="import {createServiceSupabaseClient} from '@/runtime/supabase/server';\nconst db=createServiceSupabaseClient();\nawait db.from('sfi_publications');";
const clean="import {redirect} from 'next/navigation';\nexport default function Page(){redirect('/repository')}";
const cmd='node scripts/qa-canonical-architecture.mjs';
test('M0 reports both P12 conditions on contemporaneous source',()=>{
 const r=conventionalP12(direct);
 assert.deepEqual(r.flags,['P12_INTERFACE_NO_SUPABASE','P12_INTERFACE_NO_RAW_TABLE_ACCESS']);
});
test('M0 does not infer direct access for clean page',()=>{
 assert.equal(conventionalP12(clean).state,'NO_P12_MATCH_IN_THIS_PAGE');
});
test('M0 source unknown is not counted as a clean page',()=>{
 assert.equal(conventionalP12(null).state,'UNKNOWN');
});
test('guard absent marker does not invent a rule',()=>{
 assert.equal(guardEvidence('const unrelated=1').state,'NOT_EQUIVALENT_SOURCE');
 assert.equal(guardEvidence(null).state,'UNKNOWN');
});
test('guard with declared historical P12 rule is recognized',()=>{
 assert.equal(guardEvidence(guard).state,'P12_RULE_DECLARED');
});
test('named workflow command cannot be changed silently',()=>{
 const r=evaluateSource({workflowCommand:'different script',guardText:guard,pageText:direct,
   headSha:'sha1',pageBlob:'b1',guardBlob:'b2'});
 assert.equal(r.graph.state,'ABSTAIN');
 assert.equal(r.m0.state,'VIOLATION_CANDIDATE');
});
test('graph links two rule violations without claiming causality',()=>{
 const r=evaluateSource({workflowCommand:cmd,guardText:guard,pageText:direct,
   headSha:'sha1',pageBlob:'b1',guardBlob:'b2'});
 assert.equal(r.graph.state,'DOCUMENTED_DECLARED_CHAIN');
 assert.equal(r.graph.evidenceClass,'DERIVED');
 assert.ok(r.graph.edges.some(x=>x.type==='PAGE_HAS_FORBIDDEN_CLIENT_PATTERN'));
 assert.ok(r.graph.edges.every(x=>x.vintage==='HEAD_SHA_SOURCE_PROXY'));
});
test('unobserved page makes relational view abstain',()=>{
 const r=evaluateSource({workflowCommand:cmd,guardText:guard,pageText:null,
   headSha:'sha1',pageBlob:null,guardBlob:'b2'});
 assert.equal(r.graph.state,'ABSTAIN');
 assert.equal(r.t0Eligibility,'HISTORICAL_HEAD_SHA_PROXY_NOT_VERIFIED_AVAILABILITY');
});
test('summary groups repeated failures by PR, not number of runs',()=>{
 const records=[1,2].map(runId=>({pr:670,runId,pageBlob:'x',guardBlob:'y',
   observedPreflightOutcome:'FAIL',m0:{state:'VIOLATION_CANDIDATE'},
   guard:{state:'P12_RULE_DECLARED'},graph:{state:'DOCUMENTED_DECLARED_CHAIN'}}));
 const s=summarize(records);
 assert.equal(s.totalObservedRuns,2);
 assert.equal(s.groupCount,1);
 assert.deepEqual(s.sourceP12CandidatePRs,[670]);
 assert.equal(s.empiricalMIHMImprovement,'NOT_EVALUATED');
});
test('case replay derives outcomes only from supplied receipt after source audit',async()=>{
 const input={contract:'SFI-MIHM-EXP001-G3A-CHECK-FEASIBILITY-1.0',
  records:[
    {pr:670,sha:'abc',runId:7,t0:'2026-09-25T00:00:00Z',originalOutcome:'FAILURE',
      sourceCommands:{[STEP]:cmd},checks:{[STEP]:{status:'FAIL'}}},
    {pr:640,sha:'def',runId:8,t0:'2026-09-24T00:00:00Z',originalOutcome:'SUCCESS',
      sourceCommands:{[STEP]:cmd},checks:{[STEP]:{status:'PASS'}}}
  ]};
 const mk=(sha,path)=>{
   const text=path.includes('/page.tsx')?(sha==='abc'?direct:clean):guard;
   return {sha:path+'_'+sha,content:Buffer.from(text).toString('base64')};
 };
 const read=[];
 const out=await audit(input,{get:async p=>{
   read.push(p);
   const sha=decodeURIComponent(p.split('?ref=')[1]);
   return mk(sha,p);
 }});
 assert.equal(out.summary.totalObservedRuns,2);
 assert.equal(out.summary.githubApiRequests,4);
 assert.equal(out.summary.descriptiveMatchWithOverallPreflightStep.matched,2);
 assert.equal(out.summary.descriptiveMatchWithOverallPreflightStep.checked,2);
 assert.equal(out.validated,false);
 assert.equal(out.records[0].graph.state,'DOCUMENTED_DECLARED_CHAIN');
 assert.equal(out.records[1].m0.state,'NO_P12_MATCH_IN_THIS_PAGE');
 assert.ok(read.every(path=>path.includes('/contents/')));
});
test('API absence requires abstention, not false clean classification',async()=>{
 const input={contract:'SFI-MIHM-EXP001-G3A-CHECK-FEASIBILITY-1.0',
  records:[{pr:670,sha:'abc',runId:7,t0:'2026-09-25T00:00:00Z',originalOutcome:'FAILURE',
    sourceCommands:{[STEP]:cmd},checks:{[STEP]:{status:'FAIL'}}}]};
 const out=await audit(input,{get:async path=>{
  if(path.includes('/page.tsx'))throw Error('SOURCE_UNAVAILABLE');
  return {sha:'guardblob',content:Buffer.from(guard).toString('base64')};
 }});
 assert.equal(out.summary.abstentions,1);
 assert.equal(out.summary.sourceP12CandidateRuns,0);
 assert.equal(out.errors.length,1);
});
test('rejects a parent dataset that is not G3a receipt',async()=>{
 await assert.rejects(audit({contract:'OTHER',records:[]},{get:async()=>({})}),
   /INCORRECT_PARENT_G3A_CONTRACT/);
});
