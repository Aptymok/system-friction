import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createAdminClient, nowStamp } from './sfi-db-client.mjs';
import {
  SFI_CLEAN_GENESIS_DATE,
  SFI_HISTORICAL_EVIDENCE,
  SFI_HISTORICAL_RECONSTRUCTION_SEED,
  SFI_RECONSTRUCTED_HISTORY_END,
  SFI_WORLD_DAY_ORIGIN,
} from './sfi-historical-reconstruction-manifest.mjs';

if (process.env.SFI_HISTORY_SEED_CONFIRM !== 'RECONSTRUCT_SFI_HISTORY') {
  console.error(JSON.stringify({
    ok:false,
    blocked:true,
    reason:'Historical reconstruction is disabled by default. This seed writes explicit provenance and a world-day spine; it does not fabricate historical events.',
    required:'SFI_HISTORY_SEED_CONFIRM=RECONSTRUCT_SFI_HISTORY',
  },null,2));
  process.exit(1);
}

const db=createAdminClient();
const stamp=nowStamp();
await mkdir(path.join('docs','db'),{recursive:true});

function hashEvidence(key){
  return createHash('sha256').update(`SFI-HISTORICAL-RECONSTRUCTION-V1|${key}`).digest('hex');
}
function utcDate(value){return new Date(`${value}T00:00:00.000Z`);}
function dateOnly(value){return new Date(value).toISOString().slice(0,10);}
function dayNumber(date){
  return Math.floor((utcDate(date).getTime()-utcDate(SFI_WORLD_DAY_ORIGIN).getTime())/86_400_000)+1;
}
function dayRows(){
  const start=utcDate(SFI_WORLD_DAY_ORIGIN);
  const end=utcDate(SFI_RECONSTRUCTED_HISTORY_END);
  const evidenceByDate=new Map();
  for(const evidence of SFI_HISTORICAL_EVIDENCE){
    const date=dateOnly(evidence.observedAt);
    if(date<SFI_WORLD_DAY_ORIGIN||date>SFI_RECONSTRUCTED_HISTORY_END)continue;
    const current=evidenceByDate.get(date)??[];current.push(evidence.key);evidenceByDate.set(date,current);
  }
  const rows=[];
  for(let cursor=start,day=1;cursor<=end;cursor=new Date(cursor.getTime()+86_400_000),day+=1){
    const date=cursor.toISOString().slice(0,10);const keys=evidenceByDate.get(date)??[];
    rows.push({world_date:date,day_number:day,origin_date:SFI_WORLD_DAY_ORIGIN,phase:'RECONSTRUCTED_HISTORY',reconstruction_status:keys.length?'EVIDENCE_ATTACHED':'TIME_COORDINATE_ONLY',evidence_keys:keys,evidence_count:keys.length,source_summary:{seed:SFI_HISTORICAL_RECONSTRUCTION_SEED,rule:'A day coordinate can exist without a reconstructed event. evidence_count=0 does not assert inactivity.'},updated_at:new Date().toISOString()});
  }
  const genesisDay=dayNumber(SFI_CLEAN_GENESIS_DATE);
  rows.push({world_date:SFI_CLEAN_GENESIS_DATE,day_number:genesisDay,origin_date:SFI_WORLD_DAY_ORIGIN,phase:'PROSPECTIVE_GENESIS',reconstruction_status:'LIVE_EMPTY',evidence_keys:[],evidence_count:0,source_summary:{seed:SFI_HISTORICAL_RECONSTRUCTION_SEED,boundary:'First clean prospective SFI world-day. No historical event is backfilled into this date.'},updated_at:new Date().toISOString()});
  return rows;
}

async function upsertWorldDays(){
  const rows=dayRows();
  const result=await db.from('sfi_world_day_ledger').upsert(rows,{onConflict:'world_date'}).select('world_date,day_number,phase,reconstruction_status,evidence_count');
  if(result.error)throw new Error(`WORLD_DAY_LEDGER_SEED_FAILED:${result.error.message}`);
  return result.data??[];
}

