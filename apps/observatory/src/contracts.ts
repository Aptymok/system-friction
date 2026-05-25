import type {
  FieldStateDTO,
  LogEntryDTO,
  NodeStateDTO,
  SourceHealthDTO,
} from '../../../packages/api-contracts/src';

export type ReadOnlyViewState = 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'degraded';

export type ViewBoundary = {
  readonly: true;
  computesFieldTruth: false;
  writesToDatabase: false;
  replacesTerminal: false;
};

export type FieldStateView = ViewBoundary & {
  view: 'FieldStateView';
  state: ReadOnlyViewState;
  fieldState: FieldStateDTO | null;
};

export type NodeRegistryView = ViewBoundary & {
  view: 'NodeRegistryView';
  state: ReadOnlyViewState;
  nodes: NodeStateDTO[];
};

export type EventStreamView = ViewBoundary & {
  view: 'EventStreamView';
  state: ReadOnlyViewState;
  logs: LogEntryDTO[];
};

export type SourceHealthView = ViewBoundary & {
  view: 'SourceHealthView';
  state: ReadOnlyViewState;
  sources: SourceHealthDTO[];
};

export type RiskResilienceView = ViewBoundary & {
  view: 'RiskResilienceView';
  state: ReadOnlyViewState;
  risks: Array<{
    id: string;
    label: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'mitigating' | 'accepted' | 'closed';
  }>;
};

export type AgentProposalsView = ViewBoundary & {
  view: 'AgentProposalsView';
  state: ReadOnlyViewState;
  proposals: Array<{
    id: string;
    title: string;
    epistemicClass: 'declared' | 'derived' | 'inferred' | 'simulated';
    confidence: number;
    status: 'draft' | 'pending_review' | 'accepted' | 'rejected';
  }>;
};

export type ObservatoryDashboardView =
  | FieldStateView
  | NodeRegistryView
  | EventStreamView
  | SourceHealthView
  | RiskResilienceView
  | AgentProposalsView;
