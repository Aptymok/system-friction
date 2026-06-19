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
  const recoveryId = await routeId(ctx);
  if (!recoveryId) return NextResponse.json({ ok: false, error: 'missing_recovery_id' }, { status: 400 });

  try {
    const body = asRecord(await req.json().catch(() => ({})));
    const supabase = createServiceSupabaseClient();
    const { data: recovery, error: recoveryError } = await supabase
      .from('vw_sfi_execution_recovery_queue')
      .select('*')
      .or(`id.eq.${recoveryId},proposal_id.eq.${recoveryId}`)
      .limit(1)
      .maybeSingle();
    if (recoveryError) throw recoveryError;
    if (!recovery) return NextResponse.json({ ok: false, error: 'recovery_item_not_found' }, { status: 404 });

    const proposalId = recovery.proposal_id ?? recovery.id;
    const objective = textValue(body.objective, textValue(recovery.objective, textValue(recovery.title, 'missing execution plan')));
    const expectedEffect = textValue(body.expected_effect, 'missing expected effect');
    const evidenceRequired = textValue(body.evidence_required, 'missing evidence');
    const verificationWindow = textValue(body.verification_window, 'missing verification window');

    const { data: ledger, error: ledgerError } = await supabase
      .from('sfi_execution_ledger')
      .insert({
        case_id: textValue(body.case_id, 'SFI-OPS-001'),
        actor: 'sfi_console',
        artifact_type: 'execution_plan',
        execution_status: 'pending',
        verification_status: 'unverified',
        source_payload: {
          proposal_id: proposalId,
          recovery_id: recovery.id,
          objective,
          action_type: textValue(body.action_type, textValue(recovery.proposal_type, 'proposal_recovery')),
          expected_effect: expectedEffect,
          evidence_required: evidenceRequired,
          verification_window: verificationWindow,
          external_execution_allowed: false,
        },
      })
      .select('*')
      .single();
    if (ledgerError) throw ledgerError;

    await supabase
      .from('action_proposals')
      .update({
        status: 'queued',
        outcome: {
          execution_plan_id: ledger.id,
          objective,
          expected_effect: expectedEffect,
          evidence_required: evidenceRequired,
          verification_window: verificationWindow,
          external_execution_allowed: false,
          prepared_at: new Date().toISOString(),
        },
      })
      .eq('id', proposalId);

    return NextResponse.json({ ok: true, data: ledger });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'prepare_execution_failed' }, { status: 400 });
  }
}
