import { NextRequest, NextResponse } from 'next/server';
import { ensureOwnedNode } from '@/lib/server/productionBackend';
import { emitEpistemicEvent } from '@/core/memory/epistemicEventWriter';

function draftRow(row: Record<string, any>) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  return {
    id: row.id,
    node_id: row.node_id,
    ...payload,
    created_at: row.created_at,
  };
}

export async function GET(req: NextRequest) {
  const nodeId = req.nextUrl.searchParams.get('node_id');
  const ctx = await ensureOwnedNode(nodeId);
  if (ctx.error) return ctx.error;
  if (!ctx.node || !ctx.user) return NextResponse.json({ error: 'node_not_ready' }, { status: 404 });

  const { data, error } = await ctx.service
    .from('epistemic_events')
    .select('id,node_id,payload,created_at')
    .eq('actor_id', ctx.user.id)
    .eq('node_id', ctx.node.id)
    .eq('event_name', 'SFI_MEDIA_DRAFT_RECORDED')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: 'media_drafts_read_failed' }, { status: 500 });
  return NextResponse.json({ drafts: (data || []).map((row) => draftRow(row)) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const ctx = await ensureOwnedNode(body.node_id);
  if (ctx.error) return ctx.error;
  if (!ctx.node || !ctx.user) return NextResponse.json({ error: 'node_not_ready' }, { status: 404 });

  const payload = {
    node_id: ctx.node.id,
    source_type: String(body.source_type || 'observation'),
    source_id: body.source_id || null,
    platform_target: String(body.platform_target || 'field'),
    content: String(body.content || '').slice(0, 2800),
    status: 'pending_human_validation',
    metadata: body.metadata || {},
    streamType: 'media_draft',
  };

  const emitted = await emitEpistemicEvent({
    eventName: 'SFI_MEDIA_DRAFT_RECORDED',
    logbookId: `ACTOR:${ctx.user.id}`,
    epistemicClass: 'declared',
    schemaVersion: '2026-09-21.actor-event.v1',
    sourceId: String(payload.source_id || payload.platform_target),
    sourceType: 'api/media/drafts',
    actorId: ctx.user.id,
    nodeId: ctx.node.id,
    confidence: 0.6,
    payload,
  });

  if (!emitted.ok) return NextResponse.json({ error: 'media_draft_persist_failed' }, { status: 500 });
  return NextResponse.json({ status: 'ok', draft: draftRow(emitted.event as Record<string, any>) });
}
