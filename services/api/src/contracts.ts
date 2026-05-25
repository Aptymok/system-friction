import type { EpistemicClass } from '../../../packages/api-contracts/src';
import type { Scope } from '../../../packages/security/src';

export type RouteCategory =
  | 'command'
  | 'query'
  | 'webhook'
  | 'cron'
  | 'admin'
  | 'health';

export type AuthRequirement =
  | { kind: 'none'; reason: string }
  | { kind: 'user'; scopes: Scope[] }
  | { kind: 'service'; scopes: Scope[] }
  | { kind: 'signed-source'; sourceId: string };

export type EpistemicMetadata = {
  epistemicClass: EpistemicClass;
  confidence: number;
  sourceId?: string;
  lineage?: string[];
  checksum?: string;
  uncertainty?: string;
};

export type CommandEnvelope<TPayload = unknown> = {
  kind: 'command';
  routeCategory: Extract<RouteCategory, 'command' | 'admin'>;
  commandName: string;
  contractVersion: string;
  actorId?: string;
  nodeId?: string;
  idempotencyKey: string;
  correlationId?: string;
  auth: AuthRequirement;
  epistemic?: EpistemicMetadata;
  payload: TPayload;
};

export type QueryEnvelope<TParams = unknown> = {
  kind: 'query';
  routeCategory: Extract<RouteCategory, 'query' | 'health'>;
  queryName: string;
  contractVersion: string;
  actorId?: string;
  nodeId?: string;
  correlationId?: string;
  auth: AuthRequirement;
  epistemic?: EpistemicMetadata;
  params: TParams;
};

export type ApiErrorShape = {
  ok: false;
  code: string;
  message: string;
  status: number;
  correlationId?: string;
  details?: unknown;
};

export type ApiSuccessShape<TData = unknown> = {
  ok: true;
  data: TData;
  correlationId?: string;
  warnings?: string[];
};

export type GatewayResult<TData = unknown> = ApiSuccessShape<TData> | ApiErrorShape;

export type RouteDefinition = {
  name: string;
  category: RouteCategory;
  auth: AuthRequirement;
  emitsEpistemicEvent: boolean;
};
