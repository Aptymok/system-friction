import {
  SFI_PUBLIC_MCP_PROTOCOL_VERSION,
  SFI_PUBLIC_MCP_SERVER_ID,
  SFI_PUBLIC_MCP_SERVER_VERSION,
  dispatchPublicMcpRequest,
  isPublicMcpRequest,
  validatePublicMcpHttpEnvelope,
} from '@/lib/mcp/publicMcpServer';
import { readGovernedPublicObservatoryState } from '@/lib/observatory/public/readGovernedPublicObservatoryState';

export const dynamic = 'force-dynamic';

const LEGACY_MCP_PROTOCOL_VERSIONS = new Set(['2025-11-25', '2025-06-18', '2025-03-26']);
const LEGACY_MCP_DEFAULT_VERSION = '2025-11-25';

type JsonObject = Record<string, unknown>;

function row(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function requestId(value: unknown): string | number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = (value as Record<string, unknown>).id;
  return typeof id === 'string' || typeof id === 'number' || id === null ? id : null;
}

function requestMethod(value: unknown) {
  return typeof row(value).method === 'string' ? String(row(value).method) : '';
}

function responseHeaders(protocolVersion: string) {
  return {
    'Cache-Control': 'no-store',
    'X-SFI-MCP-Server': SFI_PUBLIC_MCP_SERVER_ID,
    'X-SFI-MCP-Protocol': protocolVersion,
  };
}

function errorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data: Record<string, unknown>,
  status: number,
  protocolVersion = SFI_PUBLIC_MCP_PROTOCOL_VERSION,
) {
  return Response.json({
    jsonrpc: '2.0',
    id,
    error: { code, message, data },
  }, {
    status,
    headers: responseHeaders(protocolVersion),
  });
}

function legacyProtocolFor(payload: unknown) {
  const requested = String(row(row(payload).params).protocolVersion || '').trim();
  return LEGACY_MCP_PROTOCOL_VERSIONS.has(requested) ? requested : LEGACY_MCP_DEFAULT_VERSION;
}

function legacyInitialize(payload: unknown) {
  const protocolVersion = legacyProtocolFor(payload);
  return Response.json({
    jsonrpc: '2.0',
    id: requestId(payload),
    result: {
      protocolVersion,
      capabilities: { tools: {}, resources: {} },
      serverInfo: { name: SFI_PUBLIC_MCP_SERVER_ID, version: SFI_PUBLIC_MCP_SERVER_VERSION },
      instructions: 'Public authoritative reads only. Missing and unavailable states remain explicit. This endpoint does not mutate institutional state.',
    },
  }, { status: 200, headers: responseHeaders(protocolVersion) });
}

export async function GET() {
  return new Response(null, {
    status: 405,
    headers: {
      Allow: 'POST',
      'Cache-Control': 'no-store',
      'X-SFI-MCP-Server': SFI_PUBLIC_MCP_SERVER_ID,
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

  const method = requestMethod(payload);
  if (method === 'initialize') return legacyInitialize(payload);
  if (method === 'notifications/initialized') return new Response(null, { status: 202, headers: responseHeaders(LEGACY_MCP_DEFAULT_VERSION) });
  if (method === 'ping') {
    const protocolVersion = request.headers.get('mcp-protocol-version') || LEGACY_MCP_DEFAULT_VERSION;
    return Response.json({ jsonrpc: '2.0', id: requestId(payload), result: {} }, { status: 200, headers: responseHeaders(protocolVersion) });
  }

  const declaredProtocol = request.headers.get('mcp-protocol-version');
  const modernRequest = declaredProtocol === SFI_PUBLIC_MCP_PROTOCOL_VERSION || method === 'server/discover';

  if (declaredProtocol && declaredProtocol !== SFI_PUBLIC_MCP_PROTOCOL_VERSION && !LEGACY_MCP_PROTOCOL_VERSIONS.has(declaredProtocol)) {
    return errorResponse(requestId(payload), -32020, 'ProtocolVersionMismatch', {
      requested: declaredProtocol,
      supported: [SFI_PUBLIC_MCP_PROTOCOL_VERSION, ...LEGACY_MCP_PROTOCOL_VERSIONS],
    }, 400, declaredProtocol);
  }

  if (modernRequest) {
    const envelopeErrors = validatePublicMcpHttpEnvelope({
      protocolVersion: declaredProtocol,
      method: request.headers.get('mcp-method'),
      name: request.headers.get('mcp-name'),
    }, payload);

    if (envelopeErrors.length > 0) {
      return errorResponse(requestId(payload), -32020, 'HeaderMismatch', { errors: envelopeErrors }, 400);
    }
  }

  const response = await dispatchPublicMcpRequest(payload, {
    readPublicWorldState: readGovernedPublicObservatoryState,
  });

  return Response.json(response, {
    status: 200,
    headers: responseHeaders(modernRequest ? SFI_PUBLIC_MCP_PROTOCOL_VERSION : declaredProtocol || LEGACY_MCP_DEFAULT_VERSION),
  });
}
