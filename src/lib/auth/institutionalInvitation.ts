'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireFounder } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

const invitationSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  displayName: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(160),
  accessClass: z.enum(['INSTITUTIONAL_OBSERVER', 'INSTITUTIONAL_OPERATOR']),
});

export type InstitutionalAccountAccessView = {
  id: string;
  email: string;
  displayName: string;
  title: string;
  accessClass: 'INSTITUTIONAL_OBSERVER' | 'INSTITUTIONAL_OPERATOR';
  status: 'PENDING' | 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'INVITE_FAILED';
  invitedAt: string | null;
  activatedAt: string | null;
};

function accessProfile(accessClass: 'INSTITUTIONAL_OBSERVER' | 'INSTITUTIONAL_OPERATOR', title: string) {
  const observer = accessClass === 'INSTITUTIONAL_OBSERVER';
  return {
    role: observer ? 'observer' : 'operator',
    modules: {
      institutional_account: true,
      display_title: title,
      field: true,
      studio: !observer,
      observatory: true,
      world_field: true,
      root: observer,
      root_observe: observer,
      full_access: false,
      executor: false,
      root_execution: false,
      governance_write: false,
      sovereign_actions: false,
      canonical_promotion: false,
      institutional_appointment: false,
    },
  } as const;
}

function accessStatePath(state: string) {
  return `/root/access?state=${encodeURIComponent(state)}`;
}

export async function listInstitutionalAccountAccessGrants(): Promise<{
  available: boolean;
  grants: InstitutionalAccountAccessView[];
}> {
  await requireFounder();
  const service = createServiceSupabaseClient();
  const read = await service
    .from('sfi_account_access_grants')
    .select('id,email,display_name,title,access_class,status,invited_at,activated_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (read.error) {
    if (/does not exist|schema cache/i.test(read.error.message)) return { available: false, grants: [] };
    throw read.error;
  }

  const grants = (read.data ?? []).flatMap((row) => {
    const accessClass = String(row.access_class || '');
    const status = String(row.status || '');
    if (!['INSTITUTIONAL_OBSERVER', 'INSTITUTIONAL_OPERATOR'].includes(accessClass)) return [];
    if (!['PENDING', 'INVITED', 'ACTIVE', 'SUSPENDED', 'INVITE_FAILED'].includes(status)) return [];
    return [{
      id: String(row.id),
      email: String(row.email),
      displayName: String(row.display_name),
      title: String(row.title),
      accessClass: accessClass as InstitutionalAccountAccessView['accessClass'],
      status: status as InstitutionalAccountAccessView['status'],
      invitedAt: row.invited_at ? String(row.invited_at) : null,
      activatedAt: row.activated_at ? String(row.activated_at) : null,
    }];
  });
  return { available: true, grants };
}

export async function inviteInstitutionalAccountAction(formData: FormData) {
  const founder = await requireFounder();
  const parsed = invitationSchema.safeParse({
    email: String(formData.get('email') || ''),
    displayName: String(formData.get('displayName') || ''),
    title: String(formData.get('title') || ''),
    accessClass: String(formData.get('accessClass') || ''),
  });
  if (!parsed.success) redirect(accessStatePath('entrada_invalida'));

  const { email, displayName, title, accessClass } = parsed.data;
  const service = createServiceSupabaseClient();
  const existingGrant = await service
    .from('sfi_account_access_grants')
    .select('id,status,user_id')
    .eq('email', email)
    .maybeSingle();
  if (existingGrant.error && !/does not exist|schema cache/i.test(existingGrant.error.message)) {
    redirect(accessStatePath('registro_no_disponible'));
  }
  if (existingGrant.data?.status === 'ACTIVE') redirect(accessStatePath('ya_activa'));
  if (existingGrant.data?.status === 'SUSPENDED') redirect(accessStatePath('suspendida'));

  const pending = await service
    .from('sfi_account_access_grants')
    .upsert({
      email,
      display_name: displayName,
      title,
      access_class: accessClass,
      status: 'PENDING',
      invited_by: founder.user.id,
      updated_at: new Date().toISOString(),
      last_invite_error: null,
    }, { onConflict: 'email' })
    .select('id')
    .single();
  if (pending.error || !pending.data) redirect(accessStatePath('registro_no_disponible'));

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.systemfriction.org';
  const invitation = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/reset?mode=invite`,
    data: {
      display_name: displayName,
      sfi_access_class: accessClass,
      sfi_invitation: true,
    },
  });

  if (invitation.error || !invitation.data.user) {
    await service.from('sfi_account_access_grants').update({
      status: 'INVITE_FAILED',
      last_invite_error: invitation.error?.message ?? 'invite_user_missing',
      updated_at: new Date().toISOString(),
    }).eq('id', pending.data.id);
    redirect(accessStatePath('invitacion_no_enviada'));
  }

  const profile = accessProfile(accessClass, title);
  const profileWrite = await service.from('profiles').upsert({
    user_id: invitation.data.user.id,
    email,
    alias: displayName,
    role: profile.role,
    subscription_tier: 'enterprise',
    module_access: profile.modules,
    last_seen_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  if (profileWrite.error) {
    await service.from('sfi_account_access_grants').update({
      status: 'INVITE_FAILED',
      user_id: invitation.data.user.id,
      last_invite_error: 'profile_provision_failed',
      updated_at: new Date().toISOString(),
    }).eq('id', pending.data.id);
    redirect(accessStatePath('perfil_no_creado'));
  }

  const now = new Date().toISOString();
  await service.from('sfi_account_access_grants').update({
    user_id: invitation.data.user.id,
    status: 'INVITED',
    invited_at: now,
    updated_at: now,
    last_invite_error: null,
  }).eq('id', pending.data.id);

  await service.from('sfi_audit_events').insert({
    actor_id: founder.user.id,
    action: 'ACCOUNT_INVITATION_SENT',
    target_type: 'sfi_account_access_grant',
    target_id: String(pending.data.id),
    after_state: { email, displayName, title, accessClass, authorityGranted: false },
    context: {
      source: 'root_access_surface',
      accountAccessIsInstitutionalAppointment: false,
      sovereignAuthorityGranted: false,
      canonicalPromotionAllowed: false,
    },
  });

  redirect(accessStatePath('enviada'));
}
