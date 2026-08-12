import 'server-only';

import { createHash } from 'node:crypto';
import { readCognitiveTwinLineageHealth } from './runtime';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { COGNITIVE_TWIN_CONTRACT_VERSION } from '../contract';

type Row=Record<string,unknown>;
function canonical(value:unknown):string{if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;const row=value as Row;return `{${Object.keys(row).sort().map(key=>`${JSON.stringify(key)}:${canonical(row[key])}`).join(',')}}`;}
function sha256(value:unknown){return createHash('sha256').update(canonical(value)).digest('hex');}

export async function createLineageCheckpoint(actorId:string){
  const lineage=await readCognitiveTwinLineageHealth();
  if(!lineage.genesisPresent)throw new Error('CT_CHECKPOINT_GENESIS_MISSING');
  if(lineage.chainIntegrity!=='PASS')throw new Error(`CT_CHECKPOINT_LINEAGE_${lineage.chainIntegrity}`);
  const db=createServiceSupabaseClient();
  const prior=await db.from('sfi_cognitive_twin_runs').select('*').eq('role','cognitive_twin_checkpoint').order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(prior.error)throw new Error(`CT_CHECKPOINT_PRIOR_READ_FAILED:${prior.error.message}`);
  const priorEnvelope=prior.data?.output_envelope&&typeof prior.data.output_envelope==='object'?prior.data.output_envelope as Row:{};
  const priorResult=priorEnvelope.result&&typeof priorEnvelope.result==='object'?priorEnvelope.result as Row:{};
  const previousCheckpointHash=typeof priorResult.checkpointHash==='string'?priorResult.checkpointHash:null;
  const createdAt=new Date().toISOString();
  const checkpoint={schemaVersion:'SFI-CT-LINEAGE-CHECKPOINT-1.0',subjectId:lineage.subjectId,lineageId:lineage.lineageId,headHash:lineage.headHash,sealedEpochs:lineage.eventCount,materialEpochs:lineage.materialEventCount,previousCheckpointHash,createdAt,contractVersion:COGNITIVE_TWIN_CONTRACT_VERSION,externalAnchor:{status:'PENDING_EXTERNAL_ANCHOR',authority:null,receipt:null}};
  const checkpointHash=sha256(checkpoint);
  const taskId=`ct-a01-checkpoint-${checkpointHash.slice(0,16)}`;
  const existing=await db.from('sfi_cognitive_twin_runs').select('*').eq('task_id',taskId).limit(1);
  if(existing.error)throw new Error(`CT_CHECKPOINT_EXISTING_READ_FAILED:${existing.error.message}`);
  if((existing.data??[]).length)return {created:false,taskId,checkpoint,checkpointHash};
  const write=await db.from('sfi_cognitive_twin_runs').insert({task_id:taskId,contract_version:COGNITIVE_TWIN_CONTRACT_VERSION,provider:null,model:null,role:'cognitive_twin_checkpoint',status:'READY',objective:'Export an auditable CT-A01 lineage checkpoint package for later independent timestamp anchoring.',input_snapshot:{actorId,lineageHead:lineage.headHash},output_envelope:{status:'EXECUTED',result:{checkpoint,checkpointHash,providerExecutionSucceeded:true},claims:[{statement:'An institutional checkpoint package was generated from the observable lineage head.',epistemicClass:'DERIVED',evidenceRefs:[]}],limitations:['The package is not independently timestamped until an external authority returns a receipt.']},evidence_refs:[],limitations:['PENDING_EXTERNAL_ANCHOR'],started_at:createdAt,finished_at:createdAt});
  if(write.error)throw new Error(`CT_CHECKPOINT_WRITE_FAILED:${write.error.message}`);
  return {created:true,taskId,checkpoint,checkpointHash};
}

export async function readLatestLineageCheckpoint(){
  const db=createServiceSupabaseClient();
  const result=await db.from('sfi_cognitive_twin_runs').select('*').eq('role','cognitive_twin_checkpoint').order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(result.error)throw new Error(`CT_CHECKPOINT_READ_FAILED:${result.error.message}`);
  if(!result.data)return null;
  const envelope=result.data.output_envelope&&typeof result.data.output_envelope==='object'?result.data.output_envelope as Row:{};
  const out=envelope.result&&typeof envelope.result==='object'?envelope.result as Row:{};
  return {taskId:result.data.task_id??null,createdAt:result.data.created_at??result.data.finished_at??null,checkpoint:out.checkpoint??null,checkpointHash:out.checkpointHash??null,status:result.data.status??null};
}
