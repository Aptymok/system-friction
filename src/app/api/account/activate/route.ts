import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const context = await requireAuthenticatedUser();
  const email = context.user.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ ok: false, message: 'La cuenta autenticada no tiene un correo verificable.' }, { status: 400 });

  const service = createServiceSupabaseClient();
  const found = await service
    .from('sfi_account_access_grants')
    .select('id,user_id,status')
    .eq('email', email)
    .maybeSingle();
  if (found.error || !found.data) {
    return NextResponse.json({ ok: true, activated: false, message: 'Cuenta personal activa; no existe una invitación institucional pendiente.' });
  }
  if (found.data.user_id && found.data.user_id !== context.user.id) {
    return NextResponse.json({ ok: false, message: 'La invitación pertenece a otra identidad.' }, { status: 403 });
  }
  if (found.data.status === 'SUSPENDED') {
    return NextResponse.json({ ok: false, message: 'Este acceso está suspendido y requiere una decisión administrativa.' }, { status: 403 });
  }

  const now = new Date().toISOString();
  const updated = await service
    .from('sfi_account_access_grants')
    .update({ user_id: context.user.id, status: 'ACTIVE', activated_at: now, updated_at: now, last_invite_error: null })
    .eq('id', found.data.id)
    .in('status', ['PENDING','INVITED','ACTIVE','INVITE_FAILED']);
  if (updated.error) return NextResponse.json({ ok: false, message: 'SFI no pudo activar el acceso.' }, { status: 503 });

  return NextResponse.json({ ok: true, activated: true, message: 'Acceso activado.' });
}
