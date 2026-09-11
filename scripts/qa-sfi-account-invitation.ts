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
const login = read('src/components/sfi/LoginSurface.tsx');

assert.match(migration, /sfi_account_access_grants/);
assert.match(migration, /INSTITUTIONAL_OBSERVER/);
assert.match(migration, /INSTITUTIONAL_OPERATOR/);
assert.doesNotMatch(migration, /'root'\s*,|'system'\s*,|'controller'\s*,/i);
assert.match(migration, /not an institutional appointment/i);

assert.match(invite, /requireFounder\(\)/);
assert.match(invite, /auth\.admin\.inviteUserByEmail/);
assert.doesNotMatch(invite, /password\s*:/i, 'invitation must never generate or transmit a temporary password');
assert.match(invite, /INSTITUTIONAL_OBSERVER/);
assert.match(invite, /INSTITUTIONAL_OPERATOR/);
for (const invariant of [
  'full_access: false',
  'executor: false',
  'root_execution: false',
  'governance_write: false',
  'sovereign_actions: false',
  'canonical_promotion: false',
  'institutional_appointment: false',
]) assert.ok(invite.includes(invariant), `missing bounded-access invariant: ${invariant}`);

assert.match(rootAccess, /inviteInstitutionalAccountAction/);
assert.match(rootAccess, /Observador — puede consultar/);
assert.match(rootAccess, /Operador — puede trabajar/);
assert.match(rootAccess, /no autoridad soberana/i);
assert.match(forgot, /forgotPasswordAction/);
assert.match(reset, /updateUser\(\{ password \}\)/);
assert.match(reset, /password\.length < 12/);
assert.match(reset, /SFI nunca necesita enviarte una contraseña temporal/);
assert.match(activate, /requireAuthenticatedUser\(\)/);
assert.match(activate, /\.eq\('email', email\)/);
assert.match(activate, /status: 'ACTIVE'/);
assert.match(accessServer, /access\.institutional_account === true/);
assert.match(login, /\/forgot/);
assert.equal(existsSync('src/app/signup/page.tsx'), false, 'public signup surface must remain absent');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-ACCOUNT-INVITATION-LIFECYCLE-1.0',
  invitationOnly: true,
  temporaryPasswordGenerated: false,
  founderAdminRequired: true,
  accountAccessCreatesAppointment: false,
  sovereignAuthorityGrantedByInvite: false,
  publicSignupEnabled: false,
  verifiedPasswordResetAvailable: true,
}, null, 2));
