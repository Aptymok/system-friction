import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

export type ExternalSessionClaims = {
  v: 1;
  kind: 'access_token';
  iss: 'systemfriction.org';
  aud: 'sfi-external-v1';
  sub: string;
  actorId: string;
  label?: string;
  role: 'agent' | 'root_delegate' | string;
  tenantId: string;
  scopes: string[];
  iat: number;
  exp: number;
};

function signingSecret() {
  return (process.env.SFI_EXTERNAL_SESSION_SECRET || '').trim();
}

function base64url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signature(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function mintExternalAccessToken(input: {
  subjectId: string;
  actorId: string;
  label?: string;
  role: 'agent' | 'root_delegate' | string;
  tenantId?: string;
  scopes: string[];
  ttlSeconds?: number;
}) {
  const secret = signingSecret();
  if (!secret) throw new Error('SFI_EXTERNAL_SESSION_SECRET is not configured.');

  const now = Math.floor(Date.now() / 1000);
  const claims: ExternalSessionClaims = {
    v: 1,
    kind: 'access_token',
    iss: 'systemfriction.org',
    aud: 'sfi-external-v1',
    sub: input.subjectId,
    actorId: input.actorId,
    label: input.label,
    role: input.role,
    tenantId: input.tenantId || 'sfi',
    scopes: [...new Set(input.scopes)].sort(),
    iat: now,
    exp: now + Math.max(60, Math.min(input.ttlSeconds ?? 3600, 3600)),
  };

  const encoded = base64url(JSON.stringify(claims));
  const signed = `sfiat.v1.${encoded}`;
  return `${signed}.${signature(signed, secret)}`;
}

export function verifyExternalAccessToken(token: string): ExternalSessionClaims | null {
  const secret = signingSecret();
  if (!secret || !token.startsWith('sfiat.v1.')) return null;

  const parts = token.split('.');
  if (parts.length !== 4) return null;

  const signed = parts.slice(0, 3).join('.');
  const providedSignature = parts[3] || '';
  const expectedSignature = signature(signed, secret);
  if (!safeEqual(providedSignature, expectedSignature)) return null;

  try {
    const claims = JSON.parse(decodeBase64url(parts[2])) as Partial<ExternalSessionClaims>;
    const now = Math.floor(Date.now() / 1000);
    if (
      claims.v !== 1 ||
      claims.kind !== 'access_token' ||
      claims.iss !== 'systemfriction.org' ||
      claims.aud !== 'sfi-external-v1' ||
      typeof claims.sub !== 'string' ||
      typeof claims.actorId !== 'string' ||
      typeof claims.role !== 'string' ||
      typeof claims.tenantId !== 'string' ||
      !Array.isArray(claims.scopes) ||
      !claims.scopes.every((scope) => typeof scope === 'string') ||
      typeof claims.iat !== 'number' ||
      typeof claims.exp !== 'number' ||
      claims.exp <= now ||
      claims.iat > now + 60
    ) {
      return null;
    }
    return claims as ExternalSessionClaims;
  } catch {
    return null;
  }
}
