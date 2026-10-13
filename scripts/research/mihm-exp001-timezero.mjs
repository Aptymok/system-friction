/**
 * MIHM-EXP-001 G2b: real GitHub CI-entry chronology (read-only).
 * EXPLORATORY DATA ELIGIBILITY ONLY; no prediction, model fit, validation or RETURN.
 * Usage: GITHUB_TOKEN=... node scripts/research/mihm-exp001-timezero.mjs > audit.json
 */
import { pathToFileURL } from 'node:url';

export const validTime = x => typeof x === 'string' && Number.isFinite(Date.parse(x));
export const before = (a,b) => validTime(a) && validTime(b) && Date.parse(a)<Date.parse(b);
export const atOrBefore = (a,b) => validTime(a) && validTime(b) && Date.parse(a)<=Date.parse(b);
const bounded = (v, fallback, max) => Number.isInteger(Number(v)) ? Math.min(max,Math.max(1,Number(v))) : fallback;

export function makeEntryUnit({prNumber,commit,run,cutoff,priorRuns=[]}) {
  const sha=commit?.sha??null, committedAt=commit?.commit?.committer?.date??null, t0=run?.created_at??null;
  const flags=[];
  if (!sha || !committedAt || !t0 || !atOrBefore(committedAt,t0)) flags.push('COMMIT_VINTAGE_NOT_ADMISSIBLE');
  if (!atOrBefore(t0,cutoff)) flags.push('ENTRY_AFTER_AUDIT_CUTOFF');
  if (run?.head_sha!==sha) flags.push('RUN_HEAD_SHA_MISMATCH');
  if (!run?.workflow_id || !run?.name) flags.push('WORKFLOW_IDENTITY_MISSING');
  if (run?.event!=='pull_request') flags.push('NOT_PULL_REQUEST_WORKFLOW');
  const files=Array.isArray(commit?.files)?commit.files:[];
  if (!Array.isArray(commit?.files)) flags.push('COMMIT_FILE_LIST_MISSING');
  if (files.length>=300) flags.push('COMMIT_FILE_LIST_MAY_BE_TRUNCATED');
  const prior=priorRuns.filter(x=>x.id!==run?.id && x.name===run?.name &&
    x.status==='completed' && x.conclusion!==null && x.conclusion!==undefined &&
    before(x.created_at,t0) && before(x.updated_at,t0));
  const categories={tests:0,docs:0,workflows:0,source:0};
  for (const f of files) {
    const n=String(f.filename??'');
    if (/(^|\\/)(test|tests|__tests__)(\\/|\\.)|\\.test\\.|\\.spec\\./i.test(n)) categories.tests++;
    else if (/^docs\\/|\\.md$/i.test(n)) categories.docs++;
    else if (/^\\.github\\/workflows\\//.test(n)) categories.workflows++;
    else categories.source++;
  }
  const latest=prior.slice().sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at))[0];
  const features={
    commitParentCount:Array.isArray(commit?.parents)?commit.parents.length:null,
    changedFiles:files.length,
    additions:files.reduce((n,f)=>n+(Number(f.additions)||0),0),
    deletions:files.reduce((n,f)=>n+(Number(f.deletions)||0),0),
    filenameCategories:categories,
    priorSameShaWorkflowRunCount:prior.length,
    priorSameShaWorkflowFailureCount:prior.filter(x=>x.conclusion==='failure').length,
    lastPriorSameShaWorkflowConclusion:latest?.conclusion??null
  };
  return {
    unit:`PR-${prNumber}/${sha??'UNKNOWN'}/${run?.workflow_id??'UNKNOWN'}/${run?.id??'UNKNOWN'}`,
    source:{prNumber,commitSha:sha,workflowRunId:run?.id??null,workflowId:run?.workflow_id??null,
      workflowName:run?.name??null,commitUrl:commit?.html_url??null,runUrl:run?.html_url??null},
    observationTime:t0,commitDeclaredTime:committedAt,
    preOutcomeFeatures:flags.length===0?features:null,
    // Post-T0 outcomes NEVER belong to preOutcomeFeatures.
    outcomeAudit:{status:run?.status??null,conclusion:run?.conclusion??null,
      lastUpdatedAt:run?.updated_at??null},
    eligibleForExploratoryCiEntryReconstruction:flags.length===0,
    eligibleForProspectiveScientificValidation:false,
    flags:[...flags,'HISTORICAL_SAMPLE_SELECTION_NO_PROSPECTIVE_CLAIM']
  };
}

