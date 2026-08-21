import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { asRecord, buildAlignmentAssessment, readActiveOperationalAttractor } from '@/lib/sfi/operationalConsole';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function routeId(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return typeof params.id === 'string' && params.id.trim() ? params.id.trim() : null;
}

export async function POST(req: Request, ctx: RouteContext) {
  const proposalId = await routeId(ctx);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });

  try {
    const body = asRecord(await req.json().catch(() => ({})));
    const supabase = createServiceSupabaseClient();
    const [{ data: proposal, error: proposalError }, attractorResult] = await Promise.all([
      supabase.from('action_proposals').select('*').eq('id', proposalId).maybeSingle(),
      readActiveOperationalAttractor(),
    ]);
    if (proposalError) throw proposalError;
    if (!attractorResult.ok) throw new Error(attractorResult.error || 'attractor_read_failed');
    if (!proposal) return NextResponse.json({ ok: false, error: 'proposal_not_found' }, { status: 404 });

    const attractor = attractorResult.data;
    const alignment = buildAlignmentAssessment({ proposal, attractor, body });
    const { data, error } = await supabase
      .from('sfi_proposal_alignment')
      .insert({
        proposal_id: proposalId,
        attractor_id: attractor?.id ?? null,
        ...alignment,
      })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data, attractor_key: attractor?.attractor_key ?? null });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'proposal_align_failed' }, { status: 400 });
  }
}
