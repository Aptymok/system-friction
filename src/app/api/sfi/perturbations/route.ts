import { NextResponse } from 'next/server';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createActionProposal } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { asRecord, textValue } from '@/lib/sfi/operationalConsole';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = asRecord(await req.json().catch(() => ({})));
  const title = textValue(body.title);
  const intention = textValue(body.intention);
  const desiredFutureState = textValue(body.desired_future_state);
  const evidenceExpected = textValue(body.evidence_expected);
  const caseId = textValue(body.case_id);
  const targetVector = textValue(body.target_vector);
  const timeWindow = textValue(body.time_window);

  if (!title || !intention || !desiredFutureState || !evidenceExpected || !caseId || !targetVector || !timeWindow) {
    return NextResponse.json({
      ok: false,
      error: 'title_intention_desired_future_state_evidence_expected_case_id_target_vector_and_time_window_required',
    }, { status: 400 });
  }

  try {
    const payload = {
      title,
      intention,
      target_vector: targetVector,
      target_node: textValue(body.target_node) || null,
      desired_future_state: desiredFutureState,
      time_window: timeWindow,
      evidence_expected: evidenceExpected,
      risk_tolerance: textValue(body.risk_tolerance) || 'unassessed',
      object_present: Boolean(body.object_present),
      object_reference: textValue(body.object_reference) || null,
      case_id: caseId,
    };

    const event = await appendEpistemicEvent({
      eventName: 'sfi.perturbation.declared',
      epistemicClass: 'declared',
      confidence: 1,
      payload,
      occurredAt: new Date().toISOString(),
      source: { sourceId: 'sfi-console', sourceType: 'sfi_console' },
      logbookId: 'SFI',
      lineage: [],
    });
    if (!event.ok) return NextResponse.json(event, { status: 400 });

    const supabase = createServiceSupabaseClient();
    const { data: perturbation, error: perturbationError } = await supabase
      .from('sfi_field_perturbations')
      .insert({
        case_id: caseId,
        perturbation_type: 'declared_intervention_candidate',
        target_domain: targetVector,
        target_audience: payload.target_node,
        minimal_action: title,
        expected_effect: desiredFutureState,
        risk_level: payload.risk_tolerance,
        status: 'candidate',
        source_pipeline: {
          epistemic_event_id: event.data.id,
          ...payload,
        },
      })
      .select('*')
      .single();
    if (perturbationError) throw perturbationError;

    const proposal = await createActionProposal({
      proposalType: 'perturbation_execution',
      actorId: 'sfi_console',
      title: `Execute perturbation: ${title}`,
      objective: `Create a governed execution path for ${title}. Evidence required: ${evidenceExpected}. Expected effect: ${desiredFutureState}. Verification window: ${timeWindow}.`,
      status: 'draft',
      eventId: event.data.id,
      payload: {
        perturbation_id: perturbation.id,
        ...payload,
      },
    });
    if (!proposal.ok) return NextResponse.json(proposal, { status: 400 });

    await supabase
      .from('sfi_field_perturbations')
      .update({ proposal_id: proposal.data.id })
      .eq('id', perturbation.id);

    return NextResponse.json({ ok: true, data: { event: event.data, perturbation, proposal: proposal.data } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'perturbation_create_failed' }, { status: 400 });
  }
}
