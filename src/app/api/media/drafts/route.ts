import { NextRequest, NextResponse } from 'next/server';
import { ensureOwnedNode } from '@/lib/server/productionBackend';

export async function GET(req: NextRequest) {
  const nodeId = req.nextUrl.searchParams.get('node_id');
  const ctx = await ensureOwnedNode(nodeId);
  if (ctx.error) return ctx.error;
  const { data, error } = await ctx.service
    .from('media_drafts')
    .select('*')
    .eq('node_id', ctx.node.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drafts: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const ctx = await ensureOwnedNode(body.node_id);
  if (ctx.error) return ctx.error;

  const { data, error } = await ctx.service.from('media_drafts').insert({
    node_id: ctx.node.id,
    source_type: String(body.source_type || 'observation'),
    source_id: body.source_id || null,
    platform_target: String(body.platform_target || 'field'),
    content: String(body.content || '').slice(0, 2800),
    status: 'pending_human_validation',
    metadata: body.metadata || {},
  }).select('*').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'ok', draft: data });
}
