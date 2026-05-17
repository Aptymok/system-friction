import { NextRequest, NextResponse } from 'next/server';
import { ensureOwnedNode } from '@/lib/server/productionBackend';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const ctx = await ensureOwnedNode(body.node_id);
  if (ctx.error) return ctx.error;

  const payload = {
    node_id: ctx.node.id,
    platform: String(body.platform || 'field'),
    post_id: body.post_id ? String(body.post_id) : null,
    resonance_score: body.resonance_score === undefined ? null : Number(body.resonance_score),
    engagement: body.engagement || {},
    comments_summary: body.comments_summary ? String(body.comments_summary) : null,
    raw_payload: body.raw_payload || {},
  };

  const { data, error } = await ctx.service.from('social_resonance_events').insert(payload).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await ctx.service.from('cognitive_event_stream').insert({
    node_id: ctx.node.id,
    stream_type: 'social_field',
    event_name: 'social_resonance_ingested',
    payload,
    emitted_by: 'api/social/resonance',
  });

  return NextResponse.json({ status: 'ok', event: data });
}
