import { NextRequest, NextResponse } from 'next/server';
import { ensureOwnedNode } from '@/lib/server/productionBackend';
import type { ApiResult } from '../../../../../packages/api-contracts/src';
import { buildSignalReadModel } from '../../../../../packages/events/src/signal-read-model';
import { sanitizeError } from '../../../../../packages/security/src';

type EventRow = Record<string, unknown>;

type FieldEventSummary = {
  signalCount: number;
  ingestCount: number;
  agentResponseCount: number;
  confidence: number;
  degradation: number;
  operationalCapacity: number;
  sourceState: 'observed' | 'missing' | 'degraded';
  evidenceLevel: 'direct' | 'external' | 'declared' | 'mixed' | 'none';
  regime: 'observing' | 'declared' | 'silent' | 'degraded';
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

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function confidenceValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}

function payloadOf(row: EventRow) {
  return isRecord(row.payload) ? row.payload : {};
}

function relevantRows(rows: EventRow[]) {
  return rows.filter((row) => {
    const streamType = stringValue(row.stream_type);
    const eventName = stringValue(row.event_name);
    return (streamType === 'signal' && eventName === 'SIGNAL_DECLARED')
      || (streamType === 'agent' && eventName === 'AMV_RESPONSE')
      || (streamType === 'ingest' && eventName === 'REAL_OBSERVATION_INGESTED');
  });
}

function summarizeEvents(rows: EventRow[], signalWarnings: string[]): FieldEventSummary {
  const relevant = relevantRows(rows);
  const signalRows = relevant.filter((row) => row.stream_type === 'signal' && row.event_name === 'SIGNAL_DECLARED');
  const ingestRows = relevant.filter((row) => row.stream_type === 'ingest' && row.event_name === 'REAL_OBSERVATION_INGESTED');
  const agentRows = relevant.filter((row) => row.stream_type === 'agent' && row.event_name === 'AMV_RESPONSE');
  const warnings = [...signalWarnings];

  const confidenceSamples = relevant
    .map((row) => confidenceValue(payloadOf(row).confidence))
    .filter((value): value is number => value !== null);
  const confidence = confidenceSamples.length
    ? clamp01(confidenceSamples.reduce((sum, value) => sum + value, 0) / confidenceSamples.length)
    : 0;

  const degradedCount = relevant.filter((row) => payloadOf(row).sourceState === 'degraded').length;
  const highConfidenceObserved = relevant.filter((row) => payloadOf(row).sourceState === 'observed' && (confidenceValue(payloadOf(row).confidence) ?? 0) >= 0.7).length;
  const degradation = clamp01((degradedCount * 0.18) + Math.max(0, relevant.length - highConfidenceObserved) * 0.015 + (confidenceSamples.length ? (1 - confidence) * 0.18 : 0));
  const operationalCapacity = clamp01((0.42 + confidence * 0.58) * (1 - degradation));
  const latest = relevant[0];
  const latestSourceState = latest ? payloadOf(latest).sourceState : null;
  const sourceState = latestSourceState === 'degraded' || warnings.length > 0
    ? 'degraded'
    : ingestRows.length > 0 || signalRows.length > 0
      ? 'observed'
      : 'missing';

  const evidenceLevels = new Set(relevant.map((row) => stringValue(payloadOf(row).evidenceLevel)).filter(Boolean));
  const evidenceLevel = evidenceLevels.size === 0
    ? 'none'
    : evidenceLevels.size > 1
      ? 'mixed'
      : evidenceLevels.has('external')
        ? 'external'
        : evidenceLevels.has('direct')
          ? 'direct'
          : 'declared';

  const regime = sourceState === 'degraded'
    ? 'degraded'
    : ingestRows.length > 0
      ? 'observing'
      : signalRows.length > 0
        ? 'declared'
        : 'silent';

  if (!relevant.length) warnings.push('no_field_events_found');

  return {
    signalCount: signalRows.length,
    ingestCount: ingestRows.length,
    agentResponseCount: agentRows.length,
    confidence,
    degradation,
    operationalCapacity,
    sourceState,
    evidenceLevel,
    regime,
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
    const signalReadModel = buildSignalReadModel(rows);
    const summary = summarizeEvents(rows, signalReadModel.warnings);
    const fieldState = {
      fieldId: `field:${ctx.node.id}`,
      nodeId: ctx.node.id,
      regime: summary.regime,
      sourceState: summary.sourceState,
      evidenceLevel: summary.evidenceLevel,
      confidence: summary.confidence,
      updatedAt: new Date().toISOString(),
      metrics: {
        ihg: summary.confidence,
        nti: clamp01(summary.degradation * 0.5),
        ldi: summary.degradation,
        degradation: summary.degradation,
        operationalCapacity: summary.operationalCapacity,
      },
      operationalCapacity: summary.operationalCapacity,
      degradation: summary.degradation,
      signalCount: summary.signalCount,
      ingestCount: summary.ingestCount,
      agentResponseCount: summary.agentResponseCount,
      nodes: [],
      links: [],
    };

    return apiOk(fieldState, traceId, summary.warnings.length ? summary.warnings : undefined);
  } catch (error) {
    return apiSanitizedError(error, 500, traceId);
  }
}
