import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ensureOwnedNode } from '@/lib/server/productionBackend';
import type { ApiResult } from '../../../../../packages/api-contracts/src';
import { sanitizeError } from '../../../../../packages/security/src';

type SourceType = 'operator' | 'external' | 'institutional' | 'world';
type EvidenceLevel = 'direct' | 'external' | 'declared';

type RealObservationCommand = {
  node_id: string;
  source_id: string;
  source_type: SourceType;
  title: string;
  content: string;
  url?: string;
  observed_at: string;
  confidence: number;
  metadata: Record<string, unknown>;
};

const SOURCE_TYPES: SourceType[] = ['operator', 'external', 'institutional', 'world'];
const MAX_CONTENT_LENGTH = 12000;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function cleanText(value: string, max: number) {
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function parseIsoDate(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) return new Date().toISOString();
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.keys(value).sort().reduce<Record<string, unknown>>((current, key) => {
    current[key] = canonicalize(value[key]);
    return current;
  }, {});
}

function hashPayload(payload: unknown) {
  return createHash('sha256').update(JSON.stringify(canonicalize(payload))).digest('hex').slice(0, 24);
}

function evidenceFor(command: Pick<RealObservationCommand, 'source_type' | 'url'>): EvidenceLevel {
  if (command.source_type === 'operator') return 'direct';
  if (command.url) return 'external';
  return 'declared';
}

function parseCommand(input: unknown): RealObservationCommand | { error: 'missing_node_id' | 'missing_content' | 'invalid_ingest_payload' } {
  if (!isRecord(input)) return { error: 'invalid_ingest_payload' };

  const nodeId = typeof input.node_id === 'string' ? cleanText(input.node_id, 120) : '';
  const sourceId = typeof input.source_id === 'string' ? cleanText(input.source_id, 120) : '';
  const sourceType = SOURCE_TYPES.includes(input.source_type as SourceType) ? input.source_type as SourceType : null;
  const content = typeof input.content === 'string' ? cleanText(input.content, MAX_CONTENT_LENGTH) : '';
  const titleInput = typeof input.title === 'string' ? cleanText(input.title, 160) : '';
  const url = typeof input.url === 'string' && input.url.trim().length > 0 ? cleanText(input.url, 500) : undefined;
  const confidence = typeof input.confidence === 'number' ? clamp01(input.confidence) : 0.65;

  if (!nodeId) return { error: 'missing_node_id' };
  if (!content) return { error: 'missing_content' };
  if (!sourceId || !sourceType) return { error: 'invalid_ingest_payload' };

  return {
    node_id: nodeId,
    source_id: sourceId,
    source_type: sourceType,
    title: titleInput || content.slice(0, 80),
    content,
    url,
    observed_at: parseIsoDate(input.observed_at),
    confidence,
    metadata: isRecord(input.metadata) ? input.metadata : {},
  };
}

export async function POST(req: NextRequest) {
  const parsed = parseCommand(await req.json().catch(() => null));

  if ('error' in parsed) {
    return apiError(parsed.error, parsed.error === 'invalid_ingest_payload' ? 400 : 400);
  }

  try {
    const ctx = await ensureOwnedNode(parsed.node_id);
    if (ctx.error || !ctx.node || !ctx.user) return apiError('node_unavailable', 404, parsed.node_id);

    const evidenceLevel = evidenceFor(parsed);
    const payloadBase = {
      contractVersion: 'ingest.mvt-04',
      source_id: parsed.source_id,
      source_type: parsed.source_type,
      title: parsed.title,
      content: parsed.content,
      url: parsed.url,
      observed_at: parsed.observed_at,
      confidence: parsed.confidence,
      evidenceLevel,
      sourceState: 'observed',
      metadata: parsed.metadata,
    };

    const { data, error } = await ctx.service
      .from('cognitive_event_stream')
      .insert({
        node_id: ctx.node.id,
        stream_type: 'ingest',
        event_name: 'REAL_OBSERVATION_INGESTED',
        payload: {
          ...payloadBase,
          payloadHash: hashPayload(payloadBase),
        },
        emitted_by: 'SFI_REAL_INGEST',
      })
      .select('id,node_id')
      .single();

    if (error) return apiError('ingest_failed', 500, parsed.node_id);

    return apiOk({
      eventId: typeof data?.id === 'string' ? data.id : null,
      nodeId: ctx.node.id,
      sourceState: 'observed',
      evidenceLevel,
      confidence: parsed.confidence,
      ingested: true,
    }, parsed.node_id);
  } catch {
    return apiError('node_unavailable', 404, parsed.node_id);
  }
}
