import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const migration = read('supabase/migrations/20260911013000_sfi_account_access_grants.sql');
const invite = read('src/lib/auth/institutionalInvitation.ts');
const rootAccess = read('src/app/root/access/page.tsx');
const forgot = read('src/app/forgot/page.tsx');
const reset = read('src/components/sfi/PasswordResetSurface.tsx');
const activate = read('src/app/api/account/activate/route.ts');
const accessServer = read('src/lib/system/access/server.ts');
const productionBackend = read('src/lib/server/productionBackend.ts');
const login = read('src/components/sfi/LoginSurface.tsx');
const continuityAccess = read('src/app/continuity-access/page.tsx');
const authActions = read('src/lib/auth/actions.ts');
const neonPasswordMigration = read('src/lib/auth/neonPasswordCredentialMigration.ts');

assert.match(migration, /sfi_account_access_grants/);
assert.match(migration, /INSTITUTIONAL_OBSERVER/);
assert.match(migration, /INSTITUTIONAL_OPERATOR/);
assert.doesNotMatch(migration, /'root'\s*,|'system'\s*,|'controller'\s*,/i);
assert.match(migration, /not an institutional appointment/i);

assert.match(invite, /requireFounder\(\)/);
assert.match(invite, /auth\.admin\.inviteUserByEmail/);
assert.match(invite, /listInstitutionalAccountAccessGrants/);
assert.match(invite, /\.from\('sfi_account_access_grants'\)/);
assert.doesNotMatch(invite, /password\s*:/i, 'invitation must never generate or transmit a temporary password');
assert.match(invite, /INSTITUTIONAL_OBSERVER/);
assert.match(invite, /INSTITUTIONAL_OPERATOR/);
assert.match(invite, /previousStatus === 'INVITED'/, 'a failed resend must not erase an already-sent invitation state');
assert.match(invite, /limite_correo/, 'mail-provider rate limits must be represented explicitly');
assert.doesNotMatch(invite, /from\('profiles'\)/, 'INVITE must not provision institutional authorization profile before activation');
assert.match(invite, /profileProvisioned: false/);

