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

  if (!title || !intention || !desiredFutureState || !evidenceExpected) {
    return NextResponse.json({
      ok: false,
      error: 'title_intention_desired_future_state_and_evidence_expected_required',
    }, { status: 400 });
  }

  try {
    const payload = {
      title,
      intention,
      target_vector: textValue(body.target_vector, 'missing target vector'),
      target_node: textValue(body.target_node, ''),
      desired_future_state: desiredFutureState,
      time_window: textValue(body.time_window, 'missing verification window'),
      evidence_expected: evidenceExpected,
      risk_tolerance: textValue(body.risk_tolerance, 'medium'),
      object_present: Boolean(body.object_present),
      object_reference: textValue(body.object_reference, ''),
    };

    const event = await appendEpistemicEvent({
      eventName: 'sfi.perturbation.declared',
      epistemicClass: 'observed',
      confidence: 0.8,
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
        case_id: textValue(body.case_id, 'SFI-OPS-001'),
        perturbation_type: 'reality_editing_console',
        target_domain: payload.target_vector,
        target_audience: payload.target_node || null,
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
      objective: `Create governed execution path for ${title}. Evidence required: ${evidenceExpected}. Expected effect: ${desiredFutureState}. Verification window: ${payload.time_window}.`,
      status: 'draft',
      eventId: event.data.id,
      payload: {
        perturbation_id: perturbation.id,
        ...payload,
        data_honesty: payload.object_present ? 'object reference provided' : 'no object analysis without object',
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
