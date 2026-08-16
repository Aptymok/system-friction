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

async function materializeSystemAiEntityRefs(input:{tenantId:string;refs:SfiSystemAiEntityRef[]}){
  if(!input.refs.length)return new Map<string,SfiSystemAiEntityRef>();
  const ids=[...new Set(input.refs.map(ref=>ref.id))];
  const service=createServiceSupabaseClient();
  const result=await service.from('sfi_case_objects').select('canonical_ref,payload').eq('tenant_id',input.tenantId).in('canonical_ref->>id',ids);
  if(result.error)throw new Error(`SFI_SYSTEM_AI_ENTITY_MATERIALIZATION_FAILED:${result.error.message}`);
  const rows=(result.data??[]) as Row[];
  const resolved=new Map<string,SfiSystemAiEntityRef>();
  for(const ref of input.refs){
    const candidates=rows.filter(row=>{
      const stored=canonicalRef(row.canonical_ref);
      const payload=obj(row.payload);
      if(stored.id!==ref.id)return false;
      if(text(payload.entityType)!==ref.entityType)return false;
      if(text(payload.contract)!==SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT)return false;
      if(ref.version&&stored.version!==ref.version)return false;
      if(ref.hash&&stored.hash!==ref.hash)return false;
      return true;
    });
    const identities=[...new Map(candidates.map(row=>{const stored=canonicalRef(row.canonical_ref);return[refKey(stored),stored];})).values()];
    if(identities.length!==1)throw new Error(identities.length?'SFI_SYSTEM_AI_ENTITY_REFERENCE_AMBIGUOUS':'SFI_SYSTEM_AI_ENTITY_REFERENCE_NOT_FOUND');
    const stored=identities[0];
    resolved.set(entityKey(ref),{...stored,entityType:ref.entityType});
  }
  return resolved;
}

function exactRelationEndpoint(ref:SfiSystemAiEntityRef,objectRef:SfiCanonicalRef,objectEntityType:string,resolved:Map<string,SfiSystemAiEntityRef>){
  if(ref.id===objectRef.id){
    if(ref.entityType!==objectEntityType)throw new Error('SFI_SYSTEM_AI_PACKAGE_OBJECT_ENDPOINT_TYPE_MISMATCH');
    return{...objectRef,entityType:ref.entityType};
  }
  const exact=resolved.get(entityKey(ref));
  if(!exact)throw new Error(`SFI_SYSTEM_AI_ENTITY_REFERENCE_NOT_FOUND:${ref.entityType}:${ref.id}`);
  return exact;
}

export async function persistOperationalSystemAiIntakePackage(input:{caseId:string;userId:string;packet:SfiSystemAiIntakePackage}){
  if(input.packet.contract!==SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT) throw new Error('SFI_SYSTEM_AI_PACKET_CONTRACT_INVALID');
  await assertCaseServiceProfileAllowed(input.caseId,input.userId,[...SYSTEM_AI_PROFILES]);
  const authority=await readCaseAuthorityRole(input.caseId,input.userId);
  if(!['OWNER','ADMIN','OPERATOR'].includes(authority.role)) throw new Error('SFI_TENANT_WRITE_FORBIDDEN');
  if(['CLOSED','REJECTED'].includes(authority.status)) throw new Error(`SFI_SYSTEM_AI_INTAKE_FORBIDDEN:${authority.status}`);

  const entityType=typeof input.packet.object.payload.entityType==='string'?input.packet.object.payload.entityType.trim():'';
  if(!entityType) throw new Error('SFI_SYSTEM_AI_PACKET_OBJECT_ENTITY_TYPE_REQUIRED');
  if(input.packet.object.payload.contract!==SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT)throw new Error('SFI_SYSTEM_AI_PACKET_OBJECT_DOMAIN_INVALID');
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
  }

  const externalEndpoints=uniqueEntityRefs(input.packet.relations.flatMap(relation=>[relation.from,relation.to]).filter(ref=>ref.id!==canonical.id));
  await assertTenantSystemAiEntityRefs({caseId:input.caseId,userId:input.userId,entityRefs:externalEndpoints});
  const exactEndpoints=await materializeSystemAiEntityRefs({tenantId:authority.tenantId,refs:externalEndpoints});
  const relations=input.packet.relations.map(relation=>({
    ...relation,
    from:exactRelationEndpoint(relation.from,canonical,entityType,exactEndpoints),
    to:exactRelationEndpoint(relation.to,canonical,entityType,exactEndpoints),
  }));

  const allSourceRefs=uniqueRefs([...(object.sourceRefs??[]),...relations.flatMap(relation=>relation.sourceRefs??[])]);
  const allRecordRefs=uniqueRefs([...(object.recordRefs??[]),...relations.flatMap(relation=>relation.recordRefs??[])]);
  const allEvidenceRefs=uniqueRefs([...(object.evidenceRefs??[]),...relations.flatMap(relation=>relation.evidenceRefs??[])]);
  await assertCaseReferenceIntegrity({caseId:input.caseId,userId:input.userId,sourceRefs:allSourceRefs,recordRefs:allRecordRefs,evidenceRefs:allEvidenceRefs});

  const service=createServiceSupabaseClient();
  const result=await service.rpc('sfi_record_system_ai_intake_package_v1',{
    p_case_id:input.caseId,
    p_actor_id:input.userId,
    p_object:object,
    p_relations:relations,
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
  const exactEndpoints=await materializeSystemAiEntityRefs({tenantId:authority.tenantId,refs:uniqueEntityRefs([input.relation.from,input.relation.to])});
  const relation={
    ...input.relation,
    from:exactEndpoints.get(entityKey(input.relation.from))??input.relation.from,
    to:exactEndpoints.get(entityKey(input.relation.to))??input.relation.to,
  };
  const service=createServiceSupabaseClient();
  const result=await service.rpc('sfi_record_system_ai_relation_v1',{
    p_case_id:input.caseId,
    p_actor_id:input.userId,
    p_relation:relation,
  });
  if(result.error)throw new Error(`SFI_SYSTEM_AI_RELATION_WRITE_FAILED:${result.error.message}`);
  const payload=obj(result.data);
  const row=obj(payload.relation);
  if(!text(row.id))throw new Error('SFI_SYSTEM_AI_RELATION_WRITE_RESULT_INVALID');
  return fromRow(row);
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