assert.match(rootAccess, /inviteInstitutionalAccountAction/);
assert.match(rootAccess, /listInstitutionalAccountAccessGrants/);
assert.doesNotMatch(rootAccess, /createServiceSupabaseClient/);
assert.doesNotMatch(rootAccess, /\.from\(/, 'human interface must not own raw persistence access');
assert.match(rootAccess, /Observador — puede consultar/);
assert.match(rootAccess, /Operador — puede trabajar/);
assert.match(rootAccess, /no autoridad soberana/i);
assert.match(rootAccess, /limite_correo/);
assert.match(rootAccess, /lastInviteError/);

assert.match(forgot, /forgotPasswordAction/);
assert.match(reset, /updateUser\(\{ password \}\)/);
assert.match(reset, /password\.length < 12/);
assert.match(reset, /SFI nunca necesita enviarte una contraseña temporal/);
assert.match(reset, /mode === 'invite'/, 'institutional activation must be required only for invite completion');
assert.match(reset, /activationBody\.activated !== true/, 'invite UI must not redirect before institutional activation is confirmed');
assert.match(reset, /La contraseña quedó guardada, pero SFI no confirmó el acceso institucional/);
assert.doesNotMatch(reset, /fetch\('\/api\/account\/activate'[\s\S]*?\.catch\(\(\) => null\)/, 'activation failure must never be swallowed');

assert.match(activate, /requireAuthenticatedUser\(\)/);
assert.match(activate, /\.eq\('email', email\)/);
assert.match(activate, /display_name,title,access_class,last_invite_error/);
assert.match(activate, /institutional_account: true/);
assert.match(activate, /profileWrite/);
assert.match(activate, /activation_profile_provision_failed/);
assert.match(activate, /found\.data\.status === 'INVITED'/, 'activation requires a delivered/accepted invitation state');
assert.match(activate, /found\.data\.status === 'ACTIVE'/, 'active access may be reconciled idempotently');
assert.match(activate, /retryingVerifiedProfileProvision/, 'only verified profile-provision failures may retry from INVITE_FAILED');
assert.match(activate, /last_invite_error === 'activation_profile_provision_failed'/);
assert.doesNotMatch(activate, /\.in\('status', \['PENDING'/, 'PENDING grants must never be promotable by activation');
assert.match(activate, /status: 'ACTIVE'/);
assert.match(activate, /\.select\('id,status,activated_at'\)/, 'activation must verify that the grant actually became ACTIVE');
assert.match(activate, /ACCOUNT_INVITATION_ACTIVATED/);
for (const invariant of [
  'full_access: false',
  'executor: false',
  'root_execution: false',
  'governance_write: false',
  'sovereign_actions: false',
  'canonical_promotion: false',
  'institutional_appointment: false',
]) assert.ok(activate.includes(invariant), `missing bounded-access invariant at activation: ${invariant}`);

assert.match(accessServer, /hasActiveInstitutionalAccountGrant/);
assert.match(accessServer, /grant\.data\.status === 'ACTIVE'/);
assert.match(accessServer, /access\.institutional_account === true[\s\S]*?hasActiveInstitutionalAccountGrant\(context\.user\)/);
assert.match(productionBackend, /hasActiveInstitutionalAccountGrant/);
assert.match(productionBackend, /observerRoleAuthorized/);
assert.match(productionBackend, /Boolean\(institutionalMember\) \|\| activeInstitutionalAccount/);

assert.match(login, /\/forgot/);
assert.doesNotMatch(authActions.match(/export async function loginAction[\s\S]*?export async function activateContinuityPasswordAction/)?.[0] ?? '', /migrateStagedNeonPasswordCredential/, 'normal login must never mutate credentials');
assert.match(authActions, /export async function activateContinuityPasswordAction/);
assert.match(authActions, /migrateStagedNeonPasswordCredential/, 'explicit continuity activation must own the one-time credential migration');
assert.match(continuityAccess, /Activar continuidad/);
assert.match(continuityAccess, /ACTIVAR EN NEON/);
assert.doesNotMatch(authActions, /supabase\.auth\.signInWithPassword/, 'continuity login must not depend on Supabase Auth during the outage window');
assert.match(authActions, /neon\.status === 429[\s\S]*?'rate_limit'/, 'upstream Neon rate limits must remain explicit');
assert.match(authActions, /const email = parsed\.data\.email\.trim\(\)\.toLowerCase\(\)[\s\S]*?rateLimitKey\('continuity-activate', email\)/, 'continuity activation must normalize email before rate-limit bucketing');
assert.doesNotMatch(authActions, /result\.status === 'UPGRADED' \|\| result\.status === 'RACE_LOST'/, 'lost compare-and-swap race must not be reported as activation success');
assert.match(authActions, /result\.status === 'RACE_LOST'[\s\S]*?error=retry/, 'lost compare-and-swap race must request a retry');
assert.match(authActions, /invalid_credentials/, 'provider-specific credential failures must collapse to a generic login error');
assert.match(neonPasswordMigration, /crypt\(\$\{password\}, \$\{stagedHash\}\) = \$\{stagedHash\}/, 'staged bcrypt verification must occur inside Neon pgcrypto');
assert.match(neonPasswordMigration, /SCRYPT_N = 16384/);
assert.match(neonPasswordMigration, /SCRYPT_R = 16/);
assert.match(neonPasswordMigration, /SCRYPT_P = 1/);
assert.match(neonPasswordMigration, /SCRYPT_DK_LEN = 64/);
assert.match(neonPasswordMigration, /password\.normalize\('NFKC'\)/);
assert.match(neonPasswordMigration, /where id = \$\{row\.id\}::uuid[\s\S]*and password = \$\{stagedHash\}/, 'credential upgrade must be compare-and-swap');
assert.equal(existsSync('src/app/signup/page.tsx'), false, 'public signup surface must remain absent');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-ACCOUNT-INVITATION-LIFECYCLE-1.3',
  invitationOnly: true,
  temporaryPasswordGenerated: false,
  founderAdminRequired: true,
  accountAccessCreatesAppointment: false,
  sovereignAuthorityGrantedByInvite: false,
  publicSignupEnabled: false,
  verifiedPasswordResetAvailable: true,
  humanInterfaceOwnsPersistence: false,
  activationFailureCanBeSilent: false,
  activationRequiresInstitutionalProfile: true,
  activeGrantRequiredForInstitutionalAccount: true,
  pendingGrantCanActivate: false,
  deliveryFailedGrantCanActivate: false,
  verifiedProfileProvisionFailureCanRetry: true,
  failedResendPreservesExistingInvite: true,
}, null, 2));
