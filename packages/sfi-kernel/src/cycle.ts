import { mapWorldSpectToCampo } from '../../campo-ob/src';
import { computeReducedMihm } from '../../mihm-core/src';
import { computeKernelDelta } from '../../delta-engine/src';
import { evaluateKernelPolicy } from '../../policy-runtime/src';
import type { SfiKernelAdapters, SfiKernelCycleRecord, SfiKernelCycleResult } from './state';

function cycleIdFor(observedAt: string) {
  return `kernel:${observedAt}:${Math.random().toString(36).slice(2, 10)}`;
}

export async function cycle(adapters: SfiKernelAdapters): Promise<SfiKernelCycleResult> {
  const worldSpect = await adapters.readWorldSpect();
  const graph = await adapters.readGraph();
  const campo = mapWorldSpectToCampo(worldSpect);
  const mihm = computeReducedMihm({
    observedAt: campo.observedAt,
    campo,
    graph: {
      sourceState: graph.sourceState === 'observed' ? 'observed' : 'degraded',
      nodes: graph.nodes,
      edges: graph.edges,
    },
  });
  const delta = computeKernelDelta({
    campo,
    mihm,
  });
  const policy = evaluateKernelPolicy({
    sourceState: campo.sourceState,
    confidence: mihm.confidence,
    deltaScore: delta.score,
    operationalCapacity: mihm.operationalCapacity,
    hasSimulatedSources: campo.nodes.some((node) => node.simulated),
    warnings: [
      ...mihm.warnings,
      ...(graph.degradedReason ? [graph.degradedReason] : []),
    ],
  });
  const observedAt = campo.observedAt;
  const cycleId = cycleIdFor(observedAt);
  const event = await adapters.appendEvent({
    eventName: 'kernel.cycle.executed',
    epistemicClass: campo.sourceState === 'observed' && graph.sourceState === 'observed' ? 'observed' : 'derived',
    confidence: mihm.confidence,
    payload: {
      cycleId,
      sourceState: campo.sourceState,
      graph: {
        sourceState: graph.sourceState,
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        degradedReason: graph.degradedReason,
      },
      campo,
      mihm,
      delta,
      policy,
    },
    occurredAt: observedAt,
    logbookId: 'BR',
    lineage: [
      worldSpect.snapshot?.snapshotHash ?? campo.snapshotHashInput,
      graph.loadedAt,
    ],
  });
  const eventId = event?.id ?? null;

  const cycleRecord: SfiKernelCycleRecord = {
    cycleId,
    observedAt,
    status: policy.status,
    sourceState: campo.sourceState,
    confidence: mihm.confidence,
    worldspectSnapshotId: worldSpect.snapshot?.id ?? null,
    graphNodeCount: graph.nodes.length,
    graphEdgeCount: graph.edges.length,
    campo,
    mihm,
    delta,
    policy,
    epistemicEventId: eventId,
  };
  await adapters.persistCycle(cycleRecord);

  return {
    cycleId,
    observedAt,
    sourceState: campo.sourceState,
    confidence: mihm.confidence,
    campo,
    graph: {
      sourceState: graph.sourceState,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      degradedReason: graph.degradedReason,
    },
    mihm,
    delta,
    policy,
    persisted: true,
    eventId,
    emitted: Boolean(eventId),
  };
}
