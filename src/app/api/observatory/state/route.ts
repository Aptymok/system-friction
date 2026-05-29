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

export const dynamic = 'force-dynamic';

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
      loadedAt: new Date().toISOString(),
      warnings,
    },
  });
}
