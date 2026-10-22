import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { requireAuthenticatedUser } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Validate an existing Supabase email session against the bound institutional
 * grant. This permits personal identities to accept a later ROOT invitation
 * without granting ROOT or treating an unrelated login as activation.
 */
export async function GET() {
  try {
    const context = await requireAuthenticatedUser();
    if (context.authProvider !== 'supabase') {
      return NextResponse.json({ ok: true, eligible: false }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const email = context.user.email?.trim().toLowerCase();
    if (!email || !context.user.email_confirmed_at) {
      return NextResponse.json({ ok: true, eligible: false }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const grant = await createServiceSupabaseClient()
      .from('sfi_account_access_grants')
      .select('user_id,status')
      .eq('email', email)
      .maybeSingle();
    if (grant.error) {
      return NextResponse.json({ ok: false, eligible: false }, {
        status: 503, headers: { 'Cache-Control': 'no-store' },
      });
    }
    const eligible = grant.data?.user_id === context.user.id
      && (grant.data?.status === 'INVITED' || grant.data?.status === 'ACTIVE');
    return NextResponse.json({ ok: true, eligible, status: eligible ? grant.data?.status : null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, eligible: false }, {
      status: 401, headers: { 'Cache-Control': 'no-store' },
    });
  }
}
