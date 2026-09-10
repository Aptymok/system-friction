import {
  SFI_AUTHENTICATED_MACHINE_PROTOCOL_VERSION,
  SFI_AUTHENTICATED_MACHINE_SERVER_ID,
  dispatchAuthenticatedMachineRequest,
  type SfiAuthenticatedMachineEventInput,
  type SfiAuthenticatedMachinePrincipal,
} from '@/lib/mcp/authenticatedGovernedMachineAdapter';
import { appendEpistemicEvent, streamRecentEpistemicEvents } from '@/lib/events/eventStore';
import { capabilityGrantNonceHash } from '@/lib/sfi/cognitive-runtime/capabilityGrant';
import { executeManualCognitiveAgent } from '@/lib/sfi/cognitive-runtime/manualExecution';
import {
  authorizeExternalRequest,
  externalActor,
  externalAuthError,
} from '@/lib/sfi/externalAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const LEGACY_MCP_PROTOCOL_VERSIONS = new Set(['2025-11-25', '2025-06-18', '2025-03-26']);

type JsonObject = Record<string, unknown>;

function row(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function requestId(value: unknown): string | number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = (value as Record<string, unknown>).id;
  return typeof id === 'string' || typeof id === 'number' || id === null ? id : null;
}

function method(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const candidate = (value as Record<string, unknown>).method;
  return typeof candidate === 'string' ? candidate : '';
}

function requestedProtocol(value: unknown): string {
  const candidate = text(row(row(value).params).protocolVersion);
  return LEGACY_MCP_PROTOCOL_VERSIONS.has(candidate) ? candidate : SFI_AUTHENTICATED_MACHINE_PROTOCOL_VERSION;
}

function requestedGrantId(value: unknown) {
  const params = row(row(value).params);
  const args = row(params.arguments);
  return text(row(args.authorization).grantId);
}

function responseHeaders(protocolVersion: string = SFI_AUTHENTICATED_MACHINE_PROTOCOL_VERSION) {
  return {
    'Cache-Control': 'no-store',
    'X-SFI-MCP-Server': SFI_AUTHENTICATED_MACHINE_SERVER_ID,
    'X-SFI-MCP-Protocol': protocolVersion,
  };
}

function errorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data: Record<string, unknown>,
  status: number,
) {
  return Response.json({ jsonrpc: '2.0', id, error: { code, message, data } }, {
    status,
    headers: responseHeaders(),
  });
}

function oauthChallenge(request: Request, scope: string) {
  const origin = new URL(request.url).origin;
  return `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource", scope="${scope}"`;
}

function negotiateLegacyInitialize(body: JsonObject, protocolVersion: string) {
  const result = row(body.result);
  if (!Object.keys(result).length) return body;
  return { ...body, result: { ...result, protocolVersion } };
}

export async function GET(request: Request) {
  return new Response(null, {
    status: 401,
    headers: {
      ...responseHeaders(),
      'WWW-Authenticate': oauthChallenge(request, 'observe'),
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

  const requestMethod = method(payload);
  const requiredScope = requestMethod === 'tools/call' ? 'execute' : 'observe';
  const auth = authorizeExternalRequest(request, requiredScope);
  const credential = auth.credential;
  if (!credential) {
    return Response.json(externalAuthError(auth, requiredScope), {
      status: 401,
      headers: {
        'Cache-Control': 'no-store',
        'WWW-Authenticate': oauthChallenge(request, requiredScope),
      },
    });
  }

  if (
    credential.authMethod !== 'oauth'
    || !credential.subjectId
    || !credential.clientId
  ) {
    return errorResponse(requestId(payload), -32041, 'OAuthClientBindingRequired', {
      reason: 'USER_BOUND_OAUTH_WITH_CLIENT_ID_REQUIRED',
      staticTokenExecutionAllowed: false,
    }, 403);
  }

  if (requestMethod === 'notifications/initialized') {
    return new Response(null, { status: 202, headers: responseHeaders(requestedProtocol(payload)) });
  }
  if (requestMethod === 'ping') {
    return Response.json({ jsonrpc: '2.0', id: requestId(payload), result: {} }, {
      status: 200,
      headers: responseHeaders(requestedProtocol(payload)),
    });
  }

  const principal: SfiAuthenticatedMachinePrincipal = {
    subjectId: credential.subjectId,
    actorId: externalActor(credential),
    clientId: credential.clientId,
    tenantId: credential.tenantId ?? 'sfi',
    scopes: credential.scopes ?? [],
    authMethod: 'oauth',
  };

  // The raw ephemeral grant nonce is accepted only as a transient machine header.
  // Hash it immediately, never place it in the JSON envelope, event payload, browser
  // state, execution context, or model context. If proof does not match the persisted
  // nonceHash for the requested grant, that admission is invisible to authorization
  // and the canonical adapter fails closed with its normal denial receipt.
  const targetGrantId = requestMethod === 'tools/call' ? requestedGrantId(payload) : '';
  const rawGrantNonce = requestMethod === 'tools/call'
    ? request.headers.get('x-sfi-capability-grant-nonce')?.trim() ?? ''
    : '';
  const presentedGrantNonceHash = rawGrantNonce ? capabilityGrantNonceHash(rawGrantNonce) : null;

  const result = await dispatchAuthenticatedMachineRequest(payload, principal, {
    readHistory: async () => {
      const history = await streamRecentEpistemicEvents(500);
      const entries = (history.data ?? []).map((entry) => ({
        eventId: typeof entry.event_id === 'string' ? entry.event_id : null,
        eventName: typeof entry.event_name === 'string' ? entry.event_name : '',
        payload: entry.payload,
      }));

      if (!targetGrantId) return entries;
      return entries.filter((entry) => {
        if (entry.eventName !== 'SFI_CAPABILITY_ADMITTED') return true;
        const eventPayload = row(entry.payload);
        const eventGrantId = text(row(eventPayload.grant).grantId);
        if (eventGrantId !== targetGrantId) return true;
        const persistedNonceHash = text(eventPayload.nonceHash);
        return Boolean(presentedGrantNonceHash && persistedNonceHash && persistedNonceHash === presentedGrantNonceHash);
      });
    },
    appendEvent: async (event: SfiAuthenticatedMachineEventInput) => {
      const persisted = await appendEpistemicEvent(event);
      if (!persisted.ok) return { ok: false as const, error: persisted.error };
      return { ok: true as const, eventId: String(persisted.data.event_id) };
    },
    executeCognitive: async (execution, boundPrincipal) => executeManualCognitiveAgent(execution, {
      userId: boundPrincipal.subjectId,
      actorId: boundPrincipal.actorId,
      tenantId: boundPrincipal.tenantId,
      requestSource: 'EXTERNAL_API',
      allowLegacyCompatibility: false,
    }),
    now: () => new Date(),
  });

  const protocolVersion: string = requestMethod === 'initialize'
    ? requestedProtocol(payload)
    : SFI_AUTHENTICATED_MACHINE_PROTOCOL_VERSION;
  const body = requestMethod === 'initialize'
    ? negotiateLegacyInitialize(result.body, protocolVersion)
    : result.body;

  return Response.json(body, {
    status: result.status,
    headers: responseHeaders(protocolVersion),
  });
}
