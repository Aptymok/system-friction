import { NextRequest, NextResponse } from 'next/server';
import { getServerUserContext, ROOT_ENTITLEMENTS } from '@/lib/server/productionBackend';
import { getEntitlements } from '@/lib/licensing/entitlements';
import { parseGraphProfile, readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { getLatestWorldSpectSnapshot, snapshotRowToApiData } from '@/lib/worldspect/snapshotStore';
import { missingWorldSpectResponse } from '@/lib/worldspect/contract';
import { getLatestKernelCycle } from '@/lib/kernel/kernelCycleStore';
import { readGovernanceRuntime } from '@/lib/governance/governanceRuntime';
import { readRecentThoughtInhibitions } from '@/lib/governance/thoughtInhibition';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const profile = parseGraphProfile(request.nextUrl.searchParams.get('profile'));
  const ctx = await getServerUserContext();

  if (!ctx.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { data: nodes, error: selectNodeError } = await ctx.service
    .from('nodes')
    .select('*')
    .eq('user_id', ctx.user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  const node = nodes?.[0] ?? null;
  const nodeError = selectNodeError?.message ?? null;

  if (!node && !ctx.isRoot) {
    return NextResponse.json({ ok: false, error: nodeError ?? 'node_not_found' }, { status: nodeError ? 500 : 404 });
  }

  const [graph, latestWorldSpect, latestKernelCycle, governance, recentThoughtInhibitions, entitlements] = await Promise.all([
    readCanonicalGraphState(profile),
    getLatestWorldSpectSnapshot(),
    getLatestKernelCycle(),
    readGovernanceRuntime(),
    readRecentThoughtInhibitions(),
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

  const latestCampoState = latestKernelCycle?.campo_state && typeof latestKernelCycle.campo_state === 'object'
    ? latestKernelCycle.campo_state as Record<string, unknown>
    : null;

  return NextResponse.json({
    ok: true,
    data: {
      profile,
      user: { id: ctx.user.id, email: ctx.user.email },
      node,
      field,
      graph,
      worldspect: latestWorldSpect ? snapshotRowToApiData(latestWorldSpect) : missingWorldSpectResponse(now),
      kernel: latestKernelCycle
        ? {
          id: latestKernelCycle.id,
          status: latestKernelCycle.status,
          cycleId: typeof latestCampoState?.cycleId === 'string' ? latestCampoState.cycleId : latestKernelCycle.id,
          observedAt: typeof latestCampoState?.observedAt === 'string' ? latestCampoState.observedAt : latestKernelCycle.created_at,
          confidence: typeof latestCampoState?.confidence === 'number' ? latestCampoState.confidence : null,
          sourceState: typeof latestCampoState?.sourceState === 'string' ? latestCampoState.sourceState : null,
          graphNodeCount: typeof latestCampoState?.graphNodeCount === 'number' ? latestCampoState.graphNodeCount : null,
          graphEdgeCount: typeof latestCampoState?.graphEdgeCount === 'number' ? latestCampoState.graphEdgeCount : null,
          epistemicEventId: latestKernelCycle.event_id,
        }
        : null,
      governance,
      governanceRuntime: {
        recentThoughtInhibitions,
      },
      entitlements,
      loadedAt: now,
      warnings: [
        ...(nodeError ? [`legacy_nodes_read:${nodeError}`] : []),
        ...(graph.degradedReason ? [graph.degradedReason] : []),
        ...(governance.warning ? [governance.warning] : []),
        ...(latestWorldSpect ? [] : ['worldspect_snapshot_missing']),
        ...(latestKernelCycle ? [] : ['kernel_cycle_missing']),
      ],
    },
  });
}
