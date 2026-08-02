import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> };

const allowedStates = new Set(['PROPOSED', 'ACCEPTED', 'IN_TEST', 'EVIDENCE_PENDING', 'VERIFIED', 'REJECTED', 'INCONCLUSIVE']);

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function cleanState(value: unknown) {
  const state = cleanText(value, 80);
  return state && allowedStates.has(state) ? state : null;
}

async function suggestionIdFrom(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return decodeURIComponent(params.id);
}

export async function POST(request: Request, ctx: RouteContext) {
  const suggestionId = await suggestionIdFrom(ctx);
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
    const nextState = cleanState(body.state);
    if (!nextState) return NextResponse.json({ ok: false, error: 'INVALID_SUGGESTION_STATE' }, { status: 400 });

    const service = createServiceSupabaseClient();
    const current = await service
      .from('studio_hypotheses')
      .select('*')
      .eq('id', suggestionId)
      .maybeSingle();
    if (current.error || !current.data) return NextResponse.json({ ok: false, error: 'SUGGESTION_NOT_FOUND' }, { status: 404 });
    const objectId = typeof current.data.object_id === 'string' ? current.data.object_id : null;
    if (!objectId) return NextResponse.json({ ok: false, error: 'SUGGESTION_OBJECT_REQUIRED' }, { status: 409 });
    await requireObjectOwner(objectId);

    const payload = current.data.payload && typeof current.data.payload === 'object' && !Array.isArray(current.data.payload)
      ? current.data.payload as Record<string, unknown>
      : {};
    const transition = {
      state: nextState,
      note: cleanText(body.note, 1200),
      evidenceId: cleanText(body.evidenceId, 120),
      updatedAt: new Date().toISOString(),
      source: 'studio_suggestion_state_route',
    };
    const updated = await service
      .from('studio_hypotheses')
      .update({
        payload: {
          ...payload,
          suggestionStatus: nextState,
          statusTransitions: [...(Array.isArray(payload.statusTransitions) ? payload.statusTransitions : []), transition].slice(-24),
          updatedAt: transition.updatedAt,
        },
      })
      .eq('id', suggestionId)
      .select('*')
      .single();
    if (updated.error || !updated.data) throw updated.error ?? new Error('studio_suggestion_update_failed');

    await service.from('studio_archive_events').insert({
      session_id: null,
      object_id: objectId,
      event_type: 'suggestion_state_changed',
      label: `Suggestion ${suggestionId} -> ${nextState}`,
      source: 'studio_suggestion_state_route',
      payload: { suggestionId, transition },
    });

    return NextResponse.json({ ok: true, suggestion: updated.data, transition }, { status: 200 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'SUGGESTION_STATE_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
