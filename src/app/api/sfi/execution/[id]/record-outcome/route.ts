import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { asRecord, numericValue, textValue } from '@/lib/sfi/operationalConsole';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function routeId(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return typeof params.id === 'string' && params.id.trim() ? params.id.trim() : null;
}

export async function POST(req: Request, ctx: RouteContext) {
  const executionId = await routeId(ctx);
  if (!executionId) return NextResponse.json({ ok: false, error: 'missing_execution_id' }, { status: 400 });

  try {
    const body = asRecord(await req.json().catch(() => ({})));
    const supabase = createServiceSupabaseClient();
    const { data: execution, error: executionError } = await supabase
      .from('sfi_execution_ledger')
      .select('*')
      .eq('id', executionId)
      .maybeSingle();
    if (executionError) throw executionError;
    if (!execution) return NextResponse.json({ ok: false, error: 'execution_not_found' }, { status: 404 });

    const observedEffect = {
      effect: textValue(body.observed_effect, 'missing outcome'),
      evidence: body.evidence ?? 'missing evidence',
      learning_delta: body.learning_delta ?? {},
    };

    const { data: outcome, error: outcomeError } = await supabase
      .from('sfi_outcomes')
      .insert({
        execution_id: executionId,
        case_id: execution.case_id,
        outcome_status: textValue(body.outcome_status, 'recorded'),
        observed_effect: observedEffect,
        unexpected_effects: Array.isArray(body.unexpected_effects) ? body.unexpected_effects : [],
        prediction_accuracy: numericValue(body.prediction_accuracy, null),
      })
      .select('*')
      .single();
    if (outcomeError) throw outcomeError;

    const lessonText = textValue(body.lesson, 'Lesson pending: outcome recorded without learning summary.');
    const { data: lesson, error: lessonError } = await supabase
      .from('sfi_lessons')
      .insert({
        outcome_id: outcome.id,
        case_id: execution.case_id,
        lesson: lessonText,
        updates_direction_engine: Boolean(body.updates_direction_engine),
        updates_risk_engine: Boolean(body.updates_risk_engine),
        updates_capability_engine: Boolean(body.updates_capability_engine),
        atlas_update: body.atlas_update !== false,
      })
      .select('*')
      .single();
    if (lessonError) throw lessonError;

    await supabase
      .from('sfi_execution_ledger')
      .update({
        execution_status: 'outcome_recorded',
        verification_status: 'observed',
        executed_at: new Date().toISOString(),
      })
      .eq('id', executionId);

    return NextResponse.json({ ok: true, data: { outcome, lesson } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'record_outcome_failed' }, { status: 400 });
  }
}
