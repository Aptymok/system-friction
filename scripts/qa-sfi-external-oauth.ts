import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function text(path: string) {
  return readFileSync(path, 'utf8');
}

const authorize = text('src/app/api/oauth/authorize/route.ts');
const token = text('src/app/api/oauth/token/route.ts');
const externalAuth = text('src/lib/sfi/externalAuth.ts');
const sessionToken = text('src/lib/sfi/externalSessionToken.ts');
const login = text('src/components/sfi/LoginSurface.tsx');
const migration = text('supabase/migrations/20260822214500_create_sfi_oauth_authorization_codes.sql');
const openapi = JSON.parse(text('public/openapi.json')) as Record<string, any>;
const members = text('src/lib/system/access/institutionalMembers.ts');

assert.match(authorize, /requireSfiMember\(\)/, 'oauth_authorize_must_bind_to_authenticated_sfi_member');
assert.match(authorize, /DEFAULT_SCOPES = \['observe', 'propose', 'lab:read'\]/, 'default_non_root_oauth_scopes_must_be_bounded');
assert.match(authorize, /moduleAccess\.evidence_write === true/, 'evidence_write_capability_must_be_explicit');
assert.match(authorize, /allowedScopes\.add\('lab:write'\)/, 'evidence_writer_may_receive_lab_write');
assert.match(authorize, /rootDelegate \? 'root_delegate' : evidenceWriter \? 'evidence_writer' : 'agent'/, 'root_delegate_must_not_be_default');
assert.match(authorize, /codeHash\(code\)/, 'authorization_code_must_be_stored_as_hash');
assert.match(authorize, /code_challenge/, 'oauth_authorize_must_support_pkce');

assert.match(token, /grantType !== 'authorization_code'/, 'token_endpoint_must_reject_other_grants');
assert.match(token, /is\('consumed_at', null\)/, 'authorization_code_must_be_single_use');
assert.match(token, /PKCE verification failed/, 'token_exchange_must_verify_pkce_when_present');
assert.match(token, /mintExternalAccessToken/, 'token_exchange_must_issue_sfi_access_token');

assert.match(externalAuth, /verifyExternalAccessToken\(token\)/, 'external_gateway_must_accept_user_bound_oauth_tokens');
assert.match(externalAuth, /authMethod: 'oauth'/, 'oauth_principal_must_be_auditable');
assert.match(externalAuth, /authMethod: 'static_token'/, 'static_token_backward_compatibility_must_remain');

assert.match(sessionToken, /createHmac\('sha256'/, 'access_tokens_must_be_signed');
assert.match(sessionToken, /exp <= now/, 'access_tokens_must_expire');
assert.match(sessionToken, /aud: 'sfi-external-v1'/, 'access_token_audience_must_be_bound');

assert.match(login, /safeNextPath/, 'login_must_preserve_oauth_return_path');
assert.match(login, /!candidate\.startsWith\('\/\/'\)/, 'login_return_path_must_reject_protocol_relative_redirects');

assert.match(migration, /enable row level security/i, 'oauth_code_table_must_enable_rls');
assert.match(migration, /code_hash text not null unique/i, 'oauth_codes_must_not_be_stored_in_plaintext');
assert.match(migration, /consumed_at timestamptz/i, 'oauth_codes_must_track_consumption');

assert.equal(openapi.components?.securitySchemes?.sfiOAuth?.type, 'oauth2', 'openapi_must_publish_oauth2');
assert.equal(
  openapi.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.authorizationUrl,
  'https://systemfriction.org/api/oauth/authorize',
  'openapi_authorization_url_must_be_canonical',
);
assert.equal(
  openapi.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.tokenUrl,
  'https://systemfriction.org/api/oauth/token',
  'openapi_token_url_must_be_canonical',
);

assert.match(members, /email: 'edwin\.tzolkin@gmail\.com'/, 'edwin_must_resolve_through_existing_institutional_identity');
assert.match(members, /displayName: 'Edwin'[\s\S]*?role: 'observer'/, 'edwin_must_not_inherit_root_delegate_from_oauth');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-EXTERNAL-OAUTH-1.1',
  flow: 'authorization_code',
  pkce: 'S256',
  defaultNonRootScopes: ['observe', 'propose', 'lab:read'],
  evidenceWriterAdditionalScopes: ['lab:write'],
  rootOnlyScopes: ['execute', 'lab:run'],
  staticTokenCompatibility: true,
}, null, 2));
