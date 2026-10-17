/** MIHM-EXP-001 G2c — exploratory independent-PR chronology audit.
 * Read-only GitHub PR/commit/Actions metadata. NOT validation, model fit, or RETURN.
 * GITHUB_TOKEN=... node scripts/research/mihm-exp001-g2c-cohort.mjs > audit.json
 */
import { pathToFileURL } from 'node:url';
const DEFAULT_START='2026-09-15T00:00:00Z', DEFAULT_CUTOFF='2026-10-11T23:59:59Z';
const stamp=x=>typeof x==='string' && Number.isFinite(Date.parse(x))?Date.parse(x):null;
export const atOrBefore=(a,b)=>stamp(a)!==null && stamp(b)!==null && stamp(a)<=stamp(b);
const before=(a,b)=>stamp(a)!==null && stamp(b)!==null && stamp(a)<stamp(b);
const bounded=(x,d,max)=>Number.isInteger(Number(x)) && Number(x)>=1?Math.min(Number(x),max):d;
export function classifyConclusionAtCutoff(run,cutoff) {
  // updated_at is an upper bound, not a verified run completion timestamp.
  if(run?.status!=='completed' || !atOrBefore(run?.updated_at,cutoff))
    return {category:'UNKNOWN_OR_CENSORED',binaryLabel:null,reason:'UNVERIFIED_AS_OF_CUTOFF'};
  if(run.conclusion==='success')return {category:'SUCCESS',binaryLabel:0,reason:'GITHUB_CI'};
  if(run.conclusion==='failure')return {category:'FAILURE',binaryLabel:1,reason:'GITHUB_CI'};
  if(run.conclusion===null || run.conclusion===undefined)
    return {category:'UNKNOWN_OR_CENSORED',binaryLabel:null,reason:'CONCLUSION_MISSING'};
  return {category:'NONBINARY_'+String(run.conclusion).toUpperCase().replace(/[^A-Z_]/g,''),binaryLabel:null,reason:'NOT_BINARY'};
}
export function makeUnit({pr,commit,run,cutoff,commitCohortTruncated=false,runHistoryIncomplete=false}) {
  const sha=commit?.sha??null,t0=run?.created_at??null,committedAt=commit?.commit?.committer?.date??null;
  const files=commit?.files,flags=[];
  if(!atOrBefore(pr?.created_at,t0))flags.push('PR_CREATION_VINTAGE_INVALID');
  if(!atOrBefore(committedAt,t0))flags.push('COMMIT_TIME_NOT_PRE_T0');
  if(!atOrBefore(t0,cutoff))flags.push('CI_ENTRY_AFTER_CUTOFF');
  if(run?.head_sha!==sha)flags.push('RUN_SHA_MISMATCH');
  if(run?.event!=='pull_request')flags.push('NOT_PR_EVENT');
  if(!run?.workflow_id || !run?.id)flags.push('WORKFLOW_ID_MISSING');
  if(!Array.isArray(files))flags.push('FILES_UNKNOWN_NOT_ZERO');
  if(Array.isArray(files) && files.length>=300)flags.push('COMMIT_FILE_LIST_MAY_BE_TRUNCATED');
  if(commitCohortTruncated)flags.push('PR_COMMITS_PARTIAL_SAMPLE');
  if(runHistoryIncomplete)flags.push('CI_RUN_PAGINATION_INCOMPLETE');
  const exclude=new Set(['PR_CREATION_VINTAGE_INVALID','COMMIT_TIME_NOT_PRE_T0','CI_ENTRY_AFTER_CUTOFF',
    'RUN_SHA_MISMATCH','NOT_PR_EVENT','WORKFLOW_ID_MISSING','FILES_UNKNOWN_NOT_ZERO',
    'COMMIT_FILE_LIST_MAY_BE_TRUNCATED','CI_RUN_PAGINATION_INCOMPLETE']);
  const eligible=!flags.some(x=>exclude.has(x));
  const cats={tests:0,documentation:0,workflows:0,other:0};
  for(const f of Array.isArray(files)?files:[]) {
    const n=String(f?.filename??'');
    if(n.includes('/test/')||n.includes('/tests/')||n.includes('/__tests__/')||n.includes('.test.')||n.includes('.spec.'))cats.tests++;
    else if(n.startsWith('docs/')||n.endsWith('.md'))cats.documentation++;
    else if(n.startsWith('.github/workflows/'))cats.workflows++;
    else cats.other++;
  }
  return {
    unitKey:'PR-'+(pr?.number??'UNKNOWN')+'/'+(sha??'UNKNOWN')+'/'+(run?.workflow_id??'UNKNOWN')+'/'+(run?.id??'UNKNOWN'),
    group:{prNumber:pr?.number??null,commitSha:sha,workflowId:run?.workflow_id??null},
    source:{prUrl:pr?.html_url??null,commitUrl:commit?.html_url??null,runUrl:run?.html_url??null,
      workflowRunId:run?.id??null,workflowName:run?.name??null},
    chronology:{prCreatedAt:pr?.created_at??null,commitDeclaredAt:committedAt,
      ciRunCreatedAt:t0,ciRunLastUpdatedAt:run?.updated_at??null},
    preOutcomeFeatures:eligible?{
      changedFiles:files.length,additions:files.reduce((n,f)=>n+(Number(f.additions)||0),0),
      deletions:files.reduce((n,f)=>n+(Number(f.deletions)||0),0),
      filesByCategory:cats,parentCount:Array.isArray(commit?.parents)?commit.parents.length:null
    }:null,
    outcomeAsOfCutoff:classifyConclusionAtCutoff(run,cutoff),
    eligibleForDescriptiveChronology:eligible,eligibleForScientificIndependentHoldout:false,
    flags:[...flags,'RETROSPECTIVE_COHORT','CI_CREATED_AT_IS_T0_PROXY_NOT_ACTOR_KNOWLEDGE']
  };
}
/** Select on PR creation date ONLY, not closed/merged/failure status. */
export async function collect({fetchJson,start=DEFAULT_START,cutoff=DEFAULT_CUTOFF,
    targetPRs=24,maxPages=8,maxCommitsPerPR=3}) {
  if(!before(start,cutoff))throw Error('INVALID_OBSERVATION_WINDOW');
  targetPRs=bounded(targetPRs,24,40);maxPages=bounded(maxPages,8,12);
  maxCommitsPerPR=bounded(maxCommitsPerPR,3,8);
  let requestCount=0,pagesScanned=0,reachedWindowEnd=false;
  const warnings=[],errors=[],candidates=[],records=[];
  const api=async path=>{requestCount++;return fetchJson(path);};
  for(let page=1;page<=maxPages;page++) {
    const list=await api('/pulls?state=all&sort=created&direction=desc&per_page=100&page='+page);
    pagesScanned++;
    if(!Array.isArray(list))throw Error('PR_LIST_INVALID');
    if(!list.length){reachedWindowEnd=true;break;}
    for(const pr of list) {
      if(!pr.number || !atOrBefore(pr.created_at,cutoff))continue;
      if(before(pr.created_at,start)){reachedWindowEnd=true;break;}
      candidates.push(pr);
    }
    if(reachedWindowEnd || list.length<100){reachedWindowEnd=true;break;}
  }
  if(!reachedWindowEnd)warnings.push('PR_COHORT_WINDOW_NOT_FULLY_SCANNED');
  // Uniform indices across all window-eligible PRs; never select by CI outcome or current PR state.
  const prs=candidates.length<=targetPRs?candidates:
    Array.from({length:targetPRs},(_,i)=>candidates[
      Math.floor(i*(candidates.length-1)/Math.max(1,targetPRs-1))]);
  for(const pr of prs) {
    let commits;
    try{commits=await api('/pulls/'+pr.number+'/commits?per_page=100&page=1');}
    catch(e){errors.push({prNumber:pr.number,stage:'COMMITS',error:String(e.message??e).slice(0,100)});continue;}
    if(!Array.isArray(commits)){errors.push({prNumber:pr.number,stage:'COMMITS',error:'INVALID_LIST'});continue;}
    if(commits.length===100)warnings.push('PR-'+pr.number+':COMMIT_PAGINATION_NOT_PROVEN_COMPLETE');
    const truncated=commits.length>maxCommitsPerPR || commits.length===100;
    for(const item of commits.slice(0,maxCommitsPerPR)) {
      if(!item.sha)continue;
      try{
        const commit=await api('/commits/'+item.sha);
        if(!atOrBefore(commit?.commit?.committer?.date,cutoff))continue;
        const result=await api('/actions/runs?head_sha='+item.sha+'&per_page=100');
        const runs=Array.isArray(result.workflow_runs)?result.workflow_runs:[];
        const incomplete=runs.length>=100 || Number(result.total_count??0)>runs.length;
        if(incomplete)warnings.push(item.sha+':CI_PAGINATION_NOT_PROVEN_COMPLETE');
        const selected=new Map();
        const ordered=runs.filter(x=>x.head_sha===item.sha && x.event==='pull_request' &&
          atOrBefore(x.created_at,cutoff) && atOrBefore(pr.created_at,x.created_at))
          .sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at));
        for(const x of ordered)if(x.workflow_id && !selected.has(x.workflow_id))selected.set(x.workflow_id,x);
        for(const run of selected.values())records.push(makeUnit({
          pr,commit,run,cutoff,commitCohortTruncated:truncated,runHistoryIncomplete:incomplete
        }));
      }catch(e){errors.push({prNumber:pr.number,commitSha:item.sha,
        stage:'COMMIT_OR_RUN',error:String(e.message??e).slice(0,100)});}
    }
  }
  const eligible=records.filter(x=>x.eligibleForDescriptiveChronology);
  const deduped=[...new Map(eligible.map(x=>[x.unitKey,x])).values()];
  const distinctPRs=new Set(deduped.map(x=>x.group.prNumber)).size;
  const distinctCommits=new Set(deduped.map(x=>x.group.commitSha)).size;
  const binary=deduped.filter(x=>x.outcomeAsOfCutoff.binaryLabel!==null);
  const outcomes={};
  for(const x of deduped)outcomes[x.outcomeAsOfCutoff.category]=(outcomes[x.outcomeAsOfCutoff.category]??0)+1;
  const selectedPrCoverage=prs.map(pr=>{
    const n=records.filter(row=>row.group.prNumber===pr.number).length;
    const sourceError=errors.some(e=>e.prNumber===pr.number);
    return {prNumber:pr.number,prCreatedAt:pr.created_at??null,ciEntries:n,
      sourceObservation:sourceError?'SOURCE_FETCH_ERROR':n?'QUALIFYING_CI_OBSERVED':'NO_QUALIFYING_CI_OBSERVED'};
  });
  const byWorkflow=[...new Set(deduped.map(x=>x.source.workflowName))].sort().map(name=>{
    const rows=deduped.filter(x=>x.source.workflowName===name);
    return {name,ciEntries:rows.length,distinctPRs:new Set(rows.map(x=>x.group.prNumber)).size,
      distinctFailurePRs:new Set(rows.filter(x=>x.outcomeAsOfCutoff.binaryLabel===1)
        .map(x=>x.group.prNumber)).size,
      success:rows.filter(x=>x.outcomeAsOfCutoff.category==='SUCCESS').length,
      failure:rows.filter(x=>x.outcomeAsOfCutoff.category==='FAILURE').length};
  });
  const shortfalls=[];
  if(distinctPRs<10)shortfalls.push('FEWER_THAN_10_DISTINCT_PR_GROUPS');
  if(!binary.some(x=>x.outcomeAsOfCutoff.binaryLabel===1))shortfalls.push('NO_OBSERVED_FAILURE');
  if(!binary.some(x=>x.outcomeAsOfCutoff.binaryLabel===0))shortfalls.push('NO_OBSERVED_SUCCESS');
  if(errors.length)shortfalls.push('SOURCE_FETCH_ERRORS');
  if(byWorkflow.length>1)shortfalls.push('MIXED_WORKFLOWS_REQUIRE_ONE_PRECOMMITTED_TARGET');
  shortfalls.push('TYPED_PRE_T0_MIHM_RELATIONS_NOT_COLLECTED');
  return {
    contract:'SFI-MIHM-EXP001-G2C-INDEPENDENCE-AUDIT-1.0',epistemicClass:'DERIVED',
    validation:'NOT_PERFORMED',frozenProtocol:false,generatedAt:new Date().toISOString(),
    source:'GitHub PR/commit/Actions event metadata only',
    cohort:{start,cutoff,targetPRs,maxPages,maxCommitsPerPR,windowCandidatePRs:candidates.length,selectedPRs:prs.length,
      selection:'Uniformly spaced PR creation dates across eligible study window, outcome-blind; first K commits per PR; earliest CI per SHA/workflow'},
    counts:{ciEntries:records.length,eligibleDescriptiveEntries:deduped.length,distinctPRs,distinctCommits,
      observedBinaryOutcomes:binary.length,ciOutcomeCategories:outcomes,heldoutScientificValidations:0,
      selectedPRsWithQualifyingCI:selectedPrCoverage.filter(x=>x.ciEntries>0).length,
      selectedPRsWithoutQualifyingCI:selectedPrCoverage.filter(x=>x.ciEntries===0).length},
    risk:{scientificGate:'G2C_DESCRIPTIVE_ONLY',empiricalMIHMImprovement:'NOT_OBSERVED',shortfalls},
    apiRequestCount:requestCount,pagesScanned,selectionScannedToWindowEnd:reachedWindowEnd,
    selectedPrCoverage,byWorkflow,
    limitations:[
      'PR commit lists and currently returned metadata may reflect later changes.',
      'GitHub timestamps do not verify actor knowledge or push-time provenance.',
      'CI updated_at is a conservative upper bound, not an exact completion receipt.',
      'PR groups, commits and CI workflows are clustered, not independent observations.',
      'First K historical commits per PR create a bounded and potentially biased sample.',
      'Missing PR-level CI is unknown eligibility, not evidence of successful CI.',
      'No model fit, matched comparator, frozen protocol, blind holdout or RETURN.',
      'No raw logs, source code or secret-bearing metadata are harvested.'
    ],warnings,errors,records
  };
}
async function main() {
  const token=process.env.GITHUB_TOKEN??process.env.GH_TOKEN;
  if(!token){console.error('GITHUB_TOKEN_REQUIRED');process.exitCode=2;return;}
  const fetchJson=async path=>{
    const response=await fetch('https://api.github.com/repos/Aptymok/system-friction'+path,{
      headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,
        'X-GitHub-Api-Version':'2022-11-28','User-Agent':'SFI-MIHM-EXP001-G2C'}});
    if(!response.ok)throw Error('GITHUB_'+response.status+'_'+path.split('?')[0]);
    return response.json();
  };
  const result=await collect({fetchJson,
    start:process.env.MIHM_G2C_START??DEFAULT_START,cutoff:process.env.MIHM_G2C_CUTOFF??DEFAULT_CUTOFF,
    targetPRs:bounded(process.env.MIHM_G2C_PR_LIMIT??24,24,40),
    maxPages:bounded(process.env.MIHM_G2C_PAGE_LIMIT??8,8,12),
    maxCommitsPerPR:bounded(process.env.MIHM_G2C_COMMITS_PER_PR??3,3,8)
  });
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
  main().catch(e=>{console.error(e.message);process.exitCode=1;});
