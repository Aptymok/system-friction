import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { reconcilePersistedEvidenceGraph } from '../src/lib/evidence/reconcileEvidenceGraph';
import { syncSfiInstitutionalStateToCognitiveTwin } from '../src/lib/cognitive-twin/institutionalIntegration';

if (process.env.SFI_HISTORY_RECONSTRUCT_CONFIRM !== 'REBUILD_DERIVED_SFI_HISTORY') {
  console.error(JSON.stringify({
    ok:false,
    blocked:true,
    reason:'Derived historical reconstruction is disabled by default. Run the provenance seed first, review it, then explicitly enable this pass.',
    required:'SFI_HISTORY_RECONSTRUCT_CONFIRM=REBUILD_DERIVED_SFI_HISTORY',
  },null,2));
  process.exit(1);
}

const stamp=new Date().toISOString().replace(/[:.]/g,'-');
await mkdir(path.join('docs','db'),{recursive:true});

const report:{
  ok:boolean;
  contract:string;
  reconstructedAt:string;
  graph:unknown;
  cognitiveTwin:unknown;
  boundaries:string[];
  errors:string[];
}={
  ok:true,
  contract:'SFI-DERIVED-HISTORY-RECONSTRUCTION-1.0',
  reconstructedAt:new Date().toISOString(),
  graph:null,
  cognitiveTwin:null,
  boundaries:[
    'Graph is a projection rebuilt from persisted canonical evidence; it is not additional evidence.',
    'Historical ROOT evidence enters Cognitive Twin memory as CANDIDATE context.',
    'Preserved WorldSpect snapshots enter Twin context with their original derived/simulated boundary.',
    'No Field return, Method Lab run, governance decision or external execution is created by this script.',
    'Reconstruction cannot promote an imported historical claim into observed fact or canon.',
  ],
  errors:[],
};

try{
  report.graph=await reconcilePersistedEvidenceGraph();
}catch(error){
  report.ok=false;
  report.errors.push(`graph:${error instanceof Error?error.message:String(error)}`);
}

try{
  report.cognitiveTwin=await syncSfiInstitutionalStateToCognitiveTwin();
  const twin=report.cognitiveTwin as {ok?:boolean}|null;
  if(twin?.ok===false){
    report.ok=false;
    report.errors.push('cognitive_twin:institutional_sync_degraded');
  }
}catch(error){
  report.ok=false;
  report.errors.push(`cognitive_twin:${error instanceof Error?error.message:String(error)}`);
}

const reportPath=path.join('docs','db',`SFI_DERIVED_HISTORY_RECONSTRUCTION_${stamp}.json`);
await writeFile(reportPath,JSON.stringify(report,null,2),'utf8');
console.log(JSON.stringify({...report,report:reportPath},null,2));
if(!report.ok)process.exitCode=1;
