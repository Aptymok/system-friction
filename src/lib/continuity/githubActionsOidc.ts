import 'server-only';

import { webcrypto } from 'node:crypto';

const ISSUER = 'https://token.actions.githubusercontent.com';
const JWKS_URL = 'https://token.actions.githubusercontent.com/.well-known/jwks';
const AUDIENCE = 'sfi-continuity';
const REPOSITORY = 'Aptymok/system-friction';
const REPOSITORY_ID = '1163662905';
const REF = 'refs/heads/main';
const WORKFLOW_REF = 'Aptymok/system-friction/.github/workflows/sfi-continuity-hourly.yml@refs/heads/main';
const CLOCK_SKEW_SECONDS = 30;
const MAX_TOKEN_AGE_SECONDS = 15 * 60;
const JWKS_CACHE_MS = 6 * 60 * 60 * 1000;

type JwtHeader = {
  alg?: string;
  kid?: string;
  typ?: string;
};

export type GitHubActionsOidcClaims = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  repository?: string;
  repository_id?: string;
  ref?: string;
  workflow_ref?: string;
  event_name?: string;
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

function audienceIncludes(aud: GitHubActionsOidcClaims['aud'], expected: string) {
  return typeof aud === 'string' ? aud === expected : Array.isArray(aud) && aud.includes(expected);
}

export function validateGitHubActionsOidcClaims(
  claims: GitHubActionsOidcClaims,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  if (claims.iss !== ISSUER) return { ok: false as const, reason: 'OIDC_ISSUER_MISMATCH' };
  if (!audienceIncludes(claims.aud, AUDIENCE)) return { ok: false as const, reason: 'OIDC_AUDIENCE_MISMATCH' };
  if (claims.repository !== REPOSITORY) return { ok: false as const, reason: 'OIDC_REPOSITORY_MISMATCH' };
  if (String(claims.repository_id ?? '') !== REPOSITORY_ID) return { ok: false as const, reason: 'OIDC_REPOSITORY_ID_MISMATCH' };
  if (claims.ref !== REF) return { ok: false as const, reason: 'OIDC_REF_MISMATCH' };
  if (claims.workflow_ref !== WORKFLOW_REF) return { ok: false as const, reason: 'OIDC_WORKFLOW_REF_MISMATCH' };
  if (!['schedule', 'workflow_dispatch'].includes(String(claims.event_name ?? ''))) {
    return { ok: false as const, reason: 'OIDC_EVENT_NOT_ALLOWED' };
  }
  if (typeof claims.exp !== 'number' || claims.exp < nowSeconds - CLOCK_SKEW_SECONDS) {
    return { ok: false as const, reason: 'OIDC_TOKEN_EXPIRED' };
  }
  if (typeof claims.nbf === 'number' && claims.nbf > nowSeconds + CLOCK_SKEW_SECONDS) {
    return { ok: false as const, reason: 'OIDC_TOKEN_NOT_YET_VALID' };
  }
  if (typeof claims.iat !== 'number' || claims.iat < nowSeconds - MAX_TOKEN_AGE_SECONDS || claims.iat > nowSeconds + CLOCK_SKEW_SECONDS) {
    return { ok: false as const, reason: 'OIDC_TOKEN_AGE_INVALID' };
  }
  return { ok: true as const, reason: 'GITHUB_ACTIONS_OIDC' };
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
