import { createHash, randomBytes, scrypt } from 'node:crypto';
import { continuityDatabase } from '@/lib/sfi/continuityPostgres';

type BootstrapResult =
  | { status: 'ACTIVATED'; userId: string }
  | { status: 'INVALID_OR_EXPIRED' };

const SCRYPT_N = 16384;
const SCRYPT_R = 16;
const SCRYPT_P = 1;
const SCRYPT_DK_LEN = 64;
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2;

/**
 * One-shot founder recovery seal.
 *
 * Only SHA-256(code) is committed. The raw code is delivered out-of-band and
 * never persisted in GitHub or Neon. This recovery path is additionally bound
 * to the already-existing founder Neon Auth user + institutional email and can
 * only initialize an empty credential. Once a password exists it is inert.
 *
 * Remove this seal after observed login RETURN.
 */
const FOUNDER_RECOVERY_IDENTIFIER =
  'sfi-continuity-bootstrap:f4f2b58c66c639138299ee54e5680b8a299cd84f1a37b2676a21985dc82d916a';
const FOUNDER_RECOVERY_AUTH_USER_ID = '0a9ae979-49d0-41e9-9ebb-851310d28a45';
const FOUNDER_RECOVERY_EMAIL = 'jmarin@systemfriction.org';

function bootstrapIdentifier(code: string) {
  const digest = createHash('sha256').update(code.trim(), 'utf8').digest('hex');
  return `sfi-continuity-bootstrap:${digest}`;
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

async function hashBetterAuthPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await generateBetterAuthKey(password, salt);
  return `${salt}:${key.toString('hex')}`;
}

/**
 * Consume one founder-authorized bootstrap verification and initialize the
 * already-existing Neon credential. Normal bootstrap verifications store only
 * SHA-256(code) in neon_auth.verification and are consumed atomically with the
 * password write. The bounded recovery seal above provides the same digest-only
 * property when the original raw bootstrap was never delivered.
 *
 * No account, user, profile, role, module access or ROOT authority is created.
 */
export async function activateNeonPasswordWithBootstrap(
  code: string,
  password: string,
): Promise<BootstrapResult> {
  const sql = continuityDatabase();
  const identifier = bootstrapIdentifier(code);
  const nativeHash = await hashBetterAuthPassword(password);

  const rows = await sql`
    with consumed as (
      delete from neon_auth.verification v
      using neon_auth.account a
      where v.identifier = ${identifier}
        and v."expiresAt" > now()
        and a."userId" = v.value::uuid
        and a."providerId" = 'credential'
        and a.password is null
      returning v.value
    ),
    founder_recovery as (
      select a."userId"::text as value
        from neon_auth.account a
        join neon_auth."user" u on u.id = a."userId"
       where ${identifier} = ${FOUNDER_RECOVERY_IDENTIFIER}
         and u.id = ${FOUNDER_RECOVERY_AUTH_USER_ID}::uuid
         and lower(u.email) = lower(${FOUNDER_RECOVERY_EMAIL})
         and a."providerId" = 'credential'
         and a.password is null
    ),
    eligible as (
      select value from consumed
      union all
      select value from founder_recovery
    ),
    updated as (
      update neon_auth.account a
         set password = ${nativeHash},
             "updatedAt" = now()
        from eligible e
       where a."userId" = e.value::uuid
         and a."providerId" = 'credential'
         and a.password is null
      returning a."userId"::text as user_id
    )
    select user_id from updated
  `;

  const userId = typeof rows[0]?.user_id === 'string' ? rows[0].user_id : null;
  if (!userId) return { status: 'INVALID_OR_EXPIRED' };
  return { status: 'ACTIVATED', userId };
}
