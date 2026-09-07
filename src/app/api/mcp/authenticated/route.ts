import {
  SFI_AUTHENTICATED_MACHINE_PROTOCOL_VERSION,
  SFI_AUTHENTICATED_MACHINE_SERVER_ID,
  dispatchAuthenticatedMachineRequest,
  type SfiAuthenticatedMachineEventInput,
  type SfiAuthenticatedMachinePrincipal,
} from '@/lib/mcp/authenticatedGovernedMachineAdapter';
import { appendEpistemicEvent, streamRecentEpistemicEvents } from '@/lib/events/eventStore';
import { executeManualCognitiveAgent } from '@/lib/sfi/cognitive-runtime/manualExecution';
import {
  authorizeExternalRequest,
  externalActor,
  externalAuthError,
} from '@/lib/sfi/externalAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

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

function errorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data: Record<string, unknown>,
  status: number,
) {
  return Response.json({ jsonrpc: '2.0', id, error: { code, message, data } }, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-SFI-MCP-Server': SFI_AUTHENTICATED_MACHINE_SERVER_ID,
      'X-SFI-MCP-Protocol': SFI_AUTHENTICATED_MACHINE_PROTOCOL_VERSION,
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

  const requiredScope = method(payload) === 'tools/call' ? 'execute' : 'observe';
  const auth = authorizeExternalRequest(request, requiredScope);
  const credential = auth.credential;
  if (!credential) {
    return Response.json(externalAuthError(auth, requiredScope), {
      status: 401,
      headers: { 'Cache-Control': 'no-store' },
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

  const principal: SfiAuthenticatedMachinePrincipal = {
    subjectId: credential.subjectId,
    actorId: externalActor(credential),
    clientId: credential.clientId,
    tenantId: credential.tenantId ?? 'sfi',
    scopes: credential.scopes ?? [],
    authMethod: 'oauth',
  };

  const result = await dispatchAuthenticatedMachineRequest(payload, principal, {
    readHistory: async () => {
      const history = await streamRecentEpistemicEvents(500);
      return (history.data ?? []).map((entry) => ({
        eventId: typeof entry.event_id === 'string' ? entry.event_id : null,
        eventName: typeof entry.event_name === 'string' ? entry.event_name : '',
        payload: entry.payload,
      }));
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

  return Response.json(result.body, {
    status: result.status,
    headers: {
      'Cache-Control': 'no-store',
      'X-SFI-MCP-Server': SFI_AUTHENTICATED_MACHINE_SERVER_ID,
      'X-SFI-MCP-Protocol': SFI_AUTHENTICATED_MACHINE_PROTOCOL_VERSION,
    },
  });
}
