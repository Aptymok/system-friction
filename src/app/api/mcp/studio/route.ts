import { POST as canonicalStudioPost } from '@/app/api/external/v1/studio/route';
import {
  SFI_STUDIO_MCP_PROTOCOL_VERSION,
  SFI_STUDIO_MCP_SERVER_ID,
  dispatchStudioMcpRequest,
  isStudioMcpRequest,
  studioMcpProtocolVersionFor,
  studioMcpRequiredScope,
  type StudioOperation,
} from '@/lib/mcp/studioMcpServer';
import { authorizeExternalRequest, externalAuthError } from '@/lib/sfi/externalAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

type JsonObject = Record<string, unknown>;

const INITIAL_STUDIO_OAUTH_SCOPE = 'studio:read studio:content studio:run';

function row(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function requestId(value: unknown): string | number | null {
  const id = row(value).id;
  return typeof id === 'string' || typeof id === 'number' || id === null ? id : null;
}

function responseHeaders(protocolVersion: string = SFI_STUDIO_MCP_PROTOCOL_VERSION) {
  return {
    'Cache-Control': 'private, no-store',
    'X-SFI-MCP-Server': SFI_STUDIO_MCP_SERVER_ID,
    'X-SFI-MCP-Protocol': protocolVersion,
  };
}

function oauthChallenge(request: Request, scope: string) {
  const origin = new URL(request.url).origin;
  return `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/api/mcp/studio", scope="${scope}"`;
}

function oauthRuntimeChallenge(request: Request, scope: string) {
  return `${oauthChallenge(request, scope)}, error="insufficient_scope", error_description="Authorize SFI Studio to continue"`;
}

function isPublicDiscoveryRequest(payload: unknown) {
  const request = row(payload);
  if (request.method === 'initialize' || request.method === 'ping' || request.method === 'notifications/initialized' || request.method === 'tools/list' || request.method === 'resources/list') return true;
  if (request.method !== 'resources/read') return false;
  return row(request.params).uri === 'sfi://studio/status';
}

function authenticationRequiredToolResponse(
  request: Request,
  payload: unknown,
  scope: string,
) {
  const challenge = oauthRuntimeChallenge(request, scope);
  return Response.json({
    jsonrpc: '2.0',
    id: requestId(payload),
    result: {
      content: [{
        type: 'text',
        text: `Authentication required. Authorize SFI Studio with scope ${scope} to continue.`,
      }],
      _meta: {
        'mcp/www_authenticate': [challenge],
      },
      isError: true,
    },
  }, {
    status: 401,
    headers: {
      ...responseHeaders(studioMcpProtocolVersionFor(payload)),
      'WWW-Authenticate': oauthChallenge(request, scope),
    },
  });
}

function errorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data: JsonObject,
  status: number,
  protocolVersion: string = SFI_STUDIO_MCP_PROTOCOL_VERSION,
) {
  return Response.json({ jsonrpc: '2.0', id, error: { code, message, data } }, {
    status,
    headers: responseHeaders(protocolVersion),
  });
}

function bearerHeader(request: Request) {
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  return /^Bearer\s+\S+/i.test(authorization) ? authorization : '';
}

async function invokeCanonicalStudioOperation(
  request: Request,
  operation: StudioOperation,
  args: JsonObject,
) {
  const origin = new URL(request.url).origin;
  const canonicalRequest = new Request(`${origin}/api/external/v1/studio`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: bearerHeader(request),
    },
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
      'WWW-Authenticate': oauthChallenge(request, INITIAL_STUDIO_OAUTH_SCOPE),
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

  if (!isStudioMcpRequest(payload)) {
    return errorResponse(requestId(payload), -32600, 'Invalid Request', { reason: 'INVALID_JSON_RPC_REQUEST' }, 400);
  }

  if (isPublicDiscoveryRequest(payload)) {
    const discovery = await dispatchStudioMcpRequest(payload, {
      invokeStudioOperation: async () => ({ status: 403, body: { ok: false, error: 'DISCOVERY_ONLY' } }),
    });
    const protocolVersion = studioMcpProtocolVersionFor(payload);
    if (discovery.status === 202 && Object.keys(discovery.body).length === 0) {
      return new Response(null, { status: 202, headers: responseHeaders(protocolVersion) });
    }
    return Response.json(discovery.body, {
      status: discovery.status,
      headers: responseHeaders(protocolVersion),
    });
  }

  const requestMethod = row(payload).method;
  const requiredScope = studioMcpRequiredScope(payload);
  if (!bearerHeader(request)) {
    if (requestMethod === 'tools/call') {
      return authenticationRequiredToolResponse(request, payload, requiredScope);
    }
    return Response.json(externalAuthError({
      credential: null,
      tokenPresent: false,
      registryConfigured: false,
      scopeAllowed: false,
    }, requiredScope), {
      status: 401,
      headers: { ...responseHeaders(studioMcpProtocolVersionFor(payload)), 'WWW-Authenticate': oauthChallenge(request, requiredScope) },
    });
  }

  const auth = authorizeExternalRequest(request, requiredScope);
  const credential = auth.credential;
  if (!credential) {
    if (requestMethod === 'tools/call') {
      return authenticationRequiredToolResponse(request, payload, requiredScope);
    }
    return Response.json(externalAuthError(auth, requiredScope), {
      status: 401,
      headers: { ...responseHeaders(studioMcpProtocolVersionFor(payload)), 'WWW-Authenticate': oauthChallenge(request, requiredScope) },
    });
  }
  if (credential.authMethod !== 'oauth' || !credential.subjectId || !credential.clientId) {
    return errorResponse(requestId(payload), -32041, 'OAuthClientBindingRequired', {
      reason: 'USER_BOUND_OAUTH_WITH_CLIENT_ID_REQUIRED',
      staticTokenAllowed: false,
    }, 403, studioMcpProtocolVersionFor(payload));
  }

  const result = await dispatchStudioMcpRequest(payload, {
    invokeStudioOperation: (operation, args) => invokeCanonicalStudioOperation(request, operation, args),
  });
  const protocolVersion = studioMcpProtocolVersionFor(payload);

  if (result.status === 202 && Object.keys(result.body).length === 0) {
    return new Response(null, { status: 202, headers: responseHeaders(protocolVersion) });
  }

  const errorData = row(row(result.body).error);
  const errorDetails = row(errorData.data);
  const challengedScope = typeof errorDetails.requiredScope === 'string'
    ? errorDetails.requiredScope
    : requiredScope;

  if (result.status === 401 && requestMethod === 'tools/call') {
    return authenticationRequiredToolResponse(request, payload, challengedScope);
  }

  return Response.json(result.body, {
    status: result.status,
    headers: {
      ...responseHeaders(protocolVersion),
      ...(result.status === 401 ? { 'WWW-Authenticate': oauthChallenge(request, challengedScope) } : {}),
    },
  });
}
