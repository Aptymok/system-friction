import 'server-only';

import { createHash } from 'node:crypto';
import {
  SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT,
  SFI_SYSTEM_AI_RELATION_TYPES,
  validateSystemAiRelationDraft,
  type SfiSystemAiEntityRef,
  type SfiSystemAiIntakePackage,
  type SfiSystemAiRelationDraft,
  type SfiSystemAiRelationEpistemicRole,
  type SfiSystemAiRelationType,
} from '@/core/case-platform';
import type { SfiCanonicalRef } from '@/core/contracts/sfi';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { assertCaseServiceProfileAllowed, assertCaseReferenceIntegrity, assertTenantSystemAiEntityRefs, readCaseAuthorityRole } from './integrity';

const SYSTEM_AI_PROFILES=['SYSTEM_OBSERVATORY','AI_IMPLEMENTATION_DIAGNOSTIC','AI_ADOPTION_INTEGRATION','AI_GOVERNANCE_ASSURANCE','CUSTOM_RESEARCH'] as const;
type Row=Record<string,unknown>;

function text(v:unknown){return typeof v==='string'?v.trim():'';}
function obj(v:unknown):Record<string,unknown>{return v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};}
function refs(v:unknown):SfiCanonicalRef[]{return Array.isArray(v)?v.map(item=>{const r=obj(item);return{id:text(r.id),version:text(r.version)||null,hash:text(r.hash)||null};}).filter(r=>r.id):[];}
function canonicalRef(v:unknown):SfiCanonicalRef{const r=obj(v);return{id:text(r.id),version:text(r.version)||null,hash:text(r.hash)||null};}
function entityRef(v:unknown):SfiSystemAiEntityRef{const r=obj(v);return{id:text(r.id),version:text(r.version)||null,hash:text(r.hash)||null,entityType:text(r.entityType) as SfiSystemAiEntityRef['entityType']};}
function fromRow(row:Row){return{id:text(row.id),relationKey:text(row.relation_key),caseId:text(row.case_id),tenantId:text(row.tenant_id),relationType:text(row.relation_type) as SfiSystemAiRelationType,epistemicRole:text(row.epistemic_role) as SfiSystemAiRelationEpistemicRole,from:entityRef(row.from_ref),to:entityRef(row.to_ref),sourceRefs:refs(row.source_refs),recordRefs:refs(row.record_refs),evidenceRefs:refs(row.evidence_refs),payload:obj(row.payload),observedAt:text(row.observed_at)||null,createdAt:text(row.created_at)};}
function caseObjectFromRow(row:Row){return{id:text(row.id),caseId:text(row.case_id),tenantId:text(row.tenant_id),kind:text(row.object_kind),epistemicRole:text(row.epistemic_role),canonicalRef:canonicalRef(row.canonical_ref),sourceRefs:refs(row.source_refs),recordRefs:refs(row.record_refs),evidenceRefs:refs(row.evidence_refs),payload:obj(row.payload),observedAt:text(row.observed_at)||null,createdAt:text(row.created_at)};}

