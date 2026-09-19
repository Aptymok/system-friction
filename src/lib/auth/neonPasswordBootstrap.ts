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
 * already-existing Neon credential. The verification stores only SHA-256(code)
 * in its identifier and is consumed atomically with the password write.
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
    updated as (
      update neon_auth.account a
         set password = ${nativeHash},
             "updatedAt" = now()
        from consumed c
       where a."userId" = c.value::uuid
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
