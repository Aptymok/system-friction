import type { ApiResult } from '../../../packages/api-contracts/src';

export type DeclareTerminalSignalInput = {
  nodeId: string;
  content: string;
  context?: Record<string, unknown>;
  correlationId?: string;
};

export type DeclaredSignalResult = {
  event: unknown;
  duplicate: boolean;
};

function makeSignalIdempotencyKey(nodeId: string, content: string) {
  const normalized = content.trim().slice(0, 240);
  const basis = `${nodeId}:${normalized}:${Date.now()}`;
  return `signal-${btoa(unescape(encodeURIComponent(basis))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 64)}`;
}

export async function declareTerminalSignal(input: DeclareTerminalSignalInput): Promise<ApiResult<DeclaredSignalResult>> {
  const content = input.content.trim();

  if (!input.nodeId || !content) {
    return { ok: false, error: 'invalid_terminal_signal_input' };
  }

  const response = await fetch('/api/signals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      contractVersion: 'signals.v1',
      idempotencyKey: makeSignalIdempotencyKey(input.nodeId, content),
      node_id: input.nodeId,
      signal_type: 'manual',
      content,
      context: input.context || {},
      correlationId: input.correlationId,
    }),
  });

  const body = await response.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'invalid_signal_response' };
  }

  return body as ApiResult<DeclaredSignalResult>;
}
