import { NextRequest, NextResponse } from 'next/server';
import { getServerUserContext, ROOT_ENTITLEMENTS } from '@/lib/server/productionBackend';
import { getEntitlements } from '@/lib/licensing/entitlements';
import { parseGraphProfile, readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { getLatestWorldSpectSnapshot, snapshotRowToApiData } from '@/lib/worldspect/snapshotStore';
import { missingWorldSpectResponse } from '@/lib/worldspect/contract';
import { getLatestKernelCycle } from '@/lib/kernel/kernelCycleStore';
import { readGovernanceRuntime } from '@/lib/governance/governanceRuntime';
import { readRecentThoughtInhibitions } from '@/lib/governance/thoughtInhibition';
import { readRecentThoughtClosures } from '@/lib/cognitive/thoughtClosure';
import { readActorNodeProjection } from '@/lib/server/actorNodeProjection';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const profile = parseGraphProfile(request.nextUrl.searchParams.get('profile'));
  const ctx = await getServerUserContext();

  if (!ctx.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const projection = await readActorNodeProjection({
    user: ctx.user,
    profile: ctx.profile && typeof ctx.profile === 'object'
      ? ctx.profile as Record<string, unknown>
      : null,
    service: ctx.service,
  });
  const node = projection.node;
  const nodeError = projection.diagnostic;

  const [graph, latestWorldSpect, latestKernelCycle, governance, recentThoughtInhibitions, recentThoughtClosures, entitlements] = await Promise.all([
    readCanonicalGraphState(profile),
    getLatestWorldSpectSnapshot(),
    getLatestKernelCycle(),
    readGovernanceRuntime(),
    readRecentThoughtInhibitions(),
    readRecentThoughtClosures(),
    ctx.isRoot ? Promise.resolve(ROOT_ENTITLEMENTS) : getEntitlements(ctx.user.id),
  ]);

  const now = new Date().toISOString();

  const field = node
    ? {
      fieldId: `field:${node.id}`,
      nodeId: node.id,
      sourceState: node.source_state,
      evidenceLevel: node.evidence_level,
      confidence: node.source_state === 'observed' ? 0.7 : 0,
      updatedAt: now,
      metrics: {
        ihg: node.current_ihg,
        nti: node.current_nti,
        ldi: node.current_ldi,
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
        recentThoughtClosures,
      },
      entitlements,
      loadedAt: now,
      warnings: [
        ...(nodeError ? [`actor_projection:${nodeError}`] : []),
        ...(graph.degradedReason ? [graph.degradedReason] : []),
        ...(governance.warning ? [governance.warning] : []),
        ...(latestWorldSpect ? [] : ['worldspect_snapshot_missing']),
        ...(latestKernelCycle ? [] : ['kernel_cycle_missing']),
      ],
    },
  });
}
