import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { asRecord, textValue } from '@/lib/sfi/operationalConsole';

export const dynamic = 'force-dynamic';

function priorityOf(row: Record<string, unknown>) {
  const vector = asRecord(row.vector);
  const parsed = Number(vector.priority);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET() {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('sfi_attractors')
      .select('*')
      .in('status', ['declared', 'active'])
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    const ordered = (data ?? []).sort((a, b) => priorityOf(b as Record<string, unknown>) - priorityOf(a as Record<string, unknown>));
    return NextResponse.json({ ok: true, data: ordered, source: 'sfi_attractors' });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      data: [],
      degraded: true,
      source: 'sfi_attractors',
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

  const priority = typeof body.priority === 'number' && Number.isFinite(body.priority) ? body.priority : 0;
  const successMarkers = Array.isArray(body.success_markers)
    ? body.success_markers.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
  const now = new Date().toISOString();
  const id = randomUUID();

  try {
    const supabase = createServiceSupabaseClient();
    if (body.active !== false) {
      const current = await supabase
        .from('sfi_attractors')
        .select('id,status,vector')
        .in('status', ['declared', 'active']);
      if (current.error) throw current.error;
      for (const row of current.data ?? []) {
        const vector = asRecord(row.vector);
        if (vector.declarationScope === 'operational') {
          const update = await supabase.from('sfi_attractors').update({ status: 'inactive', updated_at: now }).eq('id', row.id);
          if (update.error) throw update.error;
        }
      }
    }

    const { data, error } = await supabase
      .from('sfi_attractors')
      .insert({
        id,
        attractor_key: `SFI-DECLARED-${id}`,
        label: title,
        module: 'sfi',
        owner_node_key: null,
        attractor_type: 'declared_operational',
        density: 0,
        confidence: 0,
        persistence: 0,
        trust: 0,
        degradation: 0,
        weight: 0,
        evidence_count: 0,
        status: body.active === false ? 'inactive' : 'declared',
        vector: {
          epistemicClass: 'DECLARED',
          declarationScope: 'operational',
          desiredFutureState,
          horizon: textValue(body.horizon) || null,
          successMarkers,
          constraints: asRecord(body.constraints),
          priority,
          declaredAt: now,
          measurementSemantics: 'Top-level numeric attractor fields remain zero until evidence-backed measurements exist; declaration is direction, not attainment.',
        },
        first_seen: now,
        last_seen: now,
        updated_at: now,
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
