import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type InstitutionalAccessClass = 'INSTITUTIONAL_OBSERVER' | 'INSTITUTIONAL_OPERATOR';

function institutionalProfile(accessClass: InstitutionalAccessClass, title: string) {
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

export async function POST() {
  const context = await requireAuthenticatedUser();
  const email = context.user.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { ok: false, activated: false, message: 'La cuenta autenticada no tiene un correo verificable.' },
      { status: 400 },
    );
  }

  const service = createServiceSupabaseClient();
  const found = await service
    .from('sfi_account_access_grants')
    .select('id,user_id,status,display_name,title,access_class,last_invite_error')
    .eq('email', email)
    .maybeSingle();

  if (found.error) {
    return NextResponse.json(
      { ok: false, activated: false, message: 'SFI no pudo verificar el acceso institucional.' },
      { status: 503 },
    );
  }
  if (!found.data) {
    return NextResponse.json({
      ok: true,
      activated: false,
      message: 'Cuenta personal activa; no existe una invitación institucional pendiente.',
    });
  }
  if (found.data.user_id && found.data.user_id !== context.user.id) {
    return NextResponse.json(
      { ok: false, activated: false, message: 'La invitación pertenece a otra identidad.' },
      { status: 403 },
    );
  }
  if (found.data.status === 'SUSPENDED') {
    return NextResponse.json(
      { ok: false, activated: false, message: 'Este acceso está suspendido y requiere una decisión administrativa.' },
      { status: 403 },
    );
  }

  const retryingVerifiedProfileProvision =
    found.data.status === 'INVITE_FAILED' &&
    found.data.last_invite_error === 'activation_profile_provision_failed' &&
    found.data.user_id === context.user.id;
  const activationAllowed =
    found.data.status === 'INVITED' ||
    found.data.status === 'ACTIVE' ||
    retryingVerifiedProfileProvision;

  if (!activationAllowed) {
    return NextResponse.json(
      {
        ok: false,
        activated: false,
        message: 'La invitación todavía no está en un estado verificable para activación.',
      },
      { status: 409 },
    );
  }

  const accessClass = String(found.data.access_class);
  if (accessClass !== 'INSTITUTIONAL_OBSERVER' && accessClass !== 'INSTITUTIONAL_OPERATOR') {
    return NextResponse.json(
      { ok: false, activated: false, message: 'La clase de acceso institucional no es válida.' },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const profile = institutionalProfile(accessClass, String(found.data.title || 'Acceso institucional'));
  const profileWrite = await service.from('profiles').upsert({
    user_id: context.user.id,
    email,
    alias: String(found.data.display_name || email.split('@')[0] || 'member'),
    role: profile.role,
    subscription_tier: 'enterprise',
    module_access: profile.modules,
    last_seen_at: now,
    updated_at: now,
  }, { onConflict: 'user_id' });

  if (profileWrite.error) {
    await service.from('sfi_account_access_grants').update({
      user_id: context.user.id,
      status: 'INVITE_FAILED',
      last_invite_error: 'activation_profile_provision_failed',
      updated_at: now,
    }).eq('id', found.data.id);

    return NextResponse.json(
      {
        ok: false,
        activated: false,
        passwordAccepted: true,
        message: 'La identidad quedó verificada, pero SFI no pudo preparar el perfil institucional.',
      },
      { status: 503 },
    );
  }

  const allowedUpdateStates = retryingVerifiedProfileProvision
    ? ['INVITE_FAILED']
    : ['INVITED', 'ACTIVE'];
  const updated = await service
    .from('sfi_account_access_grants')
    .update({
      user_id: context.user.id,
      status: 'ACTIVE',
      activated_at: now,
      updated_at: now,
      last_invite_error: null,
    })
    .eq('id', found.data.id)
    .in('status', allowedUpdateStates)
    .select('id,status,activated_at')
    .maybeSingle();

  if (updated.error || !updated.data || updated.data.status !== 'ACTIVE') {
    return NextResponse.json(
      {
        ok: false,
        activated: false,
        passwordAccepted: true,
        message: 'La identidad quedó verificada, pero SFI no confirmó la activación institucional.',
      },
      { status: 503 },
    );
  }

  await service.from('sfi_audit_events').insert({
    actor_id: context.user.id,
    action: 'ACCOUNT_INVITATION_ACTIVATED',
    target_type: 'sfi_account_access_grant',
    target_id: String(found.data.id),
    after_state: {
      email,
      accessClass,
      status: 'ACTIVE',
      authorityGranted: false,
    },
    context: {
      source: 'account_activation_route',
      accountAccessIsInstitutionalAppointment: false,
      sovereignAuthorityGranted: false,
      canonicalPromotionAllowed: false,
    },
  });

  return NextResponse.json({ ok: true, activated: true, message: 'Acceso institucional activado.' });
}
