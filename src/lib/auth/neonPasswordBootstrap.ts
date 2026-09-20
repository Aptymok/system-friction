import { createHash, randomBytes } from 'node:crypto';
import { continuityDatabase } from '@/lib/sfi/continuityPostgres';
import { resetNeonPassword } from '@/runtime/supabase/server';

type BootstrapResult =
  | { status: 'ACTIVATED'; userId: string }
  | { status: 'INVALID_OR_EXPIRED' };

/**
 * One-shot founder recovery seal.
 *
 * Only SHA-256(code) is committed. The raw code is delivered out-of-band and
 * never persisted in GitHub or Neon. This recovery path is bound to the
 * already-existing founder Neon Auth user + institutional email.
 *
 * The second digest is NOT a password or password hash. It is SHA-256 of the
 * exact credential hash produced by SFI's superseded local bootstrap writer.
 * It lets this repair target only that known-bad bootstrap state without
 * accepting arbitrary initialized credentials.
 *
 * Remove this seal after observed login RETURN.
 */
const FOUNDER_RECOVERY_IDENTIFIER =
  'sfi-continuity-bootstrap:f4f2b58c66c639138299ee54e5680b8a299cd84f1a37b2676a21985dc82d916a';
const FOUNDER_RECOVERY_AUTH_USER_ID = '0a9ae979-49d0-41e9-9ebb-851310d28a45';
const FOUNDER_RECOVERY_EMAIL = 'jmarin@systemfriction.org';
const FOUNDER_SUPERSEDED_CREDENTIAL_DIGEST =
  'e70a18b3cab3ed39d95b4ffc7063c0921e1b811dc7d323ac781749e8d930da59';

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function bootstrapIdentifier(code: string) {
  return `sfi-continuity-bootstrap:${sha256(code.trim())}`;
}

/**
 * Validate a founder-authorized bootstrap and delegate password hashing to the
 * managed Neon Auth /reset-password endpoint.
 *
 * Why this exists:
 * - normal bootstrap verifications may initialize only an empty credential;
 * - the temporary founder recovery seal may repair only the exact credential
 *   hash written by SFI's superseded local password hasher;
 * - Neon/Better Auth owns the final password hash and credential update.
 *
 * No account, user, profile, role, module access or ROOT authority is created.
 */
export async function activateNeonPasswordWithBootstrap(
  code: string,
  password: string,
): Promise<BootstrapResult> {
  const sql = continuityDatabase();
  const identifier = bootstrapIdentifier(code);

  const rows = await sql`
    with persisted_bootstrap as (
      select
        a."userId"::text as user_id,
        'PERSISTED_BOOTSTRAP'::text as source,
        a.password
      from neon_auth.verification v
      join neon_auth.account a
        on a."userId" = v.value::uuid
       and a."providerId" = 'credential'
      where v.identifier = ${identifier}
        and v."expiresAt" > now()
        and a.password is null
      limit 1
    ),
    founder_recovery as (
      select
        a."userId"::text as user_id,
        'FOUNDER_RECOVERY'::text as source,
        a.password
      from neon_auth.account a
      join neon_auth."user" u on u.id = a."userId"
      where ${identifier} = ${FOUNDER_RECOVERY_IDENTIFIER}
        and u.id = ${FOUNDER_RECOVERY_AUTH_USER_ID}::uuid
        and lower(u.email) = lower(${FOUNDER_RECOVERY_EMAIL})
        and a."providerId" = 'credential'
      limit 1
    )
    select * from persisted_bootstrap
    union all
    select * from founder_recovery
    limit 1
  `;

  const row = rows[0] as { user_id?: unknown; source?: unknown; password?: unknown } | undefined;
  const userId = typeof row?.user_id === 'string' ? row.user_id : null;
  const source = typeof row?.source === 'string' ? row.source : null;
  const existingHash = typeof row?.password === 'string' ? row.password : null;

  if (!userId || !source) return { status: 'INVALID_OR_EXPIRED' };

  if (
    source === 'FOUNDER_RECOVERY' &&
    existingHash !== null &&
    sha256(existingHash) !== FOUNDER_SUPERSEDED_CREDENTIAL_DIGEST
  ) {
    return { status: 'INVALID_OR_EXPIRED' };
  }

  const resetToken = randomBytes(24).toString('base64url');
  const resetIdentifier = `reset-password:${resetToken}`;

  await sql`
    insert into neon_auth.verification (identifier, value, "expiresAt")
    values (${resetIdentifier}, ${userId}, now() + interval '5 minutes')
  `;

  try {
    const reset = await resetNeonPassword(password, resetToken);
    if (!reset.ok) {
      throw new Error(`neon_managed_reset_failed:${reset.status}:${reset.message}`);
    }

    const verified = await sql`
      select password
      from neon_auth.account
      where "userId" = ${userId}::uuid
        and "providerId" = 'credential'
      limit 1
    `;
    const managedHash =
      typeof verified[0]?.password === 'string' ? verified[0].password : null;

    if (!managedHash || managedHash === existingHash) {
      throw new Error('neon_managed_reset_not_persisted');
    }

    if (source === 'PERSISTED_BOOTSTRAP') {
      await sql`
        delete from neon_auth.verification
        where identifier = ${identifier}
      `;
    }

    // Better Auth consumes this on success. The delete is an idempotent cleanup
    // in case the managed provider ever leaves a spent verification row behind.
    await sql`
      delete from neon_auth.verification
      where identifier = ${resetIdentifier}
    `;

    return { status: 'ACTIVATED', userId };
  } catch (error) {
    await sql`
      delete from neon_auth.verification
      where identifier = ${resetIdentifier}
    `.catch(() => null);
    throw error;
  }
}