function stableValue(value:unknown):unknown{
  if(Array.isArray(value)) return value.map(stableValue);
  if(value&&typeof value==='object') return Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,stableValue(item)]));
  return value;
}
function semanticHash(value:unknown){return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');}
function refKey(ref:SfiCanonicalRef){return `${ref.id}|${ref.version??''}|${ref.hash??''}`;}
function uniqueRefs(input:SfiCanonicalRef[]){const seen=new Set<string>();return input.filter(ref=>{const key=refKey(ref);if(seen.has(key))return false;seen.add(key);return true;});}
function entityKey(ref:SfiSystemAiEntityRef){return `${ref.entityType}|${ref.id}|${ref.version??''}|${ref.hash??''}`;}
function uniqueEntityRefs(input:SfiSystemAiEntityRef[]){const seen=new Set<string>();return input.filter(ref=>{const key=entityKey(ref);if(seen.has(key))return false;seen.add(key);return true;});}

export async function persistOperationalSystemAiIntakePackage(input:{caseId:string;userId:string;packet:SfiSystemAiIntakePackage}){
  if(input.packet.contract!==SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT) throw new Error('SFI_SYSTEM_AI_PACKET_CONTRACT_INVALID');
  await assertCaseServiceProfileAllowed(input.caseId,input.userId,[...SYSTEM_AI_PROFILES]);
  const authority=await readCaseAuthorityRole(input.caseId,input.userId);
  if(!['OWNER','ADMIN','OPERATOR'].includes(authority.role)) throw new Error('SFI_TENANT_WRITE_FORBIDDEN');
  if(['CLOSED','REJECTED'].includes(authority.status)) throw new Error(`SFI_SYSTEM_AI_INTAKE_FORBIDDEN:${authority.status}`);

  const entityType=typeof input.packet.object.payload.entityType==='string'?input.packet.object.payload.entityType.trim():'';
  if(!entityType) throw new Error('SFI_SYSTEM_AI_PACKET_OBJECT_ENTITY_TYPE_REQUIRED');
  const baseObject=input.packet.object;
  const canonical={
    ...baseObject.canonicalRef,
    hash:baseObject.canonicalRef.hash?.trim()||semanticHash({
      caseId:input.caseId,
      kind:baseObject.kind,
      epistemicRole:baseObject.epistemicRole,
      canonicalRef:{...baseObject.canonicalRef,hash:null},
      sourceRefs:baseObject.sourceRefs??[],
      recordRefs:baseObject.recordRefs??[],
      evidenceRefs:baseObject.evidenceRefs??[],
      payload:baseObject.payload,
      observedAt:baseObject.observedAt??null,
    }),
  };
  const object={...baseObject,canonicalRef:canonical};

  for(const relation of input.packet.relations){
    const violations=validateSystemAiRelationDraft(relation);
    if(violations.length) throw new Error(`SFI_SYSTEM_AI_RELATION_INVALID:${violations.join(',')}`);
    if(relation.from.id!==canonical.id&&relation.to.id!==canonical.id) throw new Error(`SFI_SYSTEM_AI_PACKAGE_RELATION_NOT_BOUND_TO_OBJECT:${relation.relationKey}`);
    if(relation.from.id===canonical.id&&relation.from.entityType!==entityType) throw new Error('SFI_SYSTEM_AI_PACKAGE_OBJECT_ENDPOINT_TYPE_MISMATCH');
    if(relation.to.id===canonical.id&&relation.to.entityType!==entityType) throw new Error('SFI_SYSTEM_AI_PACKAGE_OBJECT_ENDPOINT_TYPE_MISMATCH');
  }

  const allSourceRefs=uniqueRefs([...(object.sourceRefs??[]),...input.packet.relations.flatMap(relation=>relation.sourceRefs??[])]);
  const allRecordRefs=uniqueRefs([...(object.recordRefs??[]),...input.packet.relations.flatMap(relation=>relation.recordRefs??[])]);
  const allEvidenceRefs=uniqueRefs([...(object.evidenceRefs??[]),...input.packet.relations.flatMap(relation=>relation.evidenceRefs??[])]);
  await assertCaseReferenceIntegrity({caseId:input.caseId,userId:input.userId,sourceRefs:allSourceRefs,recordRefs:allRecordRefs,evidenceRefs:allEvidenceRefs});

  const externalEndpoints=uniqueEntityRefs(input.packet.relations.flatMap(relation=>[relation.from,relation.to]).filter(ref=>ref.id!==canonical.id));
  await assertTenantSystemAiEntityRefs({caseId:input.caseId,userId:input.userId,entityRefs:externalEndpoints});

  const service=createServiceSupabaseClient();
  const result=await service.rpc('sfi_record_system_ai_intake_package_v1',{
    p_case_id:input.caseId,
    p_actor_id:input.userId,
    p_object:object,
    p_relations:input.packet.relations,
  });
  if(result.error) throw new Error(`SFI_SYSTEM_AI_ATOMIC_INTAKE_FAILED:${result.error.message}`);
  const payload=obj(result.data);
  const objectRow=obj(payload.object);
  if(!text(objectRow.id)) throw new Error('SFI_SYSTEM_AI_ATOMIC_INTAKE_RESULT_INVALID');
  const relationRows=Array.isArray(payload.relations)?payload.relations.map(item=>obj(item)):[];
  return{
    object:caseObjectFromRow(objectRow),
    relations:relationRows.map(fromRow),
    atomic:payload.atomic===true,
    mutated:payload.mutated===true,
  };
}

export async function recordOperationalSystemAiRelation(input:{caseId:string;userId:string;relation:SfiSystemAiRelationDraft}){
  await assertCaseServiceProfileAllowed(input.caseId,input.userId,[...SYSTEM_AI_PROFILES]);
  const authority=await readCaseAuthorityRole(input.caseId,input.userId);
  if(!['OWNER','ADMIN','OPERATOR'].includes(authority.role)) throw new Error('SFI_TENANT_WRITE_FORBIDDEN');
  if(['CLOSED','REJECTED'].includes(authority.status)) throw new Error(`SFI_SYSTEM_AI_RELATION_WRITE_FORBIDDEN:${authority.status}`);
  const violations=validateSystemAiRelationDraft(input.relation);
  if(violations.length) throw new Error(`SFI_SYSTEM_AI_RELATION_INVALID:${violations.join(',')}`);
  await assertCaseReferenceIntegrity({caseId:input.caseId,userId:input.userId,sourceRefs:input.relation.sourceRefs,recordRefs:input.relation.recordRefs,evidenceRefs:input.relation.evidenceRefs});
  await assertTenantSystemAiEntityRefs({caseId:input.caseId,userId:input.userId,entityRefs:[input.relation.from,input.relation.to]});
  const service=createServiceSupabaseClient();
  const existing=await service.from('sfi_case_relations').select('*').eq('case_id',input.caseId).eq('relation_key',input.relation.relationKey).maybeSingle();
  if(existing.error) throw new Error(`SFI_SYSTEM_AI_RELATION_IDENTITY_READ_FAILED:${existing.error.message}`);
  if(existing.data){
    const row=fromRow(existing.data as Row);
    if(row.relationType===input.relation.relationType&&row.from.id===input.relation.from.id&&row.to.id===input.relation.to.id&&row.epistemicRole===input.relation.epistemicRole)return row;
    throw new Error('SFI_SYSTEM_AI_RELATION_KEY_CONFLICT');
  }
  const inserted=await service.from('sfi_case_relations').insert({relation_key:input.relation.relationKey,case_id:input.caseId,owner_id:authority.ownerId,tenant_id:authority.tenantId,relation_type:input.relation.relationType,epistemic_role:input.relation.epistemicRole,from_ref:input.relation.from,to_ref:input.relation.to,source_refs:input.relation.sourceRefs??[],record_refs:input.relation.recordRefs??[],evidence_refs:input.relation.evidenceRefs??[],payload:input.relation.payload??{},observed_at:input.relation.observedAt??null}).select('*').single();
  if(inserted.error||!inserted.data) throw new Error(`SFI_SYSTEM_AI_RELATION_WRITE_FAILED:${inserted.error?.message??'unknown'}`);
  return fromRow(inserted.data as Row);
}

export async function listOperationalSystemAiRelations(caseId:string,userId:string){
  await assertCaseServiceProfileAllowed(caseId,userId,[...SYSTEM_AI_PROFILES]);
  const service=createServiceSupabaseClient();
  const result=await service.from('sfi_case_relations').select('*').eq('case_id',caseId).in('relation_type',[...SFI_SYSTEM_AI_RELATION_TYPES]).order('created_at',{ascending:true});
  if(result.error) throw new Error(`SFI_SYSTEM_AI_RELATION_LIST_FAILED:${result.error.message}`);
  return ((result.data??[]) as Row[]).map(fromRow);
}

export async function listTenantSystemAiRelations(tenantId:string,userId:string){
  const service=createServiceSupabaseClient();
  const membership=await service.from('sfi_tenant_members').select('status').eq('tenant_id',tenantId).eq('user_id',userId).maybeSingle();
  if(membership.error) throw new Error(`SFI_SYSTEM_AI_MEMBERSHIP_READ_FAILED:${membership.error.message}`);
  if(!membership.data||membership.data.status!=='ACTIVE') throw new Error('SFI_TENANT_FORBIDDEN');
  const result=await service.from('sfi_case_relations').select('*').eq('tenant_id',tenantId).in('relation_type',[...SFI_SYSTEM_AI_RELATION_TYPES]).order('created_at',{ascending:true});
  if(result.error) throw new Error(`SFI_SYSTEM_AI_TENANT_RELATION_LIST_FAILED:${result.error.message}`);
  return ((result.data??[]) as Row[]).map(fromRow);
}
