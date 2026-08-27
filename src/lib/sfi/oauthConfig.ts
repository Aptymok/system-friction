import 'server-only';

export const SFI_ROOT_SCOPES = [
  'observe',
  'propose',
  'execute',
  'cases:read',
  'cases:write',
  'lab:read',
  'lab:write',
  'lab:run',
  'studio:read',
  'studio:content',
  'studio:run',
] as const;

export const SFI_PERSONAL_SCOPES = [
  'cases:read',
  'cases:write',
  'lab:read',
  'lab:write',
  'lab:run',
  'studio:read',
  'studio:content',
  'studio:run',
] as const;

export const SFI_SUPPORTED_SCOPES = new Set<string>(SFI_ROOT_SCOPES);

export type SfiOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
};

// Legacy/bootstrap OAuth client. This remains supported so the existing SFI GPT
// keeps working while client registration moves to the persistent registry.
export function readSfiOAuthConfig(): SfiOAuthConfig | null {
  const clientId = (process.env.SFI_OAUTH_CLIENT_ID || '').trim();
  const clientSecret = (process.env.SFI_OAUTH_CLIENT_SECRET || '').trim();
  const redirectUris = (process.env.SFI_OAUTH_REDIRECT_URIS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!clientId || !clientSecret || redirectUris.length === 0) return null;
  return { clientId, clientSecret, redirectUris };
}

export function isSfiOAuthServerConfigured() {
  return Boolean((process.env.SFI_EXTERNAL_SESSION_SECRET || '').trim());
}
