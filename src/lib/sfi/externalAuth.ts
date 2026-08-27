import { verifyExternalAccessToken } from './externalSessionToken';

export type ExternalCredential = {
  label?: string;
  scopes?: string[];
  role?: 'agent' | 'root_delegate' | string;
  actorId?: string;
  tenantId?: string;
  subjectId?: string;
  authMethod?: 'static_token' | 'oauth';
};

export type ExternalAuthResult = {
  credential: ExternalCredential | null;
  tokenPresent: boolean;
  registryConfigured: boolean;
  scopeAllowed: boolean;
};

function readPresentedToken(req: Request) {
  const custom = req.headers.get('x-sfi-token')?.trim();
  if (custom) return custom;
  const authorization = req.headers.get('authorization')?.trim();
  if (!authorization) return '';
  return authorization.replace(/^Bearer\s+/i, '').trim();
}

function credentialAllowsScope(credential: ExternalCredential, scope: string) {
  const scopes = credential.scopes ?? [];
  return scopes.includes(scope) || scopes.includes('*');
}

function isPersonalOAuthCredential(credential: ExternalCredential) {
  return credential.authMethod === 'oauth'
    && Boolean(credential.subjectId)
    && typeof credential.tenantId === 'string'
    && credential.tenantId.startsWith('user:');
}

function routeAllowsPersonalScope(req: Request, credential: ExternalCredential, scope: string) {
  if (!isPersonalOAuthCredential(credential)) return true;
  const pathname = new URL(req.url).pathname;

  // A personal token can use the same capability names as institutional OAuth,
  // but only on APIs whose implementation is owner-scoped. Scope possession
  // never opens the institutional Method Lab, proposal queue or execution plane.
  if (scope.startsWith('studio:')) return pathname === '/api/external/v1/studio';
  if (scope.startsWith('cases:')) return pathname === '/api/external/v1/cases';
  if (scope.startsWith('lab:')) {
    return pathname === '/api/external/v1/cognitive'
      || pathname === '/api/external/v1/personal-lab';
  }
  if (scope === 'observe') {
    return pathname === '/api/external/v1/console'
      || pathname === '/api/external/v1/observe';
  }
  return false;
}

export function authorizeExternalRequest(req: Request, scope: string): ExternalAuthResult {
  const token = readPresentedToken(req);
  const raw = process.env.SFI_EXTERNAL_API_KEYS_JSON || '';
  if (!token) {
    return { credential: null, tokenPresent: false, registryConfigured: Boolean(raw.trim()), scopeAllowed: false };
  }

  // OAuth access tokens are short-lived, user-bound credentials issued by SFI
  // after authenticated account login. Institutional authority, when present,
  // is derived separately from the SFI membership registry.
  const session = verifyExternalAccessToken(token);
  if (session) {
    const credential: ExternalCredential = {
      label: session.label,
      scopes: session.scopes,
      role: session.role,
      actorId: session.actorId,
      tenantId: session.tenantId,
      subjectId: session.sub,
      authMethod: 'oauth',
    };
    const scopeAllowed = credentialAllowsScope(credential, scope)
      && routeAllowsPersonalScope(req, credential, scope);
    return { credential: scopeAllowed ? credential : null, tokenPresent: true, registryConfigured: Boolean(raw.trim()), scopeAllowed };
  }

  try {
    const registry = JSON.parse(raw || '{}') as Record<string, ExternalCredential>;
    const credential = registry[token];
    if (!credential) {
      return { credential: null, tokenPresent: true, registryConfigured: Object.keys(registry).length > 0, scopeAllowed: false };
    }
    const normalized: ExternalCredential = { ...credential, authMethod: 'static_token' };
    const scopeAllowed = credentialAllowsScope(normalized, scope);
    return { credential: scopeAllowed ? normalized : null, tokenPresent: true, registryConfigured: true, scopeAllowed };
  } catch {
    return { credential: null, tokenPresent: true, registryConfigured: false, scopeAllowed: false };
  }
}

export function externalActor(credential: ExternalCredential) {
  return credential.actorId?.trim() || `external:${credential.label?.trim() || 'agent'}`;
}

export function externalAuthError(auth: ExternalAuthResult, scope: string) {
  return {
    ok: false,
    error: 'unauthorized',
    auth: {
      tokenPresent: auth.tokenPresent,
      registryConfigured: auth.registryConfigured,
      scopeAllowed: auth.scopeAllowed,
      requestedScope: scope,
      acceptedHeaders: ['Authorization: Bearer <token>', 'X-SFI-Token: <token>'],
    },
  };
}
