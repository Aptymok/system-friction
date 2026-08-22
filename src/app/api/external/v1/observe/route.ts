import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { authorizeExternalRequest } from '@/lib/sfi/externalAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = authorizeExternalRequest(req, 'observe');
  if (!auth.credential) {
    return NextResponse.json({
      ok: false,
      error: 'unauthorized',
      auth: {
        tokenPresent: auth.tokenPresent,
        registryConfigured: auth.registryConfigured,
        scopeAllowed: auth.scopeAllowed,
        acceptedHeaders: ['Authorization: Bearer <token>', 'X-SFI-Token: <token>'],
      },
    }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const surface = String(body.surface || 'proposals');
  const db = createServiceSupabaseClient();

  if (surface === 'proposals') {
    const r = await db.from('action_proposals').select('id,title,status,risk_level,approval_required,created_at,expected_field_delta').order('created_at', { ascending: false }).limit(50);
    return NextResponse.json({ ok: !r.error, data: r.data || [], error: r.error?.message || null });
  }
  if (surface === 'evidence') {
    const r = await db.from('sfi_evidence_ledger').select('*').order('created_at', { ascending: false }).limit(50);
    return NextResponse.json({ ok: !r.error, data: r.data || [], error: r.error?.message || null });
  }
  return NextResponse.json({ ok: false, error: 'surface_not_allowed', allowed: ['proposals', 'evidence'] }, { status: 400 });
}
