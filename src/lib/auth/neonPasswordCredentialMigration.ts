import { randomBytes, scrypt } from 'node:crypto';
import { continuityDatabase } from '@/lib/sfi/continuityPostgres';

type LegacyBridgeResult =
  | { status: 'UPGRADED' }
  | { status: 'NOT_LEGACY' }
  | { status: 'INVALID_CREDENTIALS' }
  | { status: 'MISSING_CREDENTIAL' }
  | { status: 'RACE_LOST' };

const SCRYPT_N = 16384;
const SCRYPT_R = 16;
const SCRYPT_P = 1;
const SCRYPT_DK_LEN = 64;
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2;

function isLegacyBcrypt(hash: unknown): hash is string {
  return typeof hash === 'string' && /^\$2[aby]\$\d{2}\$/.test(hash);
}

function generateBetterAuthKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      SCRYPT_DK_LEN,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

export async function hashBetterAuthPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await generateBetterAuthKey(password, salt);
  return `${salt}:${key.toString('hex')}`;
}

/**
 * One-time continuity bridge for identities migrated from Supabase Auth without
 * a native Better Auth password credential.
 *
 * The submitted password is verified by pgcrypto inside Neon. On success the
 * credential is atomically upgraded to Better Auth scrypt format. Plaintext is
 * never persisted and Supabase is not called at runtime.
 */
export async function upgradeLegacyNeonPasswordCredential(
  email: string,
  password: string,
): Promise<LegacyBridgeResult> {
  const sql = continuityDatabase();
  const rows = await sql`
    select a.id, a.password
      from neon_auth.account a
      join neon_auth."user" u on u.id = a."userId"
     where lower(u.email) = lower(${email})
       and a."providerId" = 'credential'
     limit 1
  `;
  const row = rows[0] as { id?: string; password?: string | null } | undefined;
  if (!row?.id || !row.password) return { status: 'MISSING_CREDENTIAL' };
  if (!isLegacyBcrypt(row.password)) return { status: 'NOT_LEGACY' };

  const legacyHash = row.password;
  const verified = await sql`
    select crypt(${password}, ${legacyHash}) = ${legacyHash} as valid
  `;
  if (verified[0]?.valid !== true) return { status: 'INVALID_CREDENTIALS' };

  const nativeHash = await hashBetterAuthPassword(password);
  const updated = await sql`
    update neon_auth.account
       set password = ${nativeHash},
           "updatedAt" = now()
     where id = ${row.id}::uuid
       and password = ${legacyHash}
    returning id
  `;

  if (!updated[0]) return { status: 'RACE_LOST' };
  return { status: 'UPGRADED' };
}