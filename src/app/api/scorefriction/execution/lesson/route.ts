import { NextRequest, NextResponse } from 'next/server';
import { appendAmvLearning } from '@/lib/amv/learning';
import { appendLogbookEntry } from '@/lib/logbook/query';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { outcome_id, case_id, lesson, updates_direction_engine, updates_risk_engine, updates_capability_engine, atlas_update } = body;
  if (!outcome_id || !case_id || !lesson) return NextResponse.json({ error: 'outcome_id, case_id and lesson are required' }, { status: 400 });

  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('sfi_lessons')
      .insert({ outcome_id, case_id, lesson, updates_direction_engine: updates_direction_engine ?? false, updates_risk_engine: updates_risk_engine ?? false, updates_capability_engine: updates_capability_engine ?? false, atlas_update: atlas_update ?? true })
      .select()
      .single();
    if (error) throw error;
    await appendAmvLearning({ case_id, source: 'scorefriction.execution.lesson', event_type: 'lesson', summary: String(lesson), payload: data });
    await appendLogbookEntry({ scope: 'scorefriction', visibility: 'root', case_id, event_type: 'execution_lesson', title: 'Lesson registrada', summary: String(lesson), payload: data });
    return NextResponse.json({ ok: true, lesson: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'lesson_failed' }, { status: 500 });
  }
}

