import { NextRequest, NextResponse } from 'next/server';
import { ensureOwnedNode } from '@/lib/server/productionBackend';
import type { ApiResult } from '../../../../../packages/api-contracts/src';
import { sanitizeError } from '../../../../../packages/security/src';

type IngestObservation = {
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

function apiOk<TData>(data: TData, traceId?: string, warnings?: string[]) {
  const result: ApiResult<TData> = { ok: true, data, traceId, warnings };
  return NextResponse.json(result);
}

function apiError(error: string, status = 400, traceId?: string, details?: unknown) {
  const result: ApiResult = { ok: false, error, traceId, details };
  return NextResponse.json(result, { status });
}

function apiSanitizedError(error: unknown, status = 500, traceId?: string) {
  const sanitized = sanitizeError(error);
  return apiError(sanitized.code, status, traceId);
}

function queryValue(req: NextRequest, key: string) {
  const value = req.nextUrl.searchParams.get(key);
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function confidenceValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function mapObservation(row: Record<string, unknown>): IngestObservation | null {
  const payload = isRecord(row.payload) ? row.payload : null;
  if (!payload) return null;

  const id = stringValue(row.id);
  const createdAt = stringValue(row.created_at);
  const content = stringValue(payload.content);
  if (!id || !createdAt || !content) return null;

  return {
    id,
    title: stringValue(payload.title, content.slice(0, 80)),
    content,
    source_id: stringValue(payload.source_id, 'unknown_source'),
    source_type: stringValue(payload.source_type, 'unknown'),
    url: stringValue(payload.url) || undefined,
    observed_at: stringValue(payload.observed_at, createdAt),
    confidence: confidenceValue(payload.confidence),
    evidenceLevel: stringValue(payload.evidenceLevel, 'declared'),
    sourceState: stringValue(payload.sourceState, 'observed'),
    created_at: createdAt,
  };
}

export async function GET(req: NextRequest) {
  const nodeId = queryValue(req, 'node_id');
  const traceId = queryValue(req, 'correlationId') || nodeId || undefined;

  if (!nodeId) {
    return apiError('missing_node_id', 400, traceId, { expectedQuery: 'node_id' });
  }

  try {
    const ctx = await ensureOwnedNode(nodeId);
    if (ctx.error || !ctx.node || !ctx.user) return apiError('node_unavailable', 404, traceId);

    const { data, error } = await ctx.service
      .from('cognitive_event_stream')
      .select('*')
      .eq('node_id', ctx.node.id)
      .eq('stream_type', 'ingest')
      .eq('event_name', 'REAL_OBSERVATION_INGESTED')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return apiSanitizedError(error, 500, traceId);

    const observations = (Array.isArray(data) ? data : [])
      .filter(isRecord)
      .map(mapObservation)
      .filter((item): item is IngestObservation => Boolean(item));

    return apiOk({
      nodeId: ctx.node.id,
      observations,
      count: observations.length,
    }, traceId);
  } catch (error) {
    return apiSanitizedError(error, 500, traceId);
  }
}
