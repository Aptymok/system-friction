import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { appendOperationalEvent, requireGovernedActor, recordValue } from '@/lib/operational/common';
import { analyzeMihmInput } from '@/lib/operational/mihmAnalysis';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireGovernedActor('mihm.process');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const contentType = req.headers.get('content-type') ?? '';
  const input = contentType.includes('application/json') ? await req.json().catch(() => ({})) : await req.text();
  const analysis = analyzeMihmInput(input);
  const inputKind = contentType.includes('application/json') ? 'json' : 'text';
  const event = await appendOperationalEvent({
    eventName: 'mihm.analysis.created',
    actorId: gate.ctx.user.id,
    confidence: analysis.confidence,
    payload: { ...analysis, input_type: contentType || 'text/plain' },
    lineage: [analysis.input_hash],
  });
  if (!event.ok) return NextResponse.json(event, { status: 400 });

  const visibleVariables = {
    detected_dimensions: analysis.detected_dimensions,
    claims: analysis.claims,
    evidence: analysis.evidence,
    source: 'api_mihm_process',
  };
  const sensitiveVariables = {
    tensions: analysis.tensions,
    risks: analysis.risks,
    actor_id: gate.ctx.user.id,
    payload: { input: recordValue(input), contentType },
  };

  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('mihm_analyses')
    .insert({
      event_id: event.data.id,
      input_kind: inputKind,
      input_ref: analysis.input_hash,
      visible_variables: visibleVariables,
      sensitive_variables: sensitiveVariables,
      confidence: analysis.confidence,
      homeostatic_vector: analysis.homeostatic_vector,
      uncertainty: analysis.confidence >= 0.7 ? 'low' : analysis.confidence >= 0.45 ? 'medium' : 'high',
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ ok: false, error: 'mihm_analysis_insert_failed', details: error.message, data: analysis }, { status: 400 });
  return NextResponse.json({ ok: true, data: { ...analysis, id: data.id, eventId: event.data.id } }, { status: 201 });
}
