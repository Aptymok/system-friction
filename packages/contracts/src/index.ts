export type ContractVersion = '2026-05-21.phase-2a';

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
  sourceState: 'observed' | 'declared' | 'derived' | 'inferred' | 'simulated' | 'fixture' | 'missing';
  evidenceLevel: 'direct' | 'behavioral' | 'statistical' | 'semantic' | 'speculative' | 'none';
  occurredAt: string;
  payloadHash: string;
  payload: TPayload;
};

export type ApiResult<TData = unknown> =
  | { ok: true; data: TData; warnings?: string[] }
  | { ok: false; error: string; traceId?: string };

