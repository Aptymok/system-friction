import { NextRequest, NextResponse } from 'next/server';
import { ensureOwnedNode } from '@/lib/server/productionBackend';
import type { ApiResult } from '../../../../../../packages/api-contracts/src';
import { deriveMinimalFieldStateFromSignals } from '../../../../../../packages/campo-ob/src/reducers';
import { buildSignalReadModel, type SignalEventRecord } from '../../../../../../packages/events/src/signal-read-model';
import { sanitizeError } from '../../../../../../packages/security/src';

type LedgerRow = Record<string, unknown>;

type TwinLedgerSignal = Pick<SignalEventRecord, 'id' | 'content' | 'confidence' | 'createdAt' | 'payloadHash'>;

type TwinLedgerAmvResponse = {
  id: string;
  responseText: string;
  source: string;
  confidence: number | null;
  createdAt: string;
};

type TwinLedgerReadModel = {
  nodeId: string;
  latestSignals: TwinLedgerSignal[];
  recurrenceCount: {
    totalEvents: number;
    byEventName: Record<string, number>;
    bySignalContent: Record<string, number>;
  };
  degradation: number;
  operationalCapacity: number;
  latestAmvResponses: TwinLedgerAmvResponse[];
  warnings: string[];
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

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] || 0) + 1;
}

function normalizeSignalContent(content: string) {
  return content.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
}

function recurrence(rows: LedgerRow[], signals: SignalEventRecord[]) {
  const byEventName: Record<string, number> = {};
  const bySignalContent: Record<string, number> = {};

  for (const row of rows) {
    const eventName = stringValue(row.event_name) || 'unknown_event';
    increment(byEventName, eventName);
  }

  for (const signal of signals) {
    increment(bySignalContent, normalizeSignalContent(signal.content));
  }

  return {
    totalEvents: rows.length,
    byEventName,
    bySignalContent,
  };
}

function extractAmvResponse(row: LedgerRow): TwinLedgerAmvResponse | null {
  const eventName = stringValue(row.event_name) || '';
  const streamType = stringValue(row.stream_type) || '';
  if (!eventName.toLowerCase().includes('amv') && !streamType.toLowerCase().includes('amv')) return null;

  const payload = isRecord(row.payload) ? row.payload : {};
  const responseText = stringValue(payload.message)
    || stringValue(payload.responseText)
    || stringValue(payload.assistantMessage)
    || stringValue(payload.fragment);
  if (!responseText) return null;

  const id = stringValue(row.id);
  const createdAt = stringValue(row.created_at);
  if (!id || !createdAt) return null;

  return {
    id,
    responseText,
    source: stringValue(payload.responseSource) || stringValue(row.emitted_by) || streamType || 'cognitive_event_stream',
    confidence: numberValue(payload.confidence),
    createdAt,
  };
}

function buildTwinLedgerReadModel(nodeId: string, rows: LedgerRow[]): TwinLedgerReadModel {
  const warnings: string[] = [];
  const signalReadModel = buildSignalReadModel(rows);
  warnings.push(...signalReadModel.warnings);

  const fieldState = deriveMinimalFieldStateFromSignals({
    fieldId: `field:${nodeId}`,
    nodeId,
    signals: signalReadModel.signals,
    updatedAt: new Date().toISOString(),
  });

  const latestAmvResponses = rows
    .map(extractAmvResponse)
    .filter((response): response is TwinLedgerAmvResponse => Boolean(response))
    .slice(0, 10);

  if (!signalReadModel.signals.length) warnings.push('no_signals_found');
  if (!latestAmvResponses.length) warnings.push('no_amv_responses_found');

  return {
    nodeId,
    latestSignals: signalReadModel.signals.slice(0, 20).map((signal) => ({
      id: signal.id,
      content: signal.content,
      confidence: signal.confidence,
      createdAt: signal.createdAt,
      payloadHash: signal.payloadHash,
    })),
    recurrenceCount: recurrence(rows, signalReadModel.signals),
    degradation: fieldState.degradation,
    operationalCapacity: fieldState.operationalCapacity,
    latestAmvResponses,
    warnings: Array.from(new Set(warnings)),
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
    if (ctx.error || !ctx.node || !ctx.user) return apiError('node_not_ready', 404, traceId);

    const { data, error } = await ctx.service
      .from('cognitive_event_stream')
      .select('*')
      .eq('node_id', ctx.node.id)
      .order('created_at', { ascending: false })
      .limit(250);

    if (error) return apiSanitizedError(error, 500, traceId);

    const rows = Array.isArray(data) ? data.filter(isRecord) : [];
    const readModel = buildTwinLedgerReadModel(ctx.node.id, rows);

    return apiOk(readModel, traceId, readModel.warnings.length ? readModel.warnings : undefined);
  } catch (error) {
    return apiSanitizedError(error, 500, traceId);
  }
}
