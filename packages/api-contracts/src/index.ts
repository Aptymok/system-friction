export type ContractVersion =
  | '2026-05-21.phase-2a'
  | '2026-05-21.phase-2d'
  | '2026-05-21.phase-3c'
  | '2026-05-21.phase-6a';

export type EpistemicClass =
  | 'observed'
  | 'declared'
  | 'derived'
  | 'inferred'
  | 'simulated'
  | 'fixture'
  | 'missing';

export type EventSource = {
  sourceId: string;
  sourceType: 'user' | 'system' | 'service' | 'external' | 'fixture' | 'unknown';
  label?: string;
  observedAt?: string;
};

export type SFIEvent<TPayload = unknown> = {
  contractVersion: ContractVersion;
  eventId: string;
  eventName: string;
  nodeId?: string;
  epistemicClass: EpistemicClass;
  source: EventSource;
  confidence: number;
  payload: TPayload;
  checksum?: string;
  lineage?: string[];
  uncertainty?: string;
  occurredAt: string;
};

export type CommandRequest<TPayload = unknown> = {
  contractVersion: ContractVersion;
  commandName: string;
  actorId: string;
  nodeId?: string;
  idempotencyKey: string;
  payload: TPayload;
};

export type SourceEvent<TPayload = unknown> = {
  contractVersion: ContractVersion;
  sourceId: string;
  sourceState: EpistemicClass;
  evidenceLevel: 'direct' | 'behavioral' | 'statistical' | 'semantic' | 'speculative' | 'none';
  occurredAt: string;
  payloadHash: string;
  payload: TPayload;
};

export type ApiResult<TData = unknown> =
  | { ok: true; data: TData; warnings?: string[]; traceId?: string }
  | { ok: false; error: string; traceId?: string; details?: unknown };

export type FieldStateDTO = {
  fieldId: string;
  nodeId: string;
  regime: 'stable' | 'watch' | 'critical' | 'unknown';
  operationalCapacity: number;
  degradation: number;
  confidence: number;
  updatedAt: string;
};

export type NodeStateDTO = {
  nodeId: string;
  ownerId: string;
  status: 'active' | 'inactive' | 'degraded' | 'unknown';
  assetIds: string[];
  updatedAt: string;
};

export type LogEntryDTO = {
  logId: string;
  nodeId?: string;
  eventName: string;
  epistemicClass: EpistemicClass;
  confidence: number;
  checksum?: string;
  lineage?: string[];
  createdAt: string;
};

export type SourceHealthDTO = {
  sourceId: string;
  status: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
  kind?: 'webhook' | 'oauth' | 'manual' | 'cron' | 'fixture' | 'public-api';
  lastObservedAt?: string;
  checkedAt?: string;
  confidence: number;
  message?: string;
};

export type IntegrationEventDTO<TPayload = unknown> = {
  contractVersion: ContractVersion;
  integrationEventId: string;
  sourceId: string;
  sourceKind: 'webhook' | 'oauth' | 'manual' | 'cron' | 'fixture' | 'public-api';
  eventName: string;
  receivedAt: string;
  occurredAt?: string;
  payloadHash: string;
  signatureVerified: boolean;
  idempotencyKey?: string;
  payload: TPayload;
};

export type ReadCapability =
  | 'field-state:read'
  | 'node-state:read'
  | 'logs:read'
  | 'source-health:read'
  | 'events:read'
  | 'proposals:read'
  | 'risk-state:read';

export type WriteCapability =
  | 'commands:write'
  | 'events:write'
  | 'logs:write'
  | 'source-events:write'
  | 'proposals:write'
  | 'annotations:write';

export type AppScope =
  | 'evaluator'
  | 'organizational-diagnosis'
  | 'document-intake'
  | 'personal-observation'
  | 'editorial-curation'
  | 'institutional-monitoring'
  | 'experimental-lab'
  | 'public-demo';

export type AppIdentity = {
  appId: string;
  displayName: string;
  scope: AppScope;
  owner: 'sfi' | 'partner' | 'external' | 'public';
  environment: 'production' | 'staging' | 'demo' | 'experimental';
};

export type ConsumerContract = {
  consumerId: string;
  displayName: string;
  reads: ReadCapability[];
  writes: WriteCapability[];
  directDatabaseAccess: false;
};

export type ObservatoryConsumerContract = {
  contractVersion: ContractVersion;
  app: AppIdentity;
  reads: ReadCapability[];
  writes: WriteCapability[];
  directDatabaseAccess: false;
  accessPath: 'observatory-api';
  evaluatorEnabled: false;
  notes?: string[];
};

export type { NodeBootstrapResponseV1 } from './node-bootstrap';
export { normalizeNodeBootstrapResponse } from './node-bootstrap';