export async function collect({fetchJson,maxPrs=5,maxCommits=10,cutoff='2026-10-11T23:59:59Z'}) {
  const prs=await fetchJson(`/pulls?state=closed&sort=created&direction=desc&per_page=${maxPrs}`);
  const records=[],warnings=[];
  for (const pr of prs) {
    if (!atOrBefore(pr.created_at,cutoff)) continue;
    const commits=await fetchJson(`/pulls/${pr.number}/commits?per_page=${maxCommits}`);
    if (commits.length===maxCommits) warnings.push(`PR-${pr.number}:COMMIT_PAGINATION_NOT_PROVEN_COMPLETE`);
    for (const item of commits) {
      if (!item.sha) continue;
      const commit=await fetchJson(`/commits/${item.sha}`);
      const response=await fetchJson(`/actions/runs?head_sha=${item.sha}&per_page=100`);
      const all=Array.isArray(response.workflow_runs)?response.workflow_runs:[];
      const incomplete=all.length>=100 || (response.total_count??0)>all.length;
      if (incomplete) warnings.push(`${item.sha}:RUN_PAGINATION_INCOMPLETE`);
      // Select earliest observed run per workflow, never select by eventual conclusion.
      const runs=all.filter(x=>x.head_sha===item.sha && x.event==='pull_request' && atOrBefore(x.created_at,cutoff))
        .sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at));
      const first=new Map();
      for (const r of runs) if (r.workflow_id && !first.has(r.workflow_id)) first.set(r.workflow_id,r);
      for (const run of first.values()) {
        const unit=makeEntryUnit({prNumber:pr.number,commit,run,cutoff,priorRuns:runs});
        if (incomplete) {
          unit.flags.push('RUN_HISTORY_INCOMPLETE');
          unit.preOutcomeFeatures=null;
          unit.eligibleForExploratoryCiEntryReconstruction=false;
        }
        records.push(unit);
      }
    }
  }
  return {
    contract:'SFI-MIHM-EXP001-G2B-CI-ENTRY-1.0',generatedAt:new Date().toISOString(),
    cutoff,epistemicClass:'DERIVED',validation:'NOT_PERFORMED',
    source:'GitHub PR historical commits + GitHub Actions metadata',
    limits:'Retrospective closed-PR cohort; CI creation is a timestamp proxy, not push/actor knowledge receipt; bounded pagination; no blind prediction or model fitting.',
    counts:{units:records.length,eligibleReconstruction:records.filter(x=>x.eligibleForExploratoryCiEntryReconstruction).length,prospectiveValidations:0},
    warnings,records
  };
}
async function main() {
  const token=process.env.GITHUB_TOKEN??process.env.GH_TOKEN;
  if (!token) { console.error('GITHUB_TOKEN_REQUIRED'); process.exitCode=2; return; }
  const api=async path=>{
    const res=await fetch(`https://api.github.com/repos/Aptymok/system-friction${path}`,{headers:{
      Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,
      'X-GitHub-Api-Version':'2022-11-28','User-Agent':'SFI-MIHM-EXP001-G2B'}});
    if (!res.ok) throw new Error(`GITHUB_FETCH_${res.status}:${path}`);
    return res.json();
  };
  const output=await collect({fetchJson:api,maxPrs:bounded(process.env.MIHM_G2B_PR_LIMIT??5,5,30),
    maxCommits:bounded(process.env.MIHM_G2B_COMMIT_LIMIT??10,10,100),
    cutoff:process.env.MIHM_CUTOFF??'2026-10-11T23:59:59Z'});
  process.stdout.write(JSON.stringify(output,null,2)+'\n');
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
