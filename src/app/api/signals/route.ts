import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ensureOwnedNode } from '@/lib/server/productionBackend';
import type { ApiResult } from '../../../../packages/api-contracts/src';
import { isValidIdempotencyKey, sanitizeError } from '../../../../packages/security/src';

type SignalIntakeCommand = {
  contractVersion: 'signals.v1';
  idempotencyKey: string;
  node_id: string;
  signal_type: 'manual';
  content: string;
  context?: Record<string, unknown>;
  correlationId?: string;
};

const MAX_SIGNAL_CONTENT_LENGTH = 8000;

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

function parseSignalIntakeCommand(input: unknown): SignalIntakeCommand | null {
  if (!isRecord(input)) return null;
  if (input.contractVersion !== 'signals.v1') return null;
  if (input.signal_type !== 'manual') return null;

  const idempotencyKey = typeof input.idempotencyKey === 'string' ? input.idempotencyKey.trim() : '';
  const nodeId = typeof input.node_id === 'string' ? input.node_id.trim() : '';
  const rawContent = typeof input.content === 'string' ? input.content.trim() : '';
  const context = isRecord(input.context) ? input.context : undefined;
  const correlationId = typeof input.correlationId === 'string' ? input.correlationId : undefined;

  if (!isValidIdempotencyKey(idempotencyKey)) return null;
  if (nodeId.length === 0) return null;
  if (rawContent.length === 0 || rawContent.length > MAX_SIGNAL_CONTENT_LENGTH) return null;
  if (input.context !== undefined && context === undefined) return null;
  if (input.correlationId !== undefined && correlationId === undefined) return null;

  return {
    contractVersion: 'signals.v1',
    idempotencyKey,
    node_id: nodeId,
    signal_type: 'manual',
    content: rawContent,
    context,
    correlationId,
  };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.json().catch(() => null);
  const command = parseSignalIntakeCommand(rawBody);
  const traceId = command?.correlationId || command?.idempotencyKey;

  if (!command) {
    return apiError('invalid_signal_intake_command', 400, undefined, {
      expectedContractVersion: 'signals.v1',
      expectedSignalType: 'manual',
      maxContentLength: MAX_SIGNAL_CONTENT_LENGTH,
    });
  }

  try {
    const ctx = await ensureOwnedNode(command.node_id);
    if (ctx.error || !ctx.node || !ctx.user) return apiError('node_not_ready', 404, traceId);

    const payloadHash = hashPayload({
      signal_type: command.signal_type,
      content: command.content,
      context: command.context || {},
    });

    const payload = {
      contractVersion: command.contractVersion,
      idempotencyKey: command.idempotencyKey,
      correlationId: command.correlationId,
      signal_type: command.signal_type,
      content: command.content,
      context: command.context || {},
      sourceState: 'declared',
      evidenceLevel: 'direct',
      confidence: 0.7,
      payloadHash,
      source: 'signals.route',
    };

    const { data: existing, error: existingError } = await ctx.service
      .from('cognitive_event_stream')
      .select('*')
      .eq('node_id', ctx.node.id)
      .eq('stream_type', 'signal')
      .eq('event_name', 'SIGNAL_DECLARED')
      .eq('payload->>idempotencyKey', command.idempotencyKey)
      .limit(1)
      .maybeSingle();

    if (existingError) return apiSanitizedError(existingError, 500, traceId);
    if (existing) return apiOk({ event: existing, duplicate: true }, traceId, ['idempotent_replay']);

    const { data, error } = await ctx.service
      .from('cognitive_event_stream')
      .insert({
        node_id: ctx.node.id,
        stream_type: 'signal',
        event_name: 'SIGNAL_DECLARED',
        payload,
        emitted_by: 'SFI_SIGNAL_INTAKE',
      })
      .select('*')
      .single();

    if (error) return apiSanitizedError(error, 500, traceId);

    return apiOk({ event: data, duplicate: false }, traceId);
  } catch (error) {
    return apiSanitizedError(error, 500, traceId);
  }
}
