import { NextRequest, NextResponse } from 'next/server';
import { ensureOwnedNode } from '@/lib/server/productionBackend';
import type { ApiResult } from '../../../../../packages/api-contracts/src';
import { buildSignalReadModel } from '../../../../../packages/events/src/signal-read-model';
import { sanitizeError } from '../../../../../packages/security/src';

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
      .eq('stream_type', 'signal')
      .eq('event_name', 'SIGNAL_DECLARED')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return apiSanitizedError(error, 500, traceId);

    const readModel = buildSignalReadModel(data || []);
    return apiOk(readModel, traceId, readModel.warnings.length ? readModel.warnings : undefined);
  } catch (error) {
    return apiSanitizedError(error, 500, traceId);
  }
}
