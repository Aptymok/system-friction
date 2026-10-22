import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');
const admin=read('src/lib/auth/institutionalAccountAdministration.ts');
const alternative=read('src/components/sfi/AlternativeSignIn.tsx');
const callback=read('src/components/sfi/AuthCallbackSurface.tsx');
const passkey=read('src/components/sfi/PasskeyEnrollment.tsx');
const gate=read('src/app/api/account/invitation-session/route.ts');
const accountPage=read('src/app/root/access/page.tsx');
const client=read('src/runtime/supabase/client.ts');
const login=read('src/components/sfi/LoginSurface.tsx');

for(const file of [
  'src/app/auth/callback/page.tsx',
  'src/app/account/security/page.tsx',
])assert(existsSync(file),`Missing SFI ACCESS page: ${file}`);
for(const action of [
  'changeInstitutionalAccountPermissionsAction',
  'suspendInstitutionalAccountAction',
  'deleteInstitutionalAccountAction',
]){
  assert(admin.includes(`function ${action}`));
  assert(accountPage.includes(action));
}
assert(admin.includes('requireFounder()'));
assert(admin.includes('canonicalFounderUserId('));
assert(admin.includes('service.auth.admin.getUserById(grant.user_id)'));
assert(admin.includes('service.auth.admin.deleteUser(grant.user_id,true)'));
assert(admin.includes('parsed.data.confirmation.trim().toLowerCase()!==grant.email'));
assert(admin.includes('institutionalEvidenceRetained:true'));
assert(admin.includes('root:false'));
assert(admin.includes('full_access:false'));
for(const provider of ['google','apple','facebook'])assert(alternative.includes(`social('${provider}')`));
assert(alternative.includes('shouldCreateUser:false'));
assert(alternative.includes('signInWithPasskey()'));
assert(passkey.includes('registerPasskey()'));
assert(passkey.includes('auth.passkey.delete'));
assert(client.includes('experimental: { passkey: true }'));
assert(callback.includes('/api/account/invitation-session'));
assert(callback.includes('/api/account/activate'));
assert(callback.includes("eligibility.status==='INVITED'"));
assert(callback.includes("eligibility.status==='ACTIVE'"));
assert(gate.includes('status: eligible ? grant.data?.status : null'));
assert(login.includes('<AlternativeSignIn />'));
assert(!alternative.includes('service_role'));
assert(!callback.includes('service_role'));
console.log('SFI ACCESS upgrade static contract: OK. Requires build and customer-safe E2E tests.');
