/**
 * MIHM-EXP-001 G3b — P12 evidence chain and matched-rule baseline.
 * Investigates ONLY the known publications route P12 case. Descriptive, post-hoc.
 * Never call the relational document view an MIHM score or predictive model.
 * Usage: GITHUB_TOKEN=... node scripts/research/mihm-exp001-g3b-p12.mjs <g3a-json>
 */
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

export const PAGE='src/app/publications/page.tsx';
export const GUARD='scripts/qa-canonical-architecture.mjs';
export const STEP='Enforce canonical development preflight';
const RULE_A='P12_INTERFACE_NO_SUPABASE';
const RULE_B='P12_INTERFACE_NO_RAW_TABLE_ACCESS';
const DECLARED_CMD='node scripts/qa-canonical-architecture.mjs';

/** Exact input-side lexical predicates from the historical canonical preflight, limited to the one known page. */
export function conventionalP12(pageText){
  if(typeof pageText!=='string')return {state:'UNKNOWN',flags:[],reason:'PAGE_SOURCE_UNOBSERVED'};
  const flags=[];
  if(/createServiceSupabaseClient|createClient\s*\([^)]*SUPABASE/i.test(pageText))flags.push(RULE_A);
  if(/\.from\s*\(\s*['"][A-Za-z_][A-Za-z0-9_]*['"]\s*\)/.test(pageText))flags.push(RULE_B);
  return {state:flags.length?'VIOLATION_CANDIDATE':'NO_P12_MATCH_IN_THIS_PAGE',flags,
    reason:'SOURCE_TEXT_MATCHED_HISTORICAL_RULE'};
}
export function guardEvidence(guardText){
  if(typeof guardText!=='string')return {state:'UNKNOWN',reason:'GUARD_SOURCE_UNOBSERVED'};
  const required=[RULE_A,RULE_B,'interfaceFile','createServiceSupabaseClient'];
  const missing=required.filter(marker=>!guardText.includes(marker));
  return {state:missing.length?'NOT_EQUIVALENT_SOURCE':'P12_RULE_DECLARED',
    missingMarkers:missing,reason:'GUARD_DECLARATION_NOT_RUNTIME_PROOF'};
}
export function relationalView({workflowCommand,guard,page,headSha,guardBlob,pageBlob}){
  if(workflowCommand!==DECLARED_CMD || guard.state!=='P12_RULE_DECLARED' || page.state==='UNKNOWN'){
    return {state:'ABSTAIN',edges:[],reason:'SOURCE_OR_RULE_CHAIN_INCOMPLETE'};
  }
  const common={sourceRevision:headSha,vintage:'HEAD_SHA_SOURCE_PROXY',evidenceClass:'OBSERVED'};
  const edges=[
    {type:'WORKFLOW_DECLARED_INVOKES',from:'SFI Verify/'+STEP,to:GUARD, ...common},
    {type:'GUARD_DECLARED_ENFORCES',from:GUARD,to:RULE_A,guardBlob,...common},
    {type:'GUARD_DECLARED_ENFORCES',from:GUARD,to:RULE_B,guardBlob,...common},
    {type:'RULE_SCOPES_PATH',from:'P12_ARCHITECTURAL_CONSTRAINT',to:PAGE,guardBlob,...common},
    {type:'SOURCE_REVISION',from:PAGE,to:'blob:'+pageBlob,...common}
  ];
  if(page.flags.includes(RULE_A))edges.push({
    type:'PAGE_HAS_FORBIDDEN_CLIENT_PATTERN',from:PAGE,to:RULE_A,pageBlob,...common});
  if(page.flags.includes(RULE_B))edges.push({
    type:'PAGE_HAS_RAW_TABLE_PATTERN',from:PAGE,to:RULE_B,pageBlob,...common});
  return {state:'DOCUMENTED_DECLARED_CHAIN',edges,
    evidenceClass:'DERIVED',reason:'TYPED_SOURCE_RELATIONSHIPS_NOT_MIHM_CAUSAL_GRAPH'};
}
/** Source is per immutable commit revision; never feed CI outcomes into these two methods. */
export function evaluateSource({workflowCommand,guardText,pageText,headSha,guardBlob,pageBlob}){
  const m0=conventionalP12(pageText),guard=guardEvidence(guardText);
  const graph=relationalView({workflowCommand,guard,page:m0,headSha,guardBlob,pageBlob});
  return {m0,guard,graph,
    t0Eligibility:'HISTORICAL_HEAD_SHA_PROXY_NOT_VERIFIED_AVAILABILITY'};
}
export function summarize(records,errors=[],apiRequests=0){
  const supported=records.filter(x=>x.m0.state!=='UNKNOWN'&&x.guard.state==='P12_RULE_DECLARED'&&
    x.graph.state==='DOCUMENTED_DECLARED_CHAIN');
  const abstained=records.filter(x=>!supported.includes(x));
  const candidates=supported.filter(x=>x.m0.state==='VIOLATION_CANDIDATE');
  const nonMatches=supported.filter(x=>x.m0.state==='NO_P12_MATCH_IN_THIS_PAGE');
  const positivePrs=[...new Set(candidates.map(x=>x.pr))];
  const factualFailedRows=records.filter(x=>x.observedPreflightOutcome==='FAIL');
  const failurePrs=[...new Set(factualFailedRows.map(x=>x.pr))];
  const agreementRows=supported.filter(x=>x.observedPreflightOutcome==='PASS'||
    x.observedPreflightOutcome==='FAIL');
  const match=agreementRows.filter(x=>
    (x.m0.state==='VIOLATION_CANDIDATE')===(x.observedPreflightOutcome==='FAIL'));
  return {
    totalObservedRuns:records.length,groupCount:new Set(records.map(x=>x.pr)).size,
    supportedSourceChains:supported.length,abstentions:abstained.length,
    sourceP12CandidateRuns:candidates.length,sourceP12NoMatchRuns:nonMatches.length,
    sourceP12CandidatePRs:positivePrs,observedFailedPreflightPRs:failurePrs,
    descriptiveMatchWithOverallPreflightStep:{matched:match.length,checked:agreementRows.length,
      warning:'POSTHOC_REPLAY_ON_ONE_PAGE; NOT_SCIENTIFIC_ACCURACY_OR_P12_SPECIFIC_GROUND_TRUTH'},
    distinctPageBlobs:new Set(records.map(x=>x.pageBlob).filter(Boolean)).size,
    distinctGuardBlobs:new Set(records.map(x=>x.guardBlob).filter(Boolean)).size,
    githubApiRequests:apiRequests,fetchErrors:errors.length,
    comparatorFinding:'RULE_M0_ALREADY_HAS_P12_PATTERNS; RELATIONAL_DOCUMENT_VIEW_HAS_NO_DEMONSTRATED_INCREMENTAL_PREDICTIVE_SKILL',
    empiricalMIHMImprovement:'NOT_EVALUATED',heldoutCases:0,scientificReturn:'NOT_MINTED'
  };
}
export async function audit(g3a,{get}){
  if(g3a.contract!=='SFI-MIHM-EXP001-G3A-CHECK-FEASIBILITY-1.0')
    throw Error('INCORRECT_PARENT_G3A_CONTRACT');
  const inputs=g3a.records??[],records=[],errors=[],cache=new Map();
  let apiRequests=0;
  async function source(path,sha){
    const key=path+'@'+sha;
    if(cache.has(key))return cache.get(key);
    apiRequests++;
    const result=await get('/contents/'+path+'?ref='+encodeURIComponent(sha));
    if(typeof result.content!=='string'||!result.sha)throw Error('SOURCE_CONTENT_OR_BLOB_MISSING');
    const data={blob:result.sha,text:Buffer.from(result.content.replace(/\s/g,''),'base64').toString('utf8')};
    cache.set(key,data);return data;
  }
  for(const row of inputs){
    if(row.originalOutcome==='UNKNOWN')continue;
    const sha=row.sha,pr=row.pr,runId=row.runId;
    const record={pr,sha,runId,runUrl:'https://github.com/Aptymok/system-friction/actions/runs/'+runId,
      t0:row.t0,preflightDeclaredCommand:row.sourceCommands?.[STEP]??null,
      observedPreflightOutcome:row.checks?.[STEP]?.status??'UNKNOWN',
      pageBlob:null,guardBlob:null,
      m0:{state:'UNKNOWN',flags:[],reason:'NOT_FETCHED'},
      guard:{state:'UNKNOWN',reason:'NOT_FETCHED'},
      graph:{state:'ABSTAIN',edges:[],reason:'NOT_FETCHED'},
      flags:['POSTHOC_KNOWN_CASE','CI_HEAD_SHA_NOT_PROVEN_EXECUTED_MERGE_REF','GITHUB_COMMIT_AUTHOR_DATE_NOT_PUSH_RECEIPT']};
    let guardText=null,pageText=null;
    try{const s=await source(GUARD,sha);guardText=s.text;record.guardBlob=s.blob;}
    catch(e){errors.push({runId,pr,stage:'GUARD',reason:String(e.message??e).slice(0,130)});}
    try{const s=await source(PAGE,sha);pageText=s.text;record.pageBlob=s.blob;}
    catch(e){errors.push({runId,pr,stage:'PAGE',reason:String(e.message??e).slice(0,130)});}
    Object.assign(record,evaluateSource({workflowCommand:record.preflightDeclaredCommand,
      guardText,pageText,headSha:sha,guardBlob:record.guardBlob,pageBlob:record.pageBlob}));
    // Only append outcome after source is scored; it is never used by either M0 or graph.
    record.outcomeComparisonScope='OVERALL_PREFLIGHT_STEP_NOT_P12_RULE_LEVEL';
    records.push(record);
  }
  return {
    contract:'SFI-MIHM-EXP001-G3B-P12-RELATIONAL-SOURCE-TRACE-1.0',
    classification:'DERIVED',researchPhase:'EXPLORATORY_POST_HOC',validated:false,
    generatedAt:new Date().toISOString(),
    fixedInputArtifact:{githubRunId:38547376017,githubArtifactId:11884937440,
      zipSha256:'2bd9b3c34f7d3fd8de50ef43a7bf77b73527b32b04a6bacee101a4c48273c383'},
    source:'Immutable GitHub source blobs at CI head SHA, G3a job-step receipts',
    population:'ONE_KNOWN_PUBLICATIONS_PAGE_ONLY_NO_REPOSITORY_WIDE_CLAIMS',
    summary:summarize(records,errors,apiRequests),errors,
    limitations:[
      'This was selected AFTER historical failures were seen: no blinded prediction or prospective inference.',
      'Source input is at HEAD commit SHA and has no independent attestation of push time or executed merge-ref contents.',
      'M0 faithfully reproduces the same P12 lexical rules already available in canonical CI.',
      'Typed documentary edges are not a validated MIHM causal law, topology, Phi calculation or improvement.',
      'Overall preflight job result may fail for reasons outside P12 and is not P12-specific ground truth.',
      'One known publication page is not a complete repository inventory, and absent source is abstention.',
      'Repeated PR runs are not independent; no claims about accuracy, calibration or statistical advantage.'
    ],records
  };
}
async function main(){
  const file=process.argv[2],token=process.env.GITHUB_TOKEN??process.env.GH_TOKEN;
  if(!file||!token){console.error('G3A_JSON_AND_GITHUB_TOKEN_REQUIRED');process.exitCode=2;return;}
  const input=JSON.parse(fs.readFileSync(file,'utf8'));
  const get=async path=>{
    const res=await fetch('https://api.github.com/repos/Aptymok/system-friction'+path,{
      headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,
        'X-GitHub-Api-Version':'2022-11-28','User-Agent':'SFI-MIHM-G3B-P12'}});
    if(!res.ok)throw Error('GITHUB_'+res.status+'_'+path.split('?')[0]);
    return res.json();
  };
  process.stdout.write(JSON.stringify(await audit(input,{get}),null,2)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
  main().catch(e=>{console.error(e.message);process.exitCode=1;});
