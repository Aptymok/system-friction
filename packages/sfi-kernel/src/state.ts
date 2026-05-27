import type { CampoObState, CampoWorldSpectSnapshot } from '../../campo-ob/src';
import type { DeltaResult } from '../../delta/src';
import type { PolicyDecision } from '../../policy/src';

export type SfiKernelAdapters = {
  readWorldSpect: () => Promise<CampoWorldSpectSnapshot>;
  appendEvent: (event: {
    eventName: string;
    epistemicClass: 'observed' | 'derived' | 'missing';
    confidence: number;
    payload: unknown;
    occurredAt: string;
    logbookId: string;
    lineage?: string[];
  }) => Promise<unknown>;
};

export type SfiKernelCycleResult = {
  observedAt: string;
  campo: CampoObState;
  delta: DeltaResult;
  policy: PolicyDecision;
  emitted: boolean;
};

export type SfiKernelRuntimeState = {
  running: boolean;
  lastCycleAt: string | null;
  lastResult: SfiKernelCycleResult | null;
  failures: number;
};
