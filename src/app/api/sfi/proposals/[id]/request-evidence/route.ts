import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { asRecord, textValue } from '@/lib/sfi/operationalConsole';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function routeId(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return typeof params.id === 'string' && params.id.trim() ? params.id.trim() : null;
}

export async function POST(req: Request, ctx: RouteContext) {
  const proposalId = await routeId(ctx);
  const body = asRecord(await req.json().catch(() => ({})));
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });

  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('action_proposals')
      .update({
        status: 'needs_evidence',
        outcome: {
          evidence_request: textValue(body.evidence_required, 'missing evidence'),
          recorded_at: new Date().toISOString(),
        },
      })
      .eq('id', proposalId)
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'request_evidence_failed' }, { status: 400 });
  }
}
