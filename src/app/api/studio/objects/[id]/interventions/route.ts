import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> };
type Body = Record<string, unknown>;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanScope(value: unknown) {
  const scope = cleanText(value, 80);
  return scope && ['overview', 'composition', 'sound', 'arrangement', 'mix', 'master', 'graph', 'archive'].includes(scope)
    ? scope
    : 'overview';
}

function cleanState(value: unknown) {
  const state = cleanText(value, 80);
  return state && ['idle', 'queued', 'running', 'complete', 'blocked', 'failed'].includes(state) ? state : 'queued';
}

async function objectIdFrom(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return decodeURIComponent(params.id);
}

export async function POST(request: Request, ctx: RouteContext) {
  const objectId = await objectIdFrom(ctx);
  try {
    await requireObjectOwner(objectId);
    const body = await request.json().catch(() => null) as Body | null;
    if (!body) return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
    const title = cleanText(body.title, 240);
    if (!title) return NextResponse.json({ ok: false, error: 'INTERVENTION_TITLE_REQUIRED' }, { status: 400 });
    const hypothesisId = cleanText(body.hypothesisId, 120);
    const payload = {
      source: 'studio_intervention_form',
      suggestionId: cleanText(body.suggestionId, 120),
      hypothesisId,
      plannedAt: cleanText(body.plannedAt, 80),
      window: cleanText(body.window, 240),
      operatorNote: cleanText(body.operatorNote, 2000),
      expectedEvidence: cleanText(body.expectedEvidence, 1000),
      provenance: {
        source: 'studio_intervention_form',
        capturedAt: new Date().toISOString(),
        relation: 'object_id',
      },
    };
    const service = createServiceSupabaseClient();
    const inserted = await service
      .from('studio_interventions')
      .insert({
        object_id: objectId,
        hypothesis_id: hypothesisId,
        title,
        state: cleanState(body.state),
        scope: cleanScope(body.scope),
        expected_impact: cleanNumber(body.expectedImpact),
        risk: cleanNumber(body.risk),
        payload,
      })
      .select('*')
      .single();
    if (inserted.error || !inserted.data) throw inserted.error ?? new Error('studio_intervention_insert_failed');

    if (hypothesisId) {
      const current = await service.from('studio_hypotheses').select('payload').eq('id', hypothesisId).maybeSingle();
      const currentPayload = current.data?.payload && typeof current.data.payload === 'object' && !Array.isArray(current.data.payload)
        ? current.data.payload as Record<string, unknown>
        : {};
      await service.from('studio_hypotheses').update({
        payload: { ...currentPayload, suggestionStatus: 'IN_TEST', interventionId: inserted.data.id, updatedAt: new Date().toISOString() },
      }).eq('id', hypothesisId);
    }

    await service.from('studio_archive_events').insert({
      session_id: null,
      object_id: objectId,
      event_type: 'intervention_registered',
      label: `Intervention registered: ${title}`,
      source: 'studio_intervention_form',
      payload: { interventionId: inserted.data.id, hypothesisId, provenance: payload.provenance },
    });

    return NextResponse.json({ ok: true, intervention: inserted.data }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'INTERVENTION_WRITE_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
