import { readCanonicalGraphState } from '@/lib/graph/canonicalGraph';
import { readGovernanceRuntime } from '@/lib/governance/governanceRuntime';
import { getLatestKernelCycle } from '@/lib/kernel/kernelCycleStore';
import { latestActionProposals, latestRows } from './common';
import { getLatestWorldSpectSnapshot, snapshotRowToApiData } from '@/lib/worldspect/snapshotStore';
import { buildCognitiveTwinSeed } from '@/observatory/field/catalog/cognitiveTwinSeed';
import { buildDocumentCatalog } from '@/observatory/field/catalog/sfDocumentCatalog';
import { buildMihmRuntimeMatrix } from '@/observatory/field/catalog/mihmRuntimeMatrix';
import { buildNodeCatalog } from '@/observatory/field/catalog/sfNodeCatalog';
import { buildPatternCatalog } from '@/observatory/field/catalog/patternCatalog';
import type { FieldAccessMode } from '@/observatory/field/catalog/fieldMatrixBuilder';

export async function readTwinSelfObservation(input: {
  user?: unknown;
  profile?: Record<string, unknown> | null;
  node?: Record<string, unknown> | null;
  entitlements?: Record<string, unknown> | null;
  accessMode?: FieldAccessMode;
} = {}) {
  const [graph, worldspect, kernel, governance, proposals, mihmAnalyses, logbookKnowledge, logbookSignals] = await Promise.all([
    readCanonicalGraphState('sfi'),
    getLatestWorldSpectSnapshot(),
    getLatestKernelCycle(),
    readGovernanceRuntime(),
    latestActionProposals(['twin_proposal'], 10),
    latestRows('mihm_analyses', 10),
    latestRows('logbook_knowledge', 50),
    latestRows('logbook_signals', 25),
  ]);

  const latestCampoState = kernel?.campo_state && typeof kernel.campo_state === 'object'
    ? kernel.campo_state as Record<string, unknown>
    : null;
  const worldspectData = worldspect ? snapshotRowToApiData(worldspect) : null;
  const nodeCatalog = buildNodeCatalog(graph);
  const documentCatalog = buildDocumentCatalog({ logbookKnowledge: logbookKnowledge.data });
  const patternCatalog = buildPatternCatalog();
  const executionCatalog = proposals.data.map((proposal) => ({
    executionId: String(proposal.id ?? proposal.created_at ?? 'twin_proposal'),
    title: String(proposal.title ?? 'cognitive_twin.proposal'),
    applicablePatterns: [],
    requiredApproval: Boolean(proposal.approval_required ?? true),
    expectedFieldDelta: proposal.expected_field_delta && typeof proposal.expected_field_delta === 'object'
      ? proposal.expected_field_delta as Record<string, unknown>
      : {},
    riskLevel: String(proposal.risk_level ?? 'medium'),
    verificationCriterion: 'proposal must remain auditable through action_proposals and epistemic_events',
    source: 'action_proposals' as const,
  }));
  const mihmRuntimeMatrix = buildMihmRuntimeMatrix({
    mihmAnalyses: mihmAnalyses.data,
    kernel,
    worldspect: worldspectData,
    graph,
    logbookSignals: logbookSignals.data,
  });
  const seed = buildCognitiveTwinSeed({
    user: input.user,
    profile: input.profile,
    node: input.node,
    entitlements: input.entitlements,
    accessMode: input.accessMode,
    nodeCatalog,
    documentCatalog,
    patternCatalog,
    executionCatalog,
    mihmRuntimeMatrix,
    recentEvents: logbookSignals.data,
    recentKernelCycles: kernel ? [kernel] : [],
    latestWorldSpect: worldspectData,
  });

  return {
    observed_graph_nodes: graph.nodes.length,
    observed_graph_edges: graph.edges.length,
    latest_kernel_status: kernel?.status ?? null,
    latest_governance_status: governance.status,
    latest_worldspect_state: worldspect?.source_state ?? null,
    graph,
    worldspect: worldspectData,
    kernel: kernel
      ? {
        id: kernel.id,
        status: kernel.status,
        observedAt: typeof latestCampoState?.observedAt === 'string' ? latestCampoState.observedAt : kernel.created_at,
      }
      : null,
    governance,
    proposals: proposals.data,
    seed,
    nodeCatalog,
    documentCatalog,
    patternCatalog,
    executionCatalog,
    mihmRuntimeMatrix,
    warnings: [
      graph.degradedReason,
      governance.warning,
      proposals.error,
      mihmAnalyses.error,
      logbookKnowledge.error,
      logbookSignals.error,
      ...mihmRuntimeMatrix.warnings,
    ].filter(Boolean),
  };
}
