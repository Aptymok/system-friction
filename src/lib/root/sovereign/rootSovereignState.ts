export type RootDataStatus = 'observed' | 'derived' | 'inferred' | 'gated' | 'missing' | 'degraded';

export type RootObservedValue<T> = {
  value: T | null;
  status: RootDataStatus;
  source: string;
  observedAt: string | null;
  confidence: number | null;
  evidenceIds: string[];
  explanation: string;
  warning: string | null;
};

export type RootSource<T> = {
  data: T;
  source: string;
  dataClass: RootDataStatus;
  observedAt: string | null;
  error: string | null;
};

export type RootRow = Record<string, unknown>;

export type RootSystemItem = {
  id: string;
  label: string;
  state: RootObservedValue<string>;
  openItems: RootObservedValue<number>;
};

export type RootAgent = {
  id: string;
  role: string;
  state: RootObservedValue<string>;
  provider: string | null;
  model: string | null;
  lastRun: string | null;
  lastResult: string | null;
  availability: string;
  error: string | null;
};

export type RootEvidenceNode = {
  id: string;
  label: string;
  type: string;
  epistemicClass: string;
  confidence: number | null;
  source: string;
  observedAt: string | null;
  evidenceIds: string[];
  lineage: string[];
  payload: RootRow;
};

export type RootEvidenceEdge = {
  id: string;
  from: string;
  to: string;
  relation: string;
  weight: number | null;
  confidence: number | null;
  evidenceIds: string[];
  source: string;
};

export type RootExecutionCapability = {
  id: string;
  label: string;
  state: 'available' | 'partial' | 'gated';
  endpoint: string | null;
  method: 'POST' | null;
  description: string;
};

export type RootSovereignState = {
  generatedAt: string;
  system: RootSource<{
    governance: RootRow | null;
    worldVector: RootRow | null;
    latestEpistemicEvent: RootRow | null;
    latestAudit: RootRow | null;
    matrix: RootSystemItem[];
  }>;
  governance: RootSource<{ proposals: RootRow[]; mutations: RootRow[]; audits: RootRow[]; events: RootRow[] }>;
  agents: RootSource<{ agents: RootAgent[] }>;
  predictions: RootSource<{
    models: RootRow[];
    runs: RootRow[];
    evidenceRequests: RootRow[];
    outcomes: RootRow[];
    learningEvents: RootRow[];
    legacyEntries: RootRow[];
    legacyVerifications: RootRow[];
  }>;
  amv: RootSource<{ memories: RootRow[]; attractors: RootRow[]; ejectors: RootRow[] }>;
  evidence: RootSource<{ nodes: RootEvidenceNode[]; edges: RootEvidenceEdge[]; entries: RootRow[]; ledger: RootRow[] }>;
  execution: RootSource<{ capabilities: RootExecutionCapability[]; recentActions: RootRow[] }>;
  warnings: string[];
};

export function observedValue<T>(input: {
  value: T | null;
  status?: RootDataStatus;
  source: string;
  observedAt?: string | null;
  confidence?: number | null;
  evidenceIds?: string[];
  explanation: string;
  warning?: string | null;
}): RootObservedValue<T> {
  return {
    value: input.value,
    status: input.status ?? (input.value === null ? 'missing' : 'observed'),
    source: input.source,
    observedAt: input.observedAt ?? null,
    confidence: input.confidence ?? null,
    evidenceIds: input.evidenceIds ?? [],
    explanation: input.explanation,
    warning: input.warning ?? null,
  };
}
