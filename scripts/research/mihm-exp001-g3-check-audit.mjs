/**
 * MIHM-EXP-001 G3a: audit named CI checks, real job receipts and source versions.
 * Read only. No MIHM prediction, model training, scientific validation or RETURN.
 * Usage: GITHUB_TOKEN=... node scripts/research/mihm-exp001-g3-check-audit.mjs <g2c-cohort.json>
 */
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

export const CHECKS=[
  'Check domain boundaries',
  'Enforce canonical development preflight',
  'Verify MIHM method selection',
  'Verify bounded Neon continuity heartbeat fallback',
  'Verify ROOT graph and navigation convergence',
  'Verify ROOT reports and runtime truth'
];
export function stepOutcome(job,name){
  if(!job||!Array.isArray(job.steps))return {status:'UNKNOWN',reason:'JOB_OR_STEPS_UNAVAILABLE'};
  const matches=job.steps.filter(s=>s.name===name);
  if(matches.length===0)return {status:'ABSENT',reason:'NOT_IN_EXECUTED_JOB'};
  if(matches.length!==1)return {status:'UNKNOWN',reason:'AMBIGUOUS_NAME'};
  const s=matches[0];
  if(s.status!=='completed')return {status:'UNKNOWN',reason:'NOT_COMPLETED'};
  if(s.conclusion==='success')return {status:'PASS',reason:'EXECUTED_STEP'};
  if(s.conclusion==='failure')return {status:'FAIL',reason:'EXECUTED_STEP'};
  if(s.conclusion==='skipped')return {status:'SKIPPED',reason:'NOT_EXECUTED'};
  return {status:'UNKNOWN',reason:'OTHER_STEP_CONCLUSION'};
}
export function sourceCommands(yaml){
  if(typeof yaml!=='string')return {};
  const lines=yaml.split(/\r?\n/),out={};
  for(let i=0;i<lines.length;i++){
    const m=lines[i].match(/^(\s*)-\s+name:\s*(.*?)\s*$/);
    if(!m||!CHECKS.includes(m[2]))continue;
    const depth=m[1].length;
    for(let j=i+1;j<lines.length;j++){
      const next=lines[j].match(/^(\s*)-\s+name:\s*/);
      if(next&&next[1].length<=depth)break;
      const run=lines[j].match(/^\s*run:\s*(.*?)\s*$/);
      if(run){out[m[2]]=run[1]==='|'?'MULTILINE_UNPARSED':run[1];break;}
    }
  }
  return out;
}
export function summarize(rows,errors=[]){
  const byCheck={};
  for(const name of CHECKS){
    const statuses=rows.map(x=>x.checks[name]?.status??'UNKNOWN');
    const failurePrs=[...new Set(rows.filter(x=>x.checks[name]?.status==='FAIL').map(x=>x.pr))];
    const commands=[...new Set(rows.map(x=>x.sourceCommands?.[name]).filter(Boolean))];
    byCheck[name]={
      pass:statuses.filter(s=>s==='PASS').length,
      fail:statuses.filter(s=>s==='FAIL').length,
      skipped:statuses.filter(s=>s==='SKIPPED').length,
      absent:statuses.filter(s=>s==='ABSENT').length,
      unknown:statuses.filter(s=>s==='UNKNOWN').length,
      failurePrs,
      distinctFailurePrs:failurePrs.length,
      sourceCommandVariants:commands,
      scientificEndpointAdmissible:false
    };
  }
  const failureSteps={};
  for(const row of rows)for(const s of row.failedSteps)
    failureSteps[s]=(failureSteps[s]??0)+1;
  return {
    runs:rows.length,
    independentPrGroups:new Set(rows.map(x=>x.pr)).size,
    sourceVersions:new Set(rows.map(x=>x.workflowBlob).filter(Boolean)).size,
    sourceReadFailures:errors.filter(x=>x.stage==='SOURCE').length,
    jobReadFailures:errors.filter(x=>x.stage==='JOBS').length,
    byCheck,failureSteps,
    g3ScientificComparison:'BLOCKED_NO_MATCHED_MIHM_RELATION_INPUTS_OR_HOLDOUT'
  };
}
export async function audit(g2c,{get}){
  const picked=g2c.records.filter(x=>x.eligibleForDescriptiveChronology &&
    x.source.workflowName==='SFI Verify');
  if(!picked.length)throw Error('NO_QUALIFYING_SFI_VERIFY_ROWS');
  const rows=[],errors=[],cached=new Map();
  for(const x of picked){
    const pr=x.group.prNumber,sha=x.group.commitSha,id=x.source.workflowRunId;
    const row={
      pr,sha,runId:id,t0:x.chronology.ciRunCreatedAt,
      originalOutcome:x.outcomeAsOfCutoff.category,
      workflowBlob:null,sourceCommands:{},mainJob:'UNKNOWN',mainJobStepCount:null,
      checks:{},failedSteps:[],flags:['HEAD_COMMIT_SOURCE_NOT_EXECUTED_MERGE_REF_PROOF']
    };
    try{
      if(!cached.has(sha)){
        const source=await get('/contents/.github/workflows/sfi-verify.yml?ref='+encodeURIComponent(sha));
        const yaml=typeof source.content==='string'
          ?Buffer.from(source.content.replace(/\s/g,''),'base64').toString('utf8'):null;
        cached.set(sha,{blob:source.sha??null,commands:sourceCommands(yaml)});
      }
      const snapshot=cached.get(sha);
      row.workflowBlob=snapshot.blob;row.sourceCommands=snapshot.commands;
    }catch(e){
      errors.push({pr,id,stage:'SOURCE',reason:String(e.message??e).slice(0,120)});
      row.flags.push('SOURCE_UNKNOWN');
    }
    try{
      const response=await get('/actions/runs/'+id+'/jobs?per_page=100');
      const jobs=Array.isArray(response.jobs)?response.jobs:[];
      const main=jobs.find(j=>j.name==='Verify SFI boundaries and build');
      if(!main)row.flags.push('MAIN_JOB_UNKNOWN');
      else{
        row.mainJob=main.conclusion??'UNKNOWN';
        row.mainJobStepCount=Array.isArray(main.steps)?main.steps.length:null;
        row.failedSteps=(main.steps??[]).filter(s=>s.conclusion==='failure').map(s=>s.name);
      }
      for(const check of CHECKS)row.checks[check]=stepOutcome(main,check);
      if(jobs.length>=100||Number(response.total_count??0)>jobs.length)
        row.flags.push('JOB_PAGINATION_INCOMPLETE');
      if(x.outcomeAsOfCutoff.category==='SUCCESS'&&row.mainJob!=='success')
        row.flags.push('RUN_MAIN_JOB_MISMATCH');
    }catch(e){
      errors.push({pr,id,stage:'JOBS',reason:String(e.message??e).slice(0,120)});
      row.flags.push('JOB_UNKNOWN');
      for(const check of CHECKS)row.checks[check]={status:'UNKNOWN',reason:'API_ERROR'};
    }
    rows.push(row);
  }
  return {
    contract:'SFI-MIHM-EXP001-G3A-CHECK-FEASIBILITY-1.0',
    classification:'DERIVED',validated:false,frozen:false,
    parentArtifact:'G2c final GitHub Actions 11879152257',
    source:'GitHub CI job-step receipts and immutable head-commit workflow blobs',
    generatedAt:new Date().toISOString(),
    summary:summarize(rows,errors),errors,
    limitations:[
      'Workflow source SHA is a pre-outcome head-commit proxy, not attested executed PR merge-ref workflow.',
      'Named checks changed or were absent/skipped across workflow versions.',
      'Multiple CI entries per PR are clustered and not independent.',
      'Declared workflow-to-script call is not a causal system graph.',
      'No matched conventional M0, pre-T0 MIHM relational features, blind holdout or scientific RETURN.'
    ],records:rows
  };
}
async function main(){
  const token=process.env.GITHUB_TOKEN??process.env.GH_TOKEN,file=process.argv[2];
  if(!token||!file){console.error('GITHUB_TOKEN_AND_G2C_JSON_REQUIRED');process.exitCode=2;return;}
  const g2c=JSON.parse(fs.readFileSync(file,'utf8'));
  const get=async path=>{
    const res=await fetch('https://api.github.com/repos/Aptymok/system-friction'+path,{
      headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,
        'X-GitHub-Api-Version':'2022-11-28','User-Agent':'SFI-MIHM-G3A'}});
    if(!res.ok)throw Error('GITHUB_'+res.status+'_'+path.split('?')[0]);
    return res.json();
  };
  process.stdout.write(JSON.stringify(await audit(g2c,{get}),null,2)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
  main().catch(e=>{console.error(e.message);process.exitCode=1;});
