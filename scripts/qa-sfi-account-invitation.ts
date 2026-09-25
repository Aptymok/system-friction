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
const neonPasswordBootstrap = read('src/lib/auth/neonPasswordBootstrap.ts');
const continuityPostgres = read('src/lib/sfi/continuityPostgres.ts');

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
assert.match(invite, /readContinuityInstitutionalAccountAccessGrants/, 'ROOT access listing must reuse Neon continuity during primary failure');
assert.match(invite, /source: 'NEON_CONTINUITY'/, 'ROOT access listing must expose its continuity read source');
assert.match(invite, /source: 'UNAVAILABLE'/, 'ROOT access listing must fail closed without throwing the human surface away');
assert.match(continuityPostgres, /readContinuityInstitutionalAccountAccessGrants/, 'continuity layer must expose bounded institutional grant listing');
assert.match(continuityPostgres, /order by created_at desc/, 'continuity grant listing must preserve recency ordering');

assert.match(rootAccess, /inviteInstitutionalAccountAction/);
assert.match(rootAccess, /listInstitutionalAccountAccessGrants/);
assert.doesNotMatch(rootAccess, /createServiceSupabaseClient/);
assert.doesNotMatch(rootAccess, /\.from\(/, 'human interface must not own raw persistence access');
assert.match(rootAccess, /Observador — puede consultar/);
assert.match(rootAccess, /Operador — puede trabajar/);
assert.match(rootAccess, /no autoridad soberana/i);
assert.match(rootAccess, /limite_correo/);
assert.match(rootAccess, /lastInviteError/);
assert.match(rootAccess, /NEON_CONTINUITY/, 'ROOT access must visibly distinguish continuity reads');
assert.match(rootAccess, /No se modificó ningún acceso/, 'unavailable read planes must not imply a successful mutation');

assert.match(forgot, /forgotPasswordAction/);
assert.match(reset, /updateUser\(\{ password \}\)/);
assert.match(reset, /password\.length < 12/);
assert.match(reset, /SFI nunca necesita enviarte una contraseña temporal/);
assert.match(reset, /data-sfi-auth-surface="institutional-access"/, 'invitation confirmation must use the canonical SFI institutional access surface');
assert.match(reset, /SYSTEM FRICTION INSTITUTE/);
assert.match(reset, /INVITATION/);
assert.match(reset, /IDENTITY/);
assert.match(reset, /ACCESS/);
assert.match(reset, /ACCESS ≠ AUTHORITY/, 'confirmation must visibly preserve the access/authority boundary');
assert.match(reset, /CONFIRMAR Y ACTIVAR/, 'invited user must receive a clear bounded activation action');
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
assert.doesNotMatch(
  authActions.match(/export async function loginAction[\s\S]*?export async function activateContinuityPasswordAction/)?.[0] ?? '',
  /activateNeonPasswordWithBootstrap/,
  'normal login must never mutate credentials',
);
assert.match(authActions, /export async function activateContinuityPasswordAction/);
assert.match(authActions, /activateNeonPasswordWithBootstrap/, 'explicit continuity activation must own the one-time password bootstrap');
assert.match(continuityAccess, /Activar continuidad/);
assert.match(continuityAccess, /código temporal SFI/);
assert.match(continuityAccess, /repite la contraseña/);
const loginBlock = authActions.match(/export async function loginAction[\s\S]*?export async function activateContinuityPasswordAction/)?.[0] ?? '';
assert.match(loginBlock, /signInWithNeonAuth/, 'normal login must try Neon continuity credentials first');
assert.match(loginBlock, /supabase\.auth\.signInWithPassword/, 'normal login must retain Supabase compatibility for invited institutional accounts');
assert.ok(
  loginBlock.indexOf('signInWithNeonAuth') < loginBlock.indexOf('supabase.auth.signInWithPassword'),
  'Supabase compatibility must never precede Neon continuity login',
);
assert.match(loginBlock, /neon\.status === 429[\s\S]*?rate_limit/, 'Neon rate limits must not be bypassed through the secondary provider');
assert.match(loginBlock, /primaryStatus === 402 \|\| primaryStatus >= 500/, 'restricted primary auth must be represented as unavailable, not bad credentials');
assert.match(loginBlock, /let primaryUserId: string \| null = null[\s\S]*?if \(primaryUserId\) \{[\s\S]*?redirect\(await resolvePostLoginPath/, 'successful primary login must redirect outside the provider try/catch');
const primaryProviderTry = loginBlock.match(/try \{[\s\S]*?supabase\.auth\.signInWithPassword[\s\S]*?\} catch/)?.[0] ?? '';
assert.doesNotMatch(primaryProviderTry, /redirect\(/, 'NEXT_REDIRECT must never be swallowed by the Supabase compatibility catch');
assert.match(authActions, /canonicalFounderUserId\(\{ email \}\)/, 'founder Neon login must not require a profile-plane read');
assert.match(authActions, /try \{[\s\S]*?createServiceSupabaseClient\(\)[\s\S]*?\} catch \{[\s\S]*?primaryProfile = null/, 'post-login routing must degrade cleanly when the primary profile plane is unavailable');
assert.match(authActions, /await readContinuityProfile\(userId\)\.catch\(\(\) => null\)/, 'post-login routing must use the Neon continuity profile when the primary profile plane is unavailable');
assert.match(authActions, /neon\.status === 429[\s\S]*?'rate_limit'/, 'upstream Neon rate limits must remain explicit');
assert.match(authActions, /rateLimitKey\('continuity-bootstrap', 'founder'\)/, 'bootstrap activation must use a single bounded rate-limit bucket');
assert.match(authActions, /\^SFI-\[A-Za-z0-9_-\]\{24,64\}\$/, 'bootstrap code format must be bounded');
assert.match(neonPasswordBootstrap, /createHash\('sha256'\)/, 'bootstrap code must be represented by a digest in persistence');
assert.match(neonPasswordBootstrap, /v\."expiresAt" > now\(\)/, 'expired bootstrap verifications must fail');
assert.match(neonPasswordBootstrap, /a\.password is null/, 'ordinary bootstrap must not overwrite an initialized credential');
assert.ok(neonPasswordBootstrap.includes('reset-password:'), 'credential recovery must use managed reset-token semantics');
assert.match(neonPasswordBootstrap, /resetNeonPassword\(password, resetToken\)/, 'managed Neon Auth must own final password hashing');
assert.match(neonPasswordBootstrap, /insert into neon_auth\.verification/, 'managed reset token must be materialized only for the bounded recovery');
assert.match(neonPasswordBootstrap, /FOUNDER_RECOVERY_IDENTIFIER/, 'founder recovery must be digest-bound');
assert.match(neonPasswordBootstrap, /FOUNDER_RECOVERY_AUTH_USER_ID/, 'founder recovery must be bound to one existing auth user');
assert.match(neonPasswordBootstrap, /FOUNDER_RECOVERY_EMAIL/, 'founder recovery must be bound to the institutional email');
assert.match(neonPasswordBootstrap, /FOUNDER_SUPERSEDED_CREDENTIAL_DIGEST/, 'founder repair must target only the exact superseded credential state');
assert.match(neonPasswordBootstrap, /managedHash === existingHash/, 'activation must verify that Neon actually replaced the credential hash');
assert.match(neonPasswordBootstrap, /Remove this seal after observed login RETURN/, 'recovery seal must be explicitly temporary');
assert.doesNotMatch(neonPasswordBootstrap, /scrypt|SCRYPT_N|hashBetterAuthPassword/, 'SFI must not implement password hashing locally');
assert.equal(existsSync('src/app/signup/page.tsx'), false, 'public signup surface must remain absent');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-ACCOUNT-INVITATION-LIFECYCLE-1.5',
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
  rootAccessContinuityReadFallback: true,
  dualProviderInstitutionalLogin: true,
  sfiInvitationVisualGrammar: true,
}, null, 2));
