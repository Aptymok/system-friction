import 'server-only';

import { webcrypto } from 'node:crypto';
import {
  GITHUB_OIDC_ISSUER,
  type GitHubActionsOidcClaims,
  validateGitHubActionsOidcClaims,
} from './githubActionsOidcPolicy';

const JWKS_URL = `${GITHUB_OIDC_ISSUER}/.well-known/jwks`;
const JWKS_CACHE_MS = 6 * 60 * 60 * 1000;

type JwtHeader = {
  alg?: string;
  kid?: string;
  typ?: string;
};

type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string };
type Jwks = { keys?: Jwk[] };

let jwksCache: { expiresAt: number; keys: Jwk[] } | null = null;

function decodeJson<T>(segment: string): T | null {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

async function readJwks(): Promise<Jwk[]> {
  if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys;
  const response = await fetch(JWKS_URL, {
    method: 'GET',
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GITHUB_OIDC_JWKS_HTTP_${response.status}`);
  const body = await response.json() as Jwks;
  const keys = Array.isArray(body.keys) ? body.keys : [];
  if (!keys.length) throw new Error('GITHUB_OIDC_JWKS_EMPTY');
  jwksCache = { expiresAt: Date.now() + JWKS_CACHE_MS, keys };
  return keys;
}

async function verifySignature(token: string, header: JwtHeader) {
  if (header.alg !== 'RS256' || !header.kid) return false;
  const [encodedHeader, encodedClaims, encodedSignature] = token.split('.');
  if (!encodedHeader || !encodedClaims || !encodedSignature) return false;
  const keys = await readJwks();
  const jwk = keys.find((key) => key.kid === header.kid && (!key.alg || key.alg === 'RS256'));
  if (!jwk) return false;
  const key = await webcrypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  return webcrypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    Buffer.from(encodedSignature, 'base64url'),
    Buffer.from(`${encodedHeader}.${encodedClaims}`, 'utf8'),
  );
}

export async function verifyGitHubActionsOidcToken(token: string) {
  const segments = token.split('.');
  if (segments.length !== 3) return { ok: false as const, reason: 'OIDC_TOKEN_MALFORMED' };
  const header = decodeJson<JwtHeader>(segments[0]);
  const claims = decodeJson<GitHubActionsOidcClaims>(segments[1]);
  if (!header || !claims) return { ok: false as const, reason: 'OIDC_TOKEN_DECODE_FAILED' };
  try {
    if (!(await verifySignature(token, header))) return { ok: false as const, reason: 'OIDC_SIGNATURE_INVALID' };
  } catch (error) {
    return { ok: false as const, reason: error instanceof Error ? error.message : 'OIDC_SIGNATURE_VERIFICATION_FAILED' };
  }
  return validateGitHubActionsOidcClaims(claims);
}
