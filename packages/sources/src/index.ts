export type SourceKind = 'webhook' | 'oauth' | 'manual' | 'cron' | 'fixture' | 'public-api';

export type SourceStatus = 'healthy' | 'degraded' | 'unavailable' | 'unknown';

export type SourceDescriptor = {
  sourceId: string;
  kind: SourceKind;
  displayName: string;
  readOnly: boolean;
  requiresSignature: boolean;
  owner?: string;
  expectedFreshnessSeconds?: number;
};

export type SourceAdapterDescriptor = SourceDescriptor;

export type SourceHealth = {
  sourceId: string;
  status: SourceStatus;
  checkedAt: string;
  lastObservedAt?: string;
  confidence: number;
  reason?: string;
};

export type SourceEventEnvelope<TPayload = unknown> = {
  envelopeId: string;
  source: SourceDescriptor;
  receivedAt: string;
  occurredAt?: string;
  payloadHash: string;
  payload: TPayload;
  signatureVerified: boolean;
  idempotencyKey?: string;
};

export function classifySourceHealth(input: {
  checkedAt: string;
  lastObservedAt?: string;
  expectedFreshnessSeconds?: number;
  signatureRequired?: boolean;
  signatureVerified?: boolean;
  reachable?: boolean;
}): SourceStatus {
  if (input.reachable === false) return 'unavailable';
  if (input.signatureRequired === true && input.signatureVerified !== true) return 'degraded';
  if (!input.lastObservedAt) return 'unknown';

  const checkedAt = Date.parse(input.checkedAt);
  const lastObservedAt = Date.parse(input.lastObservedAt);
  if (!Number.isFinite(checkedAt) || !Number.isFinite(lastObservedAt)) return 'unknown';

  const freshnessSeconds = Math.max(0, input.expectedFreshnessSeconds ?? 0);
  if (freshnessSeconds === 0) return 'healthy';

  const ageSeconds = Math.max(0, (checkedAt - lastObservedAt) / 1000);
  return ageSeconds <= freshnessSeconds ? 'healthy' : 'degraded';
}
