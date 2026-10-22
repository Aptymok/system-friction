'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireFounder } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { canonicalFounderUserId } from '@/lib/system/access/founderAuthority';

type AccessClass = 'INSTITUTIONAL_OBSERVER' | 'INSTITUTIONAL_OPERATOR';
type Grant = {
  id:string; email:string; user_id:string|null;
  access_class:AccessClass; status:string;
};
type Service = ReturnType<typeof createServiceSupabaseClient>;

function exit(state:string):never {
  redirect(`/root/access?state=${encodeURIComponent(state)}`);
}

async function target(service:Service,id:string):Promise<Grant>{
  const result=await service.from('sfi_account_access_grants')
    .select('id,email,user_id,access_class,status').eq('id',id).maybeSingle();
  if(result.error || !result.data) exit('cuenta_no_encontrada');
  return result.data as Grant;
}

function protect(actorId:string, grant:Grant) {
  if(actorId===grant.user_id || canonicalFounderUserId({userId:grant.user_id,email:grant.email})) {
    exit('cuenta_protegida');
  }
}

async function safeProfile(service:Service, grant:Grant) {
  if(!grant.user_id)return null;
  const result=await service.from('profiles').select('user_id,role,module_access')
    .eq('user_id',grant.user_id).maybeSingle();
  if(result.error)exit('perfil_no_disponible');
  const p=result.data;
  if(p){
    const role=String(p.role||'').toLowerCase();
    const access=p.module_access && typeof p.module_access==='object'&&!Array.isArray(p.module_access)
      ? p.module_access as Record<string,unknown> : {};
    if(!['observer','operator'].includes(role)
      || access.full_access===true || access.sovereign_actions===true
      || access.governance_write===true || access.root_execution===true
      || access.canonical_promotion===true || (access.root===true && access.institutional_account!==true)){
      exit('cuenta_protegida');
    }
  }
  return p;
}

function restrictedModules(old:unknown, accessClass:AccessClass, suspended=false){
  const values=old&&typeof old==='object'&&!Array.isArray(old)?old as Record<string,unknown>:{};
  const observer=accessClass==='INSTITUTIONAL_OBSERVER';
  return {
    ...values,
    institutional_account:!suspended,
    field:!suspended,
    studio:!suspended&&!observer,
    observatory:!suspended,
    world_field:!suspended,
    root:false,
    root_observe:!suspended&&observer,
    full_access:false,
    executor:false,
    root_execution:false,
    governance_write:false,
    sovereign_actions:false,
    canonical_promotion:false,
    institutional_appointment:false,
  };
}

async function audit(service:Service,actorId:string,action:string,grant:Grant,details:Record<string,unknown>){
  const recorded=await service.from('sfi_audit_events').insert({
    actor_id:actorId,action,
    target_type:'sfi_account_access_grant',target_id:grant.id,
    after_state:{email:grant.email,...details},
    context:{source:'root_access_surface',founderOnly:true,
      authorityExpansion:false,evidenceDeletionAllowed:false},
  });
  if(recorded.error)throw new Error('La auditoría de ACCESS no pudo registrarse.');
}

/** Changes institutional class only; ROOT and sovereign authority are never assignable. */
export async function changeInstitutionalAccountPermissionsAction(formData:FormData){
  const founder=await requireFounder();
  const parsed=z.object({
    grantId:z.string().uuid(),
    accessClass:z.enum(['INSTITUTIONAL_OBSERVER','INSTITUTIONAL_OPERATOR']),
  }).safeParse({grantId:formData.get('grantId'),accessClass:formData.get('accessClass')});
  if(!parsed.success)exit('entrada_invalida');

  const service=createServiceSupabaseClient();
  const grant=await target(service,parsed.data.grantId);
  protect(founder.user.id,grant);
  if(!['ACTIVE','INVITED'].includes(grant.status))exit('cuenta_no_editable');
  const profile=await safeProfile(service,grant);
  if(grant.access_class===parsed.data.accessClass)exit('sin_cambios');

  await audit(service,founder.user.id,'ACCOUNT_ACCESS_CHANGE_REQUESTED',grant,{
    from:grant.access_class,to:parsed.data.accessClass,
  });
  const update=await service.from('sfi_account_access_grants')
    .update({access_class:parsed.data.accessClass,updated_at:new Date().toISOString()})
    .eq('id',grant.id).eq('status',grant.status).eq('access_class',grant.access_class)
    .select('id').maybeSingle();
  if(update.error||!update.data)exit('conflicto_permisos');

  if(grant.status==='ACTIVE'&&grant.user_id&&profile){
    const changed=await service.from('profiles').update({
      role:parsed.data.accessClass==='INSTITUTIONAL_OBSERVER'?'observer':'operator',
      module_access:restrictedModules(profile.module_access,parsed.data.accessClass),
      updated_at:new Date().toISOString(),
    }).eq('user_id',grant.user_id).select('user_id').maybeSingle();
    if(changed.error||!changed.data){
      await service.from('sfi_account_access_grants')
        .update({access_class:grant.access_class,updated_at:new Date().toISOString()})
        .eq('id',grant.id).eq('access_class',parsed.data.accessClass);
      exit('perfil_no_actualizado');
    }
  }
  await audit(service,founder.user.id,'ACCOUNT_ACCESS_CLASS_CHANGED',grant,{
    from:grant.access_class,to:parsed.data.accessClass,status:grant.status,
  });
  exit('permisos_actualizados');
}

