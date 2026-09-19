import { POST as canonicalStudioPost } from '@/app/api/external/v1/studio/route';
import {
  SFI_STUDIO_MCP_PROTOCOL_VERSION,
  SFI_STUDIO_MCP_SERVER_ID,
  dispatchStudioMcpRequest,
  type StudioOperation,
} from '@/lib/mcp/studioMcpServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

type JsonObject = Record<string, unknown>;

function row(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function responseHeaders() {
  return {
    'Cache-Control': 'private, no-store',
    'X-SFI-MCP-Server': SFI_STUDIO_MCP_SERVER_ID,
    'X-SFI-MCP-Protocol': SFI_STUDIO_MCP_PROTOCOL_VERSION,
  };
}

function oauthChallenge(request: Request, scope: string) {
  const origin = new URL(request.url).origin;
  return `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/api/mcp/studio", scope="${scope}"`;
}

function forwardedStudioHeaders(request: Request) {
  const headers = new Headers({ 'content-type': 'application/json' });
  const authorization = request.headers.get('authorization');
  const sfiToken = request.headers.get('x-sfi-token');
  if (authorization) headers.set('authorization', authorization);
  if (sfiToken) headers.set('x-sfi-token', sfiToken);
  return headers;
}

async function invokeCanonicalStudioOperation(
  request: Request,
  operation: StudioOperation,
  args: JsonObject,
) {
  const origin = new URL(request.url).origin;
  const canonicalRequest = new Request(`${origin}/api/external/v1/studio`, {
    method: 'POST',
    headers: forwardedStudioHeaders(request),
    body: JSON.stringify({ ...args, operation }),
  });
  const response = await canonicalStudioPost(canonicalRequest);
  const body = await response.json().catch(() => ({
    ok: false,
    error: 'studio_mcp_canonical_response_not_json',
  })) as JsonObject;
  return { status: response.status, body };
}

export async function GET(request: Request) {
  return new Response(null, {
    status: 401,
    headers: {
      ...responseHeaders(),
      'WWW-Authenticate': oauthChallenge(request, 'studio:read'),
    },
  });
}

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return Response.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Invalid Request', data: { reason: 'APPLICATION_JSON_REQUIRED' } },
    }, { status: 415, headers: responseHeaders() });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error', data: { reason: 'INVALID_JSON' } },
    }, { status: 400, headers: responseHeaders() });
  }

  const result = await dispatchStudioMcpRequest(payload, {
    invokeStudioOperation: (operation, args) => invokeCanonicalStudioOperation(request, operation, args),
  });

  if (result.status === 202 && Object.keys(result.body).length === 0) {
    return new Response(null, { status: 202, headers: responseHeaders() });
  }

  const errorData = row(row(result.body).error);
  const errorDetails = row(errorData.data);
  const requiredScope = typeof errorDetails.requiredScope === 'string'
    ? errorDetails.requiredScope
    : 'studio:read';

  return Response.json(result.body, {
    status: result.status,
    headers: {
      ...responseHeaders(),
      ...(result.status === 401 ? { 'WWW-Authenticate': oauthChallenge(request, requiredScope) } : {}),
    },
  });
}
