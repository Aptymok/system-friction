import { NextRequest, NextResponse } from 'next/server';
import { appendLogbookEntry } from '@/lib/logbook/query';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { execution_id, case_id, outcome_status, observed_effect, unexpected_effects, prediction_accuracy } = body;
  if (!execution_id || !case_id) return NextResponse.json({ error: 'execution_id and case_id are required' }, { status: 400 });

  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('sfi_outcomes')
      .insert({ execution_id, case_id, outcome_status: outcome_status || 'success', observed_effect: observed_effect || {}, unexpected_effects: unexpected_effects || [], prediction_accuracy: prediction_accuracy ?? null })
      .select()
      .single();
    if (error) throw error;
    await appendLogbookEntry({ scope: 'scorefriction', visibility: 'root', case_id, event_type: 'execution_outcome', title: 'Outcome registrado', summary: String(outcome_status || 'success'), payload: data });
    return NextResponse.json({ ok: true, outcome: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'outcome_failed' }, { status: 500 });
  }
}

