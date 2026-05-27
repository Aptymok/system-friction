import { NextRequest, NextResponse } from 'next/server';
import { getServerUserContext, ROOT_ENTITLEMENTS } from '@/lib/server/productionBackend';
import { getEntitlements } from '@/lib/licensing/entitlements';
import { parseGraphProfile, readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { getLatestWorldSpectSnapshot, snapshotRowToApiData } from '@/lib/worldspect/snapshotStore';
import { missingWorldSpectResponse } from '@/lib/worldspect/contract';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const profile = parseGraphProfile(request.nextUrl.searchParams.get('profile'));
  const ctx = await getServerUserContext();

  if (!ctx.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let node = null;
  let nodeError: string | null = null;
  const { data: nodes, error: selectNodeError } = await ctx.service
    .from('nodes')
    .select('*')
    .eq('user_id', ctx.user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  node = nodes?.[0] ?? null;
  nodeError = selectNodeError?.message ?? null;

  if (!node && !selectNodeError) {
    const { data, error } = await ctx.service
      .from('nodes')
      .insert({ user_id: ctx.user.id, source: 'web', current_ihg: 0.52, current_nti: 0.48, current_ldi: 1.12 })
      .select('*')
      .single();
    node = data;
    nodeError = error?.message ?? null;
  }

  if (!node && !ctx.isRoot) {
    return NextResponse.json({ ok: false, error: nodeError ?? 'node_not_found' }, { status: nodeError ? 500 : 404 });
  }

  const [graph, latestWorldSpect, entitlements] = await Promise.all([
    readCanonicalGraphState(profile),
    getLatestWorldSpectSnapshot(),
    ctx.isRoot ? Promise.resolve(ROOT_ENTITLEMENTS) : getEntitlements(ctx.user.id),
  ]);
  const now = new Date().toISOString();
  const field = node
    ? {
      fieldId: `field:${node.id}`,
      nodeId: node.id,
      sourceState: 'observed',
      evidenceLevel: 'direct',
      confidence: 0.7,
      updatedAt: now,
      metrics: {
        ihg: Number(node.current_ihg ?? 0.52),
        nti: Number(node.current_nti ?? 0.48),
        ldi: Number(node.current_ldi ?? 1.12),
      },
    }
    : {
      fieldId: 'field:root',
      nodeId: null,
      sourceState: 'missing',
      evidenceLevel: 'none',
      confidence: 0,
      updatedAt: now,
      metrics: { ihg: 0, nti: 0, ldi: 0 },
    };

  return NextResponse.json({
    ok: true,
    data: {
      profile,
      user: { id: ctx.user.id, email: ctx.user.email },
      node,
      field,
      graph,
      worldspect: latestWorldSpect ? snapshotRowToApiData(latestWorldSpect) : missingWorldSpectResponse(now),
      entitlements,
      loadedAt: now,
      warnings: [
        ...(nodeError ? [nodeError] : []),
        ...(graph.degradedReason ? [graph.degradedReason] : []),
        ...(latestWorldSpect ? [] : ['worldspect_snapshot_missing']),
      ],
    },
  });
}
