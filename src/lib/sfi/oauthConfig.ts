import 'server-only';

import { timingSafeEqual } from 'node:crypto';

export type SfiOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
};

export function readSfiOAuthConfig(): SfiOAuthConfig | null {
  const clientId = (process.env.SFI_OAUTH_CLIENT_ID || '').trim();
  const clientSecret = (process.env.SFI_OAUTH_CLIENT_SECRET || '').trim();
  const sessionSecret = (process.env.SFI_EXTERNAL_SESSION_SECRET || '').trim();
  const redirectUris = (process.env.SFI_OAUTH_REDIRECT_URIS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!clientId || !clientSecret || !sessionSecret || redirectUris.length === 0) return null;
  return { clientId, clientSecret, redirectUris };
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isAllowedOAuthRedirect(config: SfiOAuthConfig, redirectUri: string) {
  return config.redirectUris.includes(redirectUri);
}

export function validateOAuthClient(config: SfiOAuthConfig, clientId: string, clientSecret?: string | null) {
  if (!safeEqual(clientId, config.clientId)) return false;
  if (clientSecret === undefined || clientSecret === null) return true;
  return safeEqual(clientSecret, config.clientSecret);
}
