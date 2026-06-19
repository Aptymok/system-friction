import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { asRecord, textValue } from '@/lib/sfi/operationalConsole';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('sfi_declared_attractors')
      .select('*')
      .order('active', { ascending: false })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(25);
    if (error) throw error;
    return NextResponse.json({ ok: true, data: data ?? [], source: 'sfi_declared_attractors' });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      data: [],
      degraded: true,
      source: 'sfi_declared_attractors',
      error: error instanceof Error ? error.message : 'attractors_read_failed',
    });
  }
}

export async function POST(req: Request) {
  const body = asRecord(await req.json().catch(() => ({})));
  const title = textValue(body.title);
  const desiredFutureState = textValue(body.desired_future_state);
  if (!title || !desiredFutureState) {
    return NextResponse.json({ ok: false, error: 'title_and_desired_future_state_required' }, { status: 400 });
  }

  try {
    const supabase = createServiceSupabaseClient();
    if (body.active !== false) {
      await supabase.from('sfi_declared_attractors').update({ active: false }).eq('active', true);
    }
    const { data, error } = await supabase
      .from('sfi_declared_attractors')
      .insert({
        title,
        desired_future_state: desiredFutureState,
        active: body.active !== false,
        priority: typeof body.priority === 'number' ? body.priority : 1,
        horizon: textValue(body.horizon, ''),
        success_markers: Array.isArray(body.success_markers) ? body.success_markers : [],
        constraints: asRecord(body.constraints),
      })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'attractor_create_failed',
    }, { status: 400 });
  }
}
