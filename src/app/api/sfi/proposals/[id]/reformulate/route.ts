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
  const objective = textValue(body.objective);
  if (!proposalId) return NextResponse.json({ ok: false, error: 'missing_proposal_id' }, { status: 400 });
  if (!objective) return NextResponse.json({ ok: false, error: 'objective_required' }, { status: 400 });

  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('action_proposals')
      .update({
        status: 'reformulated',
        objective,
        description: textValue(body.description, objective),
        outcome: {
          reformulated_against_attractor: true,
          expected_effect: textValue(body.expected_effect, 'missing expected effect'),
          evidence_required: textValue(body.evidence_required, 'missing evidence'),
          verification_window: textValue(body.verification_window, 'missing verification window'),
          recorded_at: new Date().toISOString(),
        },
      })
      .eq('id', proposalId)
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'reformulate_failed' }, { status: 400 });
  }
}
