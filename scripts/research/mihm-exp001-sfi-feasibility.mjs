/**
 * MIHM-EXP-001 / G2: read-only GitHub event chronology feasibility audit.
 * No prediction, experiment freeze, canonical evidence, or RETURN is produced.
 * Usage: GITHUB_TOKEN=... node scripts/research/mihm-exp001-sfi-feasibility.mjs
 */
const owner = 'Aptymok', repo = 'system-friction';
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
if (!token) { console.error('GITHUB_TOKEN_REQUIRED'); process.exit(2); }
const max = Math.max(1, Math.min(60, Number(process.env.MIHM_SAMPLE_LIMIT ?? 30)));
const cutoff = process.env.MIHM_CUTOFF ?? new Date().toISOString();
const headers = { Accept:'application/vnd.github+json', Authorization:`Bearer ${token}`, 'X-GitHub-Api-Version':'2022-11-28', 'User-Agent':'SFI-MIHM-EXP001-G2' };
async function api(route) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}${route}`, {headers});
  if (!res.ok) throw new Error(`GITHUB_FETCH_${res.status}:${route}`);
  return res.json();
}
function before(value){ return typeof value==='string' && Date.parse(value)<=Date.parse(cutoff); }
function fieldsOfRun(run) {
  return {id:run.id,workflowId:run.workflow_id,name:run.name,headSha:run.head_sha,createdAt:run.created_at,updatedAt:run.updated_at,completedAt:run.run_started_at,conclusion:run.conclusion,status:run.status,url:run.html_url};
}
const prs = await api(`/pulls?state=closed&sort=created&direction=desc&per_page=${max}`);
const rows=[];
for (const pr of prs) {
  if (!before(pr.created_at)) continue;
  const headSha = pr.head?.sha ?? null;
  if (!headSha) continue;
  // This is the *current final head*, not guaranteed to be the PR's original head.
  // It is NEVER admissible as a PR-creation snapshot without historical reconstruction.
  const commit = await api(`/commits/${headSha}`);
  const commitTime = commit.commit?.committer?.date ?? null;
  const runsResult = await api(`/actions/runs?head_sha=${headSha}&per_page=100`);
  const runs = (runsResult.workflow_runs ?? []).filter(run=>before(run.created_at)).map(fieldsOfRun);
  const matching = runs.filter(run=>run.headSha===headSha && run.createdAt && commitTime && Date.parse(run.createdAt)>=Date.parse(commitTime));
  const completed = matching.filter(run=>run.status==='completed' && run.conclusion !== null);
  rows.push({
    prNumber:pr.number,prCreatedAt:pr.created_at,prClosedAt:pr.closed_at,prMergedAt:pr.merged_at,
    finalHeadSha:headSha,finalHeadCommitTime:commitTime,
    finalHeadSource:'CURRENT_PR_HEAD_NOT_PR_CREATION_SNAPSHOT',
    headAfterPrCreation:!!commitTime && Date.parse(commitTime)>Date.parse(pr.created_at),
    runCount:matching.length,completedRunCount:completed.length,
    conclusions:[...new Set(completed.map(x=>x.conclusion))].sort(),
    runs:matching,
    eligibleForPrCreationForecast:false,
    eligibleForCommitTimeAudit:!!commitTime && completed.length>0,
    flags:[
      ...(!commitTime?['HEAD_COMMIT_TIME_UNKNOWN']:[]),
      ...(matching.length===0?['NO_QUALIFYING_WORKFLOW_RUN']:[]),
      ...(completed.length===0?['NO_COMPLETED_WORKFLOW_OUTCOME']:[]),
      'TIME_ZERO_REQUIRES_SEPARATE_COMMIT_SNAPSHOT_AND_FEATURE_RECONSTRUCTION',
    ],
  });
}
const usable=rows.filter(x=>x.eligibleForCommitTimeAudit);
const out={contract:'SFI-MIHM-EXP001-G2-CHRONOLOGY-AUDIT-1.0',epistemicClass:'DERIVED',validation:'NOT_PERFORMED',generatedAt:new Date().toISOString(),
  cutoff,repository:`${owner}/${repo}`,sampleLimit:max,units:'CLOSED_PR_FINAL_HEADS_FOR_FEASIBILITY_ONLY',
  caveat:'PR current final head and latest metadata are NOT the original pre-outcome feature snapshot; no forecasting claims or training permitted from this manifest.',
  counts:{inspected:rows.length,withCompletedRun:usable.length,withoutCompletedRun:rows.length-usable.length},
  nextGate:'Fix unit at commit timestamp, reconstruct admissible pre-run features at that SHA, freeze target/horizon before any held-out prediction',
  records:rows};
process.stdout.write(JSON.stringify(out,null,2)+'\n');
