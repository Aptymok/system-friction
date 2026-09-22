import { NextRequest, NextResponse } from 'next/server';
import { ensureOwnedNode } from '@/lib/server/productionBackend';
import { emitEpistemicEvent } from '@/core/memory/epistemicEventWriter';

function clamp01(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0.6;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const ctx = await ensureOwnedNode(body.node_id);
  if (ctx.error) return ctx.error;
  if (!ctx.node || !ctx.user) {
    return NextResponse.json({ error: 'node_not_ready' }, { status: 404 });
  }

  const payload = {
    node_id: ctx.node.id,
    platform: String(body.platform || 'field'),
    post_id: body.post_id ? String(body.post_id) : null,
    resonance_score: body.resonance_score === undefined ? null : Number(body.resonance_score),
    engagement: body.engagement || {},
    comments_summary: body.comments_summary ? String(body.comments_summary) : null,
    raw_payload: body.raw_payload || {},
    sourceState: 'declared',
    streamType: 'social_field',
  };
  const confidence = clamp01(body.confidence);

  const emitted = await emitEpistemicEvent({
    eventName: 'social_resonance_ingested',
    logbookId: `ACTOR:${ctx.user.id}`,
    epistemicClass: 'declared',
    schemaVersion: '2026-09-21.actor-event.v1',
    sourceId: payload.post_id || payload.platform,
    sourceType: 'api/social/resonance',
    actorId: ctx.user.id,
    nodeId: ctx.node.id,
    confidence,
    payload: { ...payload, confidence },
  });

  if (!emitted.ok) {
    return NextResponse.json({ error: 'social_resonance_persist_failed' }, { status: 500 });
  }

  return NextResponse.json({
    status: 'ok',
    event: {
      id: emitted.event.id,
      ...payload,
      confidence,
      created_at: emitted.event.created_at,
    },
  });
}
