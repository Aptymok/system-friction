import 'server-only';

export type ExternalAgentCredential = {
  label?: string;
  scopes?: string[];
  role?: 'agent' | 'root_delegate' | string;
  actorId?: string;
  tenantId?: string;
};

export type ExternalAgentAuth = {
  ok: boolean;
  tokenPresent: boolean;
  registryConfigured: boolean;
  scopeAllowed: boolean;
  credential: ExternalAgentCredential | null;
  actorId: string | null;
  scope: string;
};

function tokenFromRequest(req: Request) {
  const headerToken = req.headers.get('x-sfi-token')?.trim();
  if (headerToken) return headerToken;
  return req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null;
}

export function authenticateExternalAgent(req: Request, scope: string): ExternalAgentAuth {
  const token = tokenFromRequest(req);
  const raw = process.env.SFI_EXTERNAL_API_KEYS_JSON || '';
  const base = {
    tokenPresent: Boolean(token),
    registryConfigured: Boolean(raw.trim()),
    scopeAllowed: false,
    credential: null as ExternalAgentCredential | null,
    actorId: null as string | null,
    scope,
  };
  if (!token || !raw.trim()) return { ok: false, ...base };

  try {
    const registry = JSON.parse(raw) as Record<string, ExternalAgentCredential>;
    const credential = registry[token] ?? null;
    const scopes = credential?.scopes ?? [];
    const scopeAllowed = Boolean(credential && (scopes.includes(scope) || scopes.includes('*')));
    const actorId = credential
      ? credential.actorId?.trim() || `external:${credential.label?.trim() || 'agent'}`
      : null;
    return {
      ok: scopeAllowed,
      ...base,
      scopeAllowed,
      credential,
      actorId,
    };
  } catch {
    return { ok: false, ...base, registryConfigured: false };
  }
}

export function externalAuthError(auth: ExternalAgentAuth) {
  return {
    ok: false,
    error: 'unauthorized',
    auth: {
      tokenPresent: auth.tokenPresent,
      registryConfigured: auth.registryConfigured,
      scopeAllowed: auth.scopeAllowed,
      requestedScope: auth.scope,
    },
  };
}
