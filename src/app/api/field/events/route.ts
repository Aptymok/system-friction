import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ensureOwnedNode } from '@/lib/server/productionBackend';
import type { ApiResult } from '../../../../../packages/api-contracts/src';
import { isValidIdempotencyKey, sanitizeError } from '../../../../../packages/security/src';

type FieldEventCommand = {
  command: 'field-events.create';
  contractVersion: 'field-events.v1';
  idempotencyKey: string;
  node_id: string;
  event_type: string;
  message?: string;
  trace_payload?: Record<string, unknown>;
  correlationId?: string;
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

function parseFieldEventCommand(input: unknown): FieldEventCommand | null {
  if (!isRecord(input)) return null;
  if (input.command !== 'field-events.create') return null;
  if (input.contractVersion !== 'field-events.v1') return null;

  const idempotencyKey = typeof input.idempotencyKey === 'string' ? input.idempotencyKey.trim() : '';
  const nodeId = typeof input.node_id === 'string' ? input.node_id.trim() : '';
  const eventType = typeof input.event_type === 'string' ? input.event_type.trim() : '';
  const message = typeof input.message === 'string' ? input.message : undefined;
  const correlationId = typeof input.correlationId === 'string' ? input.correlationId : undefined;
  const tracePayload = isRecord(input.trace_payload) ? input.trace_payload : undefined;

  if (!isValidIdempotencyKey(idempotencyKey)) return null;
  if (nodeId.length === 0) return null;
  if (eventType.length === 0) return null;
  if (input.message !== undefined && message === undefined) return null;
  if (input.correlationId !== undefined && correlationId === undefined) return null;
  if (input.trace_payload !== undefined && tracePayload === undefined) return null;

  return {
    command: 'field-events.create',
    contractVersion: 'field-events.v1',
    idempotencyKey,
    node_id: nodeId,
    event_type: eventType,
    message,
    trace_payload: tracePayload,
    correlationId,
  };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.json().catch(() => null);
  const command = parseFieldEventCommand(rawBody);
  const traceId = command?.correlationId || command?.idempotencyKey;

  if (!command) {
    return apiError('invalid_field_event_command', 400, undefined, {
      expectedCommand: 'field-events.create',
      expectedContractVersion: 'field-events.v1',
    });
  }

  try {
    const ctx = await ensureOwnedNode(command.node_id);
    if (ctx.error || !ctx.node || !ctx.user) return apiError('node_not_ready', 404, traceId);

    const payload = {
      ...(command.trace_payload || {}),
      message: command.message,
      command: command.command,
      contractVersion: command.contractVersion,
      idempotencyKey: command.idempotencyKey,
      correlationId: command.correlationId,
      payloadHash: hashPayload({
        event_type: command.event_type,
        message: command.message,
        trace_payload: command.trace_payload || {},
      }),
      source: 'field-events.route',
    };

    const { data: existing, error: existingError } = await ctx.service
      .from('cognitive_event_stream')
      .select('*')
      .eq('node_id', ctx.node.id)
      .eq('stream_type', 'field')
      .eq('event_name', command.event_type)
      .eq('payload->>idempotencyKey', command.idempotencyKey)
      .limit(1)
      .maybeSingle();

    if (existingError) return apiSanitizedError(existingError, 500, traceId);
    if (existing) return apiOk({ event: existing, duplicate: true }, traceId, ['idempotent_replay']);

    const { data, error } = await ctx.service
      .from('cognitive_event_stream')
      .insert({
        node_id: ctx.node.id,
        stream_type: 'field',
        event_name: command.event_type,
        payload,
        emitted_by: 'SFI_FIELD_COMMAND',
      })
      .select('*')
      .single();

    if (error) return apiSanitizedError(error, 500, traceId);

    return apiOk({ event: data, duplicate: false }, traceId);
  } catch (error) {
    return apiSanitizedError(error, 500, traceId);
  }
}