/** Immediately revokes the institutional grant before changing the profile. */
export async function suspendInstitutionalAccountAction(formData:FormData){
  const founder=await requireFounder();
  const parsed=z.string().uuid().safeParse(formData.get('grantId'));
  if(!parsed.success)exit('entrada_invalida');
  const service=createServiceSupabaseClient();
  const grant=await target(service,parsed.data);
  protect(founder.user.id,grant);
  if(grant.status==='SUSPENDED')exit('sin_cambios');
  const profile=await safeProfile(service,grant);

  await audit(service,founder.user.id,'ACCOUNT_SUSPENSION_REQUESTED',grant,{previousStatus:grant.status});
  const changed=await service.from('sfi_account_access_grants')
    .update({status:'SUSPENDED',updated_at:new Date().toISOString()})
    .eq('id',grant.id).eq('status',grant.status).select('id').maybeSingle();
  if(changed.error||!changed.data)exit('conflicto_permisos');
  if(profile&&grant.user_id){
    const restriction=await service.from('profiles').update({
      role:'observer',module_access:restrictedModules(profile.module_access,grant.access_class,true),
      updated_at:new Date().toISOString(),
    }).eq('user_id',grant.user_id);
    if(restriction.error)exit('suspendida_revisar_perfil');
  }
  await audit(service,founder.user.id,'ACCOUNT_ACCESS_SUSPENDED',grant,{
    status:'SUSPENDED',reversible:true,
  });
  exit('cuenta_suspendida');
}

/**
 * Soft-deletes an Auth identity only after typed-email confirmation.
 * Preserves scientific records, previous audit rows and existing evidence.
 */
export async function deleteInstitutionalAccountAction(formData:FormData){
  const founder=await requireFounder();
  const parsed=z.object({grantId:z.string().uuid(),confirmation:z.string().email()})
    .safeParse({grantId:formData.get('grantId'),confirmation:formData.get('confirmation')});
  if(!parsed.success)exit('eliminacion_no_confirmada');
  const service=createServiceSupabaseClient();
  const grant=await target(service,parsed.data.grantId);
  if(parsed.data.confirmation.trim().toLowerCase()!==grant.email)exit('eliminacion_no_confirmada');
  protect(founder.user.id,grant);
  const profile=await safeProfile(service,grant);

  // This exact Auth identity must still correspond to the grant's email.
  if(grant.user_id){
    const existing=await service.auth.admin.getUserById(grant.user_id);
    if(existing.error||!existing.data.user||
      existing.data.user.email?.trim().toLowerCase()!==grant.email){
      exit('identidad_no_verificada');
    }
  }

  await audit(service,founder.user.id,'ACCOUNT_IDENTITY_REMOVAL_REQUESTED',grant,{
    previousStatus:grant.status,authIdentitySoftDeleteRequested:Boolean(grant.user_id),
    institutionalEvidenceRetained:true,
  });
  const revoked=await service.from('sfi_account_access_grants').update({
    status:'SUSPENDED',updated_at:new Date().toISOString(),
  }).eq('id',grant.id).eq('status',grant.status).select('id').maybeSingle();
  if(revoked.error||!revoked.data)exit('conflicto_permisos');

  if(profile&&grant.user_id){
    const restrict=await service.from('profiles').update({
      role:'observer',module_access:restrictedModules(profile.module_access,grant.access_class,true),
      updated_at:new Date().toISOString(),
    }).eq('user_id',grant.user_id);
    if(restrict.error)exit('suspendida_revisar_perfil');
  }
  if(grant.user_id){
    const removal=await service.auth.admin.deleteUser(grant.user_id,true);
    if(removal.error)exit('identidad_no_eliminada');
  }
  const removed=await service.from('sfi_account_access_grants').delete()
    .eq('id',grant.id).eq('status','SUSPENDED').select('id').maybeSingle();
  if(removed.error||!removed.data)exit('eliminada_pendiente_depuracion');
  await audit(service,founder.user.id,'ACCOUNT_IDENTITY_REMOVED',grant,{
    institutionalAccessRemoved:true,
    authIdentitySoftDeleted:Boolean(grant.user_id),
    researchEvidenceRetained:true,
  });
  exit('cuenta_eliminada');
}