async function upsertEvidence(evidence){
  const evidenceHash=hashEvidence(evidence.key);
  const payload={
    title:evidence.title,
    content:evidence.summary,
    evidenceType:evidence.kind,
    relationType:'records',
    source:SFI_HISTORICAL_RECONSTRUCTION_SEED,
    metadata:{
      seed:SFI_HISTORICAL_RECONSTRUCTION_SEED,
      evidenceKey:evidence.key,
      module:evidence.module,
      caseId:evidence.caseId,
      sourceName:evidence.sourceName,
      sourceUrl:evidence.sourceUrl,
      privateRef:evidence.privateRef,
      sourceObservedAt:evidence.observedAt,
      dateBasis:evidence.dateBasis,
      importedAt:new Date().toISOString(),
      epistemicClass:evidence.epistemicClass,
      observedObject:'artifact_or_record_existence_and_provenance',
      claimBoundary:evidence.claimBoundary,
      historicalReconstruction:true,
      worldDay:dateOnly(evidence.observedAt)>=SFI_WORLD_DAY_ORIGIN?dayNumber(dateOnly(evidence.observedAt)):null,
    },
  };
  const root=await db.from('root_evidence_entries').upsert({
    evidence_hash:evidenceHash,
    actor_id:null,
    title:evidence.title,
    content:evidence.summary,
    evidence_type:evidence.kind,
    target_node_id:null,
    payload,
    epistemic_event_id:null,
  },{onConflict:'evidence_hash'}).select('id,evidence_hash').single();
  if(root.error)throw new Error(`ROOT_HISTORICAL_SEED_FAILED:${evidence.key}:${root.error.message}`);

  const ledgerRow={
    account_id:null,
    case_id:evidence.caseId,
    module:evidence.module,
    evidence_kind:evidence.kind,
    source_name:evidence.sourceName,
    source_url:evidence.sourceUrl,
    private_ref:evidence.privateRef,
    public_summary:{seed:SFI_HISTORICAL_RECONSTRUCTION_SEED,evidenceKey:evidence.key,title:evidence.title,summary:evidence.summary,epistemicClass:evidence.epistemicClass,dateBasis:evidence.dateBasis,claimBoundary:evidence.claimBoundary},
    evidence_hash:evidenceHash,
    anonymized:true,
    trust_level:'provenance_observed',
    trust_score:1,
    ldi:0,
    public_weight:evidence.publicWeight,
    observed_at:evidence.observedAt,
  };
  const existing=await db.from('sfi_evidence_ledger').select('id').eq('evidence_hash',evidenceHash).limit(1).maybeSingle();
  if(existing.error)throw new Error(`LEDGER_HISTORICAL_LOOKUP_FAILED:${evidence.key}:${existing.error.message}`);
  const ledger=existing.data
    ? await db.from('sfi_evidence_ledger').update(ledgerRow).eq('id',existing.data.id).select('id,evidence_hash').single()
    : await db.from('sfi_evidence_ledger').insert(ledgerRow).select('id,evidence_hash').single();
  if(ledger.error)throw new Error(`LEDGER_HISTORICAL_SEED_FAILED:${evidence.key}:${ledger.error.message}`);
  return {key:evidence.key,rootId:root.data.id,ledgerId:ledger.data.id,evidenceHash,observedAt:evidence.observedAt};
}

const report={
  ok:true,
  contract:'SFI-HISTORICAL-RECONSTRUCTION-SEED-1.0',
  seed:SFI_HISTORICAL_RECONSTRUCTION_SEED,
  seededAt:new Date().toISOString(),
  worldDayOrigin:SFI_WORLD_DAY_ORIGIN,
  reconstructedThrough:SFI_RECONSTRUCTED_HISTORY_END,
  cleanGenesisDate:SFI_CLEAN_GENESIS_DATE,
  rules:[
    'No epistemic_events are synthesized or backdated.',
    'No Field return, Method Lab result, governance approval or external action is fabricated.',
    'Every calendar day in the reconstructed range exists as a time coordinate, but an empty day does not assert inactivity.',
    'Historical objects are imported as provenance; their internal claims retain their own burden of proof.',
  ],
  worldDays:[],evidence:[],errors:[],
};

try{report.worldDays=await upsertWorldDays();}catch(error){report.ok=false;report.errors.push(error instanceof Error?error.message:String(error));}
if(report.ok){
  for(const evidence of SFI_HISTORICAL_EVIDENCE){
    try{report.evidence.push(await upsertEvidence(evidence));}
    catch(error){report.ok=false;report.errors.push(error instanceof Error?error.message:String(error));}
  }
}

const reportPath=path.join('docs','db',`SFI_HISTORICAL_RECONSTRUCTION_${stamp}.json`);
await writeFile(reportPath,JSON.stringify(report,null,2),'utf8');
console.log(JSON.stringify({...report,report:reportPath},null,2));
if(!report.ok)process.exitCode=1;
