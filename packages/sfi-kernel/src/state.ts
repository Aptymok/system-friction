import type { CampoObState, CampoWorldSpectSnapshot } from '../../campo-ob/src';
import type { CanonicalGraphState } from '../../graph/src';
import type { ReducedMihmResult } from '../../mihm-core/src';
import type { KernelDeltaResult } from '../../delta-engine/src';
import type { KernelPolicyDecision } from '../../policy-runtime/src';

export type SfiKernelAdapters = {
  readWorldSpect: () => Promise<CampoWorldSpectSnapshot>;
  readGraph: () => Promise<CanonicalGraphState>;
  appendEvent: (event: {
    eventName: string;
    epistemicClass: 'observed' | 'derived' | 'missing';
    confidence: number;
    payload: unknown;
    occurredAt: string;
    logbookId: string;
    lineage?: string[];
  }) => Promise<{ id: string } | null>;
  persistCycle: (cycle: SfiKernelCycleRecord) => Promise<unknown>;
};

export type SfiKernelCycleRecord = {
  cycleId: string;
  observedAt: string;
  status: 'committed' | 'degraded' | 'blocked';
  sourceState: 'observed' | 'degraded' | 'missing';
  confidence: number;
  worldspectSnapshotId: string | null;
  graphNodeCount: number;
  graphEdgeCount: number;
  campo: CampoObState;
  mihm: ReducedMihmResult;
  delta: KernelDeltaResult;
  policy: KernelPolicyDecision;
  epistemicEventId?: string | null;
};

export type SfiKernelCycleResult = {
  cycleId: string;
  observedAt: string;
  sourceState: 'observed' | 'degraded' | 'missing';
  confidence: number;
  campo: CampoObState;
  graph: {
    sourceState: CanonicalGraphState['sourceState'];
    nodeCount: number;
    edgeCount: number;
    degradedReason: string | null;
  };
  mihm: ReducedMihmResult;
  delta: KernelDeltaResult;
  policy: KernelPolicyDecision;
  persisted: boolean;
  eventId: string | null;
  emitted: boolean;
};

export type SfiKernelRuntimeState = {
  running: boolean;
  lastCycleAt: string | null;
  lastResult: SfiKernelCycleResult | null;
  failures: number;
};
