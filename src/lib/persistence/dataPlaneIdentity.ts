import 'server-only';

import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto';

const DATA_PLANE_KID = 'sfi-data-plane-v1';
const DATA_PLANE_ISSUER = 'https://systemfriction.org';
const DATA_PLANE_AUDIENCE = 'sfi-neon-data-api';
const DATA_PLANE_SERVICE_ROLE = 'sfi_continuity_service';
const ED25519_PKCS8_SEED_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

function signingSecret() {
  const secret = (process.env.SFI_EXTERNAL_SESSION_SECRET || '').trim();
  if (!secret) throw new Error('SFI_EXTERNAL_SESSION_SECRET is not configured.');
  return secret;
}

function derivedSeed() {
  return createHash('sha256')
    .update('SFI-DATA-PLANE-SIGNING-V1\0', 'utf8')
    .update(signingSecret(), 'utf8')
    .digest();
}

function signingKey() {
  return createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_SEED_PREFIX, derivedSeed()]),
    format: 'der',
    type: 'pkcs8',
  });
}

function encoded(value: unknown) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export function getSfiDataPlaneJwks() {
  const publicKey = createPublicKey(signingKey());
  const jwk = publicKey.export({ format: 'jwk' }) as JsonWebKey;
  return {
    keys: [{
      ...jwk,
      kid: DATA_PLANE_KID,
      alg: 'EdDSA',
      use: 'sig',
    }],
  };
}

export function mintSfiDataPlaneServiceJwt(ttlSeconds = 300) {
  const now = Math.floor(Date.now() / 1000);
  const header = encoded({ alg: 'EdDSA', typ: 'JWT', kid: DATA_PLANE_KID });
  const payload = encoded({
    iss: DATA_PLANE_ISSUER,
    aud: DATA_PLANE_AUDIENCE,
    sub: 'sfi:data-plane',
    role: DATA_PLANE_SERVICE_ROLE,
    iat: now,
    nbf: now - 5,
    exp: now + Math.max(60, Math.min(ttlSeconds, 300)),
  });
  const unsigned = `${header}.${payload}`;
  const signature = sign(null, Buffer.from(unsigned, 'utf8'), signingKey()).toString('base64url');
  return `${unsigned}.${signature}`;
}

export const SFI_DATA_PLANE_JWT = {
  issuer: DATA_PLANE_ISSUER,
  audience: DATA_PLANE_AUDIENCE,
  role: DATA_PLANE_SERVICE_ROLE,
  kid: DATA_PLANE_KID,
} as const;
