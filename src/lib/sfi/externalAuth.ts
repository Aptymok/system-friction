export type ExternalCredential = {
  label?: string;
  scopes?: string[];
  role?: 'agent' | 'root_delegate' | string;
  actorId?: string;
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

export function authorizeExternalRequest(req: Request, scope: string): ExternalAuthResult {
  const token = readPresentedToken(req);
  const raw = process.env.SFI_EXTERNAL_API_KEYS_JSON || '';
  if (!token) {
    return { credential: null, tokenPresent: false, registryConfigured: Boolean(raw.trim()), scopeAllowed: false };
  }

  try {
    const registry = JSON.parse(raw || '{}') as Record<string, ExternalCredential>;
    const credential = registry[token];
    if (!credential) {
      return { credential: null, tokenPresent: true, registryConfigured: Object.keys(registry).length > 0, scopeAllowed: false };
    }
    const scopes = credential.scopes ?? [];
    const scopeAllowed = scopes.includes(scope) || scopes.includes('*');
    return { credential: scopeAllowed ? credential : null, tokenPresent: true, registryConfigured: true, scopeAllowed };
  } catch {
    return { credential: null, tokenPresent: true, registryConfigured: false, scopeAllowed: false };
  }
}

export function externalActor(credential: ExternalCredential) {
  return credential.actorId?.trim() || `external:${credential.label?.trim() || 'agent'}`;
}
