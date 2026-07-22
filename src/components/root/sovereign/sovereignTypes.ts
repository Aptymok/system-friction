export type RootViewId = 'overview' | 'cognitive-runtime' | 'governance' | 'agents' | 'predictions' | 'amv' | 'evidence' | 'execution' | 'telemetry';

export type RootSelection = {
  kind: string;
  id: string;
  title: string;
  source: string;
  observedAt: string | null;
  confidence: number | null;
  evidenceIds: string[];
  warning: string | null;
  data: unknown;
};

export type RootActionRequest = {
  id: string;
  label: string;
  effect: string;
  target: string;
  endpoint: string;
  method: 'POST';
  body?: Record<string, unknown>;
};

export type RootSessionEvent = { id: string; at: string; label: string; status: 'running' | 'done' | 'blocked'; detail: string; auditId: string | null };
