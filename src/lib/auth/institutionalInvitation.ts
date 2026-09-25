'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireFounder } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readContinuityInstitutionalAccountAccessGrants } from '@/lib/sfi/continuityPostgres';
import { deliverInstitutionalInvitation } from '@/lib/auth/institutionalInvitationDelivery';

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
  lastInviteError: string | null;
};

type InstitutionalAccountAccessSource = 'SUPABASE' | 'NEON_CONTINUITY' | 'UNAVAILABLE';

function normalizeInstitutionalAccountAccessRows(rows: unknown[]): InstitutionalAccountAccessView[] {
  return rows.flatMap((raw) => {
    const row = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : {};
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
      lastInviteError: row.last_invite_error ? String(row.last_invite_error) : null,
    }];
  });
}

function accessStatePath(state: string) {
  return `/root/access?state=${encodeURIComponent(state)}`;
}

export async function listInstitutionalAccountAccessGrants(): Promise<{
  available: boolean;
  grants: InstitutionalAccountAccessView[];
  source: InstitutionalAccountAccessSource;
}> {
  await requireFounder();
  const service = createServiceSupabaseClient();
  const read = await service
    .from('sfi_account_access_grants')
    .select('id,email,display_name,title,access_class,status,invited_at,activated_at,last_invite_error')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!read.error) {
    return {
      available: true,
      grants: normalizeInstitutionalAccountAccessRows(read.data ?? []),
      source: 'SUPABASE',
    };
  }

  const continuityRows = await readContinuityInstitutionalAccountAccessGrants(50).catch(() => null);
  if (continuityRows) {
    return {
      available: true,
      grants: normalizeInstitutionalAccountAccessRows([...continuityRows]),
      source: 'NEON_CONTINUITY',
    };
  }

  return { available: false, grants: [], source: 'UNAVAILABLE' };
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

  const now = new Date().toISOString();
  const previousStatus = existingGrant.data?.status ?? null;
  let grantId: string;

  if (existingGrant.data) {
    const prepared = await service
      .from('sfi_account_access_grants')
      .update({
        display_name: displayName,
        title,
        access_class: accessClass,
        invited_by: founder.user.id,
        updated_at: now,
        last_invite_error: null,
      })
      .eq('id', existingGrant.data.id)
      .select('id')
      .single();
    if (prepared.error || !prepared.data) redirect(accessStatePath('registro_no_disponible'));
    grantId = String(prepared.data.id);
  } else {
    const prepared = await service
      .from('sfi_account_access_grants')
      .insert({
        email,
        display_name: displayName,
        title,
        access_class: accessClass,
        status: 'PENDING',
        invited_by: founder.user.id,
        updated_at: now,
        last_invite_error: null,
      })
      .select('id')
      .single();
    if (prepared.error || !prepared.data) redirect(accessStatePath('registro_no_disponible'));
    grantId = String(prepared.data.id);
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.systemfriction.org';
  const invitation = await deliverInstitutionalInvitation({
    service,
    email,
    displayName,
    title,
    accessClass,
    redirectTo: `${origin}/reset?mode=invite`,
  });

  if (!invitation.ok) {
    const inviteError = invitation.error;
    await service.from('sfi_account_access_grants').update({
      status: previousStatus === 'INVITED' ? 'INVITED' : 'INVITE_FAILED',
      last_invite_error: inviteError,
      updated_at: new Date().toISOString(),
    }).eq('id', grantId);
    redirect(accessStatePath(/rate limit|too many requests/i.test(inviteError) ? 'limite_correo' : 'invitacion_no_enviada'));
  }

  const invitedAt = new Date().toISOString();
  await service.from('sfi_account_access_grants').update({
    user_id: invitation.userId,
    status: 'INVITED',
    invited_at: invitedAt,
    activated_at: null,
    updated_at: invitedAt,
    last_invite_error: null,
  }).eq('id', grantId);

  await service.from('sfi_audit_events').insert({
    actor_id: founder.user.id,
    action: 'ACCOUNT_INVITATION_SENT',
    target_type: 'sfi_account_access_grant',
    target_id: grantId,
    after_state: {
      email,
      displayName,
      title,
      accessClass,
      status: 'INVITED',
      profileProvisioned: false,
      authorityGranted: false,
    },
    context: {
      source: 'root_access_surface',
      profileProvisioningOwner: 'account_activation_route',
      accountAccessIsInstitutionalAppointment: false,
      sovereignAuthorityGranted: false,
      canonicalPromotionAllowed: false,
      deliveryChannel: invitation.channel,
    },
  });

  redirect(accessStatePath('enviada'));
}
