import { NextResponse } from 'next/server';
import { readRecentThoughtClosures } from '@/lib/cognitive/thoughtClosure';
import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { readGovernanceRuntime } from '@/lib/governance/governanceRuntime';
import { readRecentThoughtInhibitions } from '@/lib/governance/thoughtInhibition';
import { getLatestKernelCycle } from '@/lib/kernel/kernelCycleStore';
import { latestActionProposals, latestRows } from '@/lib/operational/common';
import { readTwinSelfObservation } from '@/lib/operational/twinState';
import { getLatestWorldSpectSnapshot, snapshotRowToApiData } from '@/lib/worldspect/snapshotStore';
import { buildDocumentCatalog } from '@/observatory/field/catalog/sfDocumentCatalog';
import { buildMihmRuntimeMatrix } from '@/observatory/field/catalog/mihmRuntimeMatrix';
import { buildNodeCatalog } from '@/observatory/field/catalog/sfNodeCatalog';
import { buildPatternCatalog } from '@/observatory/field/catalog/patternCatalog';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';

const PUBLIC_CDN_CACHE = { 'Vercel-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } as const;

async function readPlatformMetricSummary() {
  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('platform_metric_snapshots')
    .select('object_id,platform,metric_name,metric_value,metric_unit,period_start,period_end,source_mode,reliability,raw_payload,created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) return { data: null, error: error.message };

  const snapshots = (data ?? []) as Array<Record<string, unknown>>;
  const byPlatform = snapshots.reduce<Record<string, number>>((acc, item) => {
    const platform = typeof item.platform === 'string' ? item.platform : 'unknown';
    acc[platform] = (acc[platform] ?? 0) + 1;
    return acc;
  }, {});
  const metricValue = (objectId: string, metricName: string) => {
    const item = snapshots.find((row) => row.object_id === objectId && row.metric_name === metricName);
    const value = item?.metric_value;
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  return {
    data: {
      snapshotCount: snapshots.length,
      byPlatform,
      latestCapturedAt: typeof snapshots[0]?.created_at === 'string' ? snapshots[0].created_at : null,
      ga4: {
        propertyId: 'properties/551040116',
        activeUsers: metricValue('ga4:551040116:lifetime', 'activeUsers'),
        newUsers: metricValue('ga4:551040116:lifetime', 'newUsers'),
        sessions: metricValue('ga4:551040116:lifetime', 'sessions'),
        engagedSessions: metricValue('ga4:551040116:lifetime', 'engagedSessions'),
        pageViews: metricValue('ga4:551040116:lifetime', 'screenPageViews'),
        eventCount: metricValue('ga4:551040116:lifetime', 'eventCount'),
        aiAssistantSessions: metricValue('ga4:551040116:channel:AI Assistant', 'sessions'),
        aiAssistantUsers: metricValue('ga4:551040116:channel:AI Assistant', 'activeUsers'),
      },
      recent: snapshots.slice(0, 12),
    },
    error: null,
  };
}


export async function GET() {
  const [
    worldspect,
    graph,
    kernel,
    governance,
    thoughtInhibitions,
    thoughtClosures,
    projections,
    sandbox,
    mutations,
    twin,
    mihm,
    multimedia,
    latestProposals,
    logbookKnowledge,
    logbookSignals,
    platformMetrics,
  ] = await Promise.all([
    getLatestWorldSpectSnapshot(),
    readCanonicalGraphState('sfi'),
    getLatestKernelCycle(),
    readGovernanceRuntime(),
    readRecentThoughtInhibitions(),
    readRecentThoughtClosures(),
    latestActionProposals(['projection'], 10),
    latestActionProposals(['sandbox_snapshot', 'sandbox_diff'], 10),
    latestRows('logbook_mutations', 10),
    readTwinSelfObservation(),
    latestRows('mihm_analyses', 10),
    latestActionProposals(['multimedia', 'calendar_payload'], 10),
    latestActionProposals(undefined, 25),
    latestRows('logbook_knowledge', 50),
    latestRows('logbook_signals', 25),
    readPlatformMetricSummary(),
  ]);

  const worldspectData = worldspect ? snapshotRowToApiData(worldspect) : null;
  const nodeCatalog = buildNodeCatalog(graph);
  const documentCatalog = buildDocumentCatalog({ logbookKnowledge: logbookKnowledge.data });
  const patternCatalog = buildPatternCatalog();
  const executionCatalog: unknown[] = latestProposals.data;
  const mihmRuntimeMatrix = buildMihmRuntimeMatrix({
    mihmAnalyses: mihm.data,
    kernel,
    worldspect: worldspectData,
    graph,
    logbookSignals: logbookSignals.data,
  });

  const warnings = [
    graph.degradedReason,
    governance.warning,
    projections.error,
    sandbox.error,
    mutations.error,
    mihm.error,
    multimedia.error,
    latestProposals.error,
    logbookKnowledge.error,
    logbookSignals.error,
    platformMetrics.error,
    ...mihmRuntimeMatrix.warnings,
    ...(worldspect ? [] : ['worldspect_snapshot_missing']),
    ...(kernel ? [] : ['kernel_cycle_missing']),
  ].filter(Boolean);

  return NextResponse.json({
    ok: true,
    data: {
      worldspect: worldspectData,
      graph,
      kernel,
      governance,
      cognitiveRuntime: {
        recentThoughtInhibitions: thoughtInhibitions,
        recentThoughtClosures: thoughtClosures,
      },
      projections: projections.data,
      sandbox: sandbox.data,
      mutations: mutations.data,
      twin,
      mihm: mihm.data,
      multimedia: multimedia.data,
      latestProposals: latestProposals.data,
      nodeCatalog,
      documentCatalog,
      patternCatalog,
      executionCatalog,
      mihmRuntimeMatrix,
      platformMetrics: platformMetrics.data,
      loadedAt: new Date().toISOString(),
      warnings,
    },
  }, { headers: PUBLIC_CDN_CACHE });
}
