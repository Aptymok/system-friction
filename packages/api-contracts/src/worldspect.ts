export type WorldSpectSourceState = 'observed' | 'degraded' | 'missing';

export type WorldSpectEvidenceLevel = 'direct' | 'none';

export type WorldSpectIngestMode = 'daily_cron' | 'manual' | 'diagnostic' | 'fallback_runtime';

export type WorldSpectSource = {
  key: string;
  label?: string;
  value: number | null;
  raw?: unknown;
  unit?: string;
  nti?: number;
  nti_base?: number;
  weight?: number;
  mihm_var?: string;
  simulated?: boolean;
  ts?: string;
  error?: string;
};

export type WorldSpectSourceHealthStatus = 'healthy' | 'degraded' | 'missing' | 'simulated' | 'unavailable' | 'unknown';

export type WorldSpectSourceHealth = {
  key: string;
  sourceId: string;
  status: WorldSpectSourceHealthStatus;
  kind?: 'webhook' | 'oauth' | 'manual' | 'cron' | 'fixture' | 'public-api';
  nti: number | null;
  simulated: boolean;
  last_ok: string | null;
  last_error: string | null;
  lastObservedAt?: string;
  checkedAt?: string;
  confidence: number;
  message?: string;
};

export type WorldSpectFieldStateSignal = {
  sourceState: Exclude<WorldSpectSourceState, 'missing'>;
  evidenceLevel: 'direct';
  confidence: number;
  metrics: {
    wsi: number;
    nti: number;
  };
  observedAt: string;
  sourceIds: string[];
} | null;

export type WorldSpectSnapshotMeta = {
  id: string;
  observedAt: string;
  createdAt: string;
  ingestMode: WorldSpectIngestMode;
  adapterStatus: string;
  adapterError: string | null;
  snapshotHash: string;
  persisted: boolean;
};

export type WorldSpectResponse = {
  sourceState: WorldSpectSourceState;
  evidenceLevel: WorldSpectEvidenceLevel;
  confidence: number;
  wsi: number | null;
  nti: number | null;
  ts: string;
  sources: WorldSpectSource[];
  degraded_sources: string[];
  sourceHealth: WorldSpectSourceHealth[];
  fieldStateSignal: WorldSpectFieldStateSignal;
  snapshot?: WorldSpectSnapshotMeta;
};
