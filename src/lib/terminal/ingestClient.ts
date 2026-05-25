import type { ApiResult } from '../../../packages/api-contracts/src';

export type RealObservationInput = {
  nodeId: string;
  source_id: 'manual_webhook' | 'world_observation' | 'institutional_observation' | 'operator_observation';
  source_type: 'operator' | 'external' | 'institutional' | 'world';
  title?: string;
  content: string;
  url?: string;
  observed_at?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
};

export type RealObservationResult = {
  eventId: string | null;
  nodeId: string;
  sourceState: 'observed' | 'degraded';
  evidenceLevel: string;
  confidence: number;
  ingested: boolean;
};

export type RealObservation = {
  id: string;
  title: string;
  content: string;
  source_id: string;
  source_type: string;
  url?: string;
  observed_at: string;
  confidence: number;
  evidenceLevel: string;
  sourceState: string;
  created_at: string;
};

export type RealObservationsReadModel = {
  nodeId: string;
  observations: RealObservation[];
  count: number;
};

async function readJson<T>(response: Response): Promise<ApiResult<T>> {
  const body = await response.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'invalid_json_response' };
  }

  return body as ApiResult<T>;
}

export async function ingestRealObservation(input: RealObservationInput): Promise<ApiResult<RealObservationResult>> {
  const content = input.content.trim();
  if (!input.nodeId || !content) {
    return { ok: false, error: 'invalid_real_observation_input' };
  }

  const response = await fetch('/api/ingest/real', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      node_id: input.nodeId,
      source_id: input.source_id,
      source_type: input.source_type,
      title: input.title || content.slice(0, 80),
      content,
      url: input.url,
      observed_at: input.observed_at,
      confidence: input.confidence ?? 0.65,
      metadata: input.metadata || {},
    }),
  });

  return readJson<RealObservationResult>(response);
}

export async function readRealObservations(nodeId: string): Promise<ApiResult<RealObservationsReadModel>> {
  if (!nodeId) return { ok: false, error: 'missing_node_id' };

  const response = await fetch(`/api/ingest/read?node_id=${encodeURIComponent(nodeId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  return readJson<RealObservationsReadModel>(response);
}
