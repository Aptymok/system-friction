import {
  SFI_PUBLIC_MCP_PROTOCOL_VERSION,
  SFI_PUBLIC_MCP_SERVER_ID,
  dispatchPublicMcpRequest,
  isPublicMcpRequest,
  validatePublicMcpHttpEnvelope,
} from '@/lib/mcp/publicMcpServer';
import { readGovernedPublicObservatoryState } from '@/lib/observatory/public/readGovernedPublicObservatoryState';

export const dynamic = 'force-dynamic';

function requestId(value: unknown): string | number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = (value as Record<string, unknown>).id;
  return typeof id === 'string' || typeof id === 'number' || id === null ? id : null;
}

function errorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data: Record<string, unknown>,
  status: number,
) {
  return Response.json({
    jsonrpc: '2.0',
    id,
    error: { code, message, data },
  }, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-SFI-MCP-Server': SFI_PUBLIC_MCP_SERVER_ID,
      'X-SFI-MCP-Protocol': SFI_PUBLIC_MCP_PROTOCOL_VERSION,
    },
  });
}

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return errorResponse(null, -32600, 'Invalid Request', { reason: 'APPLICATION_JSON_REQUIRED' }, 415);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(null, -32700, 'Parse error', { reason: 'INVALID_JSON' }, 400);
  }

  if (!isPublicMcpRequest(payload)) {
    return errorResponse(requestId(payload), -32600, 'Invalid Request', { reason: 'INVALID_JSON_RPC_REQUEST' }, 400);
  }

  const envelopeErrors = validatePublicMcpHttpEnvelope({
    protocolVersion: request.headers.get('mcp-protocol-version'),
    method: request.headers.get('mcp-method'),
    name: request.headers.get('mcp-name'),
  }, payload);

  if (envelopeErrors.length > 0) {
    return errorResponse(requestId(payload), -32020, 'HeaderMismatch', { errors: envelopeErrors }, 400);
  }

  const response = await dispatchPublicMcpRequest(payload, {
    readPublicWorldState: readGovernedPublicObservatoryState,
  });

  return Response.json(response, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
      'X-SFI-MCP-Server': SFI_PUBLIC_MCP_SERVER_ID,
      'X-SFI-MCP-Protocol': SFI_PUBLIC_MCP_PROTOCOL_VERSION,
    },
  });
}
