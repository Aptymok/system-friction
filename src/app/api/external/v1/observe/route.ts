import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { authorizeExternalRequest } from '@/lib/sfi/externalAuth';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

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

  const body = await req.json().catch(() => ({})) as Row;
  const surface = String(body.surface || 'proposals');
  const db = createServiceSupabaseClient();

  if (surface === 'proposals') {
    const r = await db.from('action_proposals').select('id,title,status,risk_level,approval_required,created_at,expected_field_delta').order('created_at', { ascending: false }).limit(50);
    return NextResponse.json({ ok: !r.error, data: r.data || [], error: r.error?.message || null });
  }

  if (surface === 'evidence') {
    const [root, ledger] = await Promise.all([
      db.from('root_evidence_entries')
        .select('id,title,evidence_type,epistemic_event_id,created_at')
        .order('created_at', { ascending: false })
        .limit(25),
      db.from('sfi_evidence_ledger')
        .select('id,case_id,module,evidence_kind,source_name,source_url,evidence_hash,trust_level,trust_score,observed_at,created_at')
        .order('created_at', { ascending: false })
        .limit(25),
    ]);
    const rootRows = Array.isArray(root.data) ? root.data.map((item) => ({
      ...item,
      evidenceSource: 'root_evidence_entries',
      runtimeEvidenceId: item.id,
      methodLabCompatible: true,
    })) : [];
    const ledgerRows = Array.isArray(ledger.data) ? ledger.data.map((item) => ({
      ...item,
      evidenceSource: 'sfi_evidence_ledger',
      runtimeEvidenceId: item.id,
      methodLabCompatible: true,
    })) : [];
    const errors = [
      root.error ? `root_evidence_entries:${root.error.message}` : null,
      ledger.error ? `sfi_evidence_ledger:${ledger.error.message}` : null,
    ].filter(Boolean);
    return NextResponse.json({
      ok: errors.length === 0,
      data: [...rootRows, ...ledgerRows].sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))).slice(0, 50),
      sources: ['root_evidence_entries', 'sfi_evidence_ledger'],
      methodLabEvidenceContract: 'runtimeEvidenceId may reference either listed persisted evidence source; Method Lab resolves source explicitly.',
      error: errors.length ? errors : null,
    });
  }

  return NextResponse.json({ ok: false, error: 'surface_not_allowed', allowed: ['proposals', 'evidence'] }, { status: 400 });
}
