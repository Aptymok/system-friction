import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

function text(path: string) {
  return readFileSync(path, 'utf8');
}

function semverAtLeast(value: string, minimum: [number, number]) {
  const [major = 0, minor = 0] = value.split('.').map(Number);
  return major > minimum[0] || (major === minimum[0] && minor >= minimum[1]);
}

const authorize = text('src/app/api/oauth/authorize/route.ts');
const token = text('src/app/api/oauth/token/route.ts');
const oauthConfig = text('src/lib/sfi/oauthConfig.ts');
const oauthRegistry = text('src/lib/sfi/oauthClientRegistry.ts');
const oauthClients = text('src/app/api/oauth/clients/route.ts');
const oauthRegistryMigration = text('supabase/migrations/20260827220000_sfi_oauth_client_registry.sql');
const externalAuth = text('src/lib/sfi/externalAuth.ts');
const sessionToken = text('src/lib/sfi/externalSessionToken.ts');
const access = text('src/lib/system/access/server.ts');
const members = text('src/lib/system/access/institutionalMembers.ts');
const manifest = text('src/app/api/external/v1/manifest/route.ts');
const cognitive = text('src/app/api/external/v1/cognitive/route.ts');
const personalLab = text('src/app/api/external/v1/personal-lab/route.ts');
const studio = text('src/app/api/external/v1/studio/route.ts');
const institutionalLab = text('src/app/api/external/v1/lab/route.ts');
const execute = text('src/app/api/external/v1/execute/route.ts');
const migration = text('supabase/migrations/20260827113000_personal_cognitive_workspace_ownership.sql');
const openapi = JSON.parse(text('public/openapi.json')) as Record<string, any>;

// OAuth binds to an authenticated account. Institutional authority is resolved
// separately from the account/profile and normal accounts receive an owner-only tenant.
assert.match(authorize, /requireUserProfile\(\)/, 'oauth_must_bind_to_authenticated_account_profile');
assert.match(authorize, /SFI_PERSONAL_SCOPES/, 'oauth_must_use_personal_scope_set');
assert.match(authorize, /context\.member\?\.external\?\.scopes/, 'institutional_scopes_must_come_from_member_registry');
assert.match(authorize, /personalPrincipal = !rootDelegate && !context\.member/, 'normal_account_detection_must_not_infer_institutional_membership');
assert.match(authorize, /principalScopes\.has\(scope\) && clientScopes\.has\(scope\)/, 'normal_accounts_must_receive_principal_client_intersection');
assert.match(authorize, /tenantId = personalPrincipal \? `user:\$\{context\.user\.id\}` : 'sfi'/, 'personal_oauth_tenant_must_be_subject_bound');
assert.match(authorize, /role.*personal_operator/s, 'personal_oauth_role_must_be_non_sovereign');
assert.match(authorize, /codeHash\(code\)/, 'authorization_code_must_be_stored_as_hash');
assert.match(authorize, /code_challenge/, 'oauth_authorize_must_support_pkce');
assert.match(authorize, /resolveSfiOAuthClient\(clientId\)/, 'oauth_authorize_must_resolve_persistent_client');
assert.match(authorize, /isAllowedSfiOAuthRedirect\(client, redirectUri\)/, 'oauth_authorize_must_exact_match_registered_redirect');
assert.match(authorize, /canSfiOAuthClientAuthorizeSubject\(client, context\.user\.id\)/, 'owner_only_client_must_be_bound_to_authenticated_subject');
assert.match(authorize, /clientScopes\.has\(scope\)/, 'oauth_authorize_must_enforce_client_scope_ceiling');
for (const scope of ['observe', 'propose', 'execute', 'cases:read', 'cases:write', 'lab:read', 'lab:write', 'lab:run', 'studio:read', 'studio:content', 'studio:run']) {
  assert.match(oauthConfig, new RegExp(`'${scope.replace(':', '\\:')}'`), `supported_scope_missing:${scope}`);
}

assert.match(token, /grantType !== 'authorization_code'/, 'token_endpoint_must_reject_other_grants');
assert.match(token, /is\('consumed_at', null\)/, 'authorization_code_must_be_single_use');
assert.match(token, /PKCE verification failed/, 'token_exchange_must_verify_pkce_when_present');
assert.match(token, /mintExternalAccessToken/, 'token_exchange_must_issue_signed_sfi_access_token');
assert.match(token, /validateSfiOAuthClientSecret\(client, clientSecret\)/, 'token_exchange_must_validate_registry_client_secret');
assert.match(sessionToken, /createHmac\('sha256'/, 'access_tokens_must_be_signed');
assert.match(sessionToken, /exp <= now/, 'access_tokens_must_expire');

// Client registry eliminates per-client Vercel ENV edits while retaining exact
// callback matching, hashed secrets and user ownership.
assert.match(oauthRegistryMigration, /create table if not exists public\.sfi_oauth_clients/i, 'oauth_client_registry_table_required');
assert.match(oauthRegistryMigration, /client_secret_hash text not null/i, 'oauth_registry_must_store_secret_hash_only');
assert.match(oauthRegistryMigration, /redirect_uris text\[\] not null/i, 'oauth_registry_must_store_redirect_allowlist');
assert.match(oauthRegistryMigration, /audience text not null default 'OWNER_ONLY'/i, 'self_service_clients_must_default_owner_only');
assert.match(oauthRegistryMigration, /TRUSTED_MULTI_USER/i, 'registry_must_distinguish_trusted_multi_user_clients');
assert.match(oauthRegistryMigration, /revoke all[\s\S]*anon, authenticated/i, 'oauth_registry_must_not_be_browser_readable');
assert.match(oauthRegistryMigration, /grant select, insert, update, delete[\s\S]*service_role/i, 'oauth_registry_service_role_grant_required');
assert.match(oauthRegistry, /redirectUris\.includes\(redirectUri\)/, 'redirect_match_must_remain_exact_not_wildcard');
assert.match(oauthRegistry, /hashSfiOAuthClientSecret/, 'oauth_client_secret_must_be_hashed');
assert.match(oauthRegistry, /audience: 'OWNER_ONLY'/, 'new_self_service_clients_must_be_owner_only');
assert.match(oauthRegistry, /audience: 'TRUSTED_MULTI_USER'/, 'legacy_institutional_client_must_be_explicitly_trusted_multi_user');
assert.match(oauthRegistry, /source: 'legacy_env'/, 'legacy_env_client_must_remain_backward_compatible');
assert.match(oauthRegistry, /adoptLegacySfiOAuthClient/, 'root_must_be_able_to_adopt_bootstrap_client_into_registry');
assert.match(oauthClients, /requireUserProfile\(\)/, 'oauth_client_registration_must_require_authenticated_sfi_account');
assert.match(oauthClients, /ROOT_REQUIRED_FOR_LEGACY_ADOPTION/, 'legacy_adoption_must_be_root_only');
assert.match(oauthClients, /secretDisclosure: 'ONE_TIME_ONLY'/, 'new_client_secret_must_be_disclosed_once');
assert.match(oauthClients, /scopeCeiling\(context\)/, 'oauth_client_registration_must_not_expand_principal_authority');

// Account provisioning is not institutional promotion.
assert.match(access, /role: 'operator'/, 'normal_account_profile_must_be_operator');
assert.match(access, /subscription_tier: 'solo'/, 'normal_account_profile_must_be_personal_tier');
assert.match(access, /personalModuleAccess\(\)/, 'normal_account_profile_must_receive_personal_module_contract');
assert.match(access, /requireSfiMember/, 'institutional_membership_gate_must_remain_separate');
assert.match(members, /role: 'institutional_operator'/, 'registered_institutional_operator_contract_must_remain');

// Scope names are not enough: personal tokens are route-bound to owner-scoped APIs.
assert.match(externalAuth, /tenantId\.startsWith\('user:'\)/, 'personal_oauth_must_be_detectable_by_tenant');
assert.match(externalAuth, /pathname === '\/api\/external\/v1\/cognitive'/, 'personal_lab_scope_must_allow_personal_cognitive_only');
assert.match(externalAuth, /pathname === '\/api\/external\/v1\/personal-lab'/, 'personal_lab_scope_must_allow_personal_lab_only');
assert.match(externalAuth, /scope\.startsWith\('studio:'\)/, 'studio_scope_must_have_route_boundary');
assert.match(externalAuth, /verifyExternalAccessToken\(token\)/, 'external_gateway_must_accept_oauth_tokens');
assert.match(externalAuth, /authMethod: 'static_token'/, 'internal_static_token_compatibility_must_remain');

for (const [name, source] of [['cognitive', cognitive], ['personal_lab', personalLab]] as const) {
  assert.match(source, /credential\.authMethod !== 'oauth'/, `${name}_must_reject_shared_credentials`);
  assert.match(source, /!credential\.subjectId/, `${name}_must_require_oauth_subject`);
  assert.match(source, /owner_id == OAuth subjectId/, `${name}_must_publish_owner_boundary`);
}

// Validate scope semantics, not one historical source-code spelling.
assert.match(cognitive, /function operationScope\(operation: string\)[\s\S]*if \(operation === 'run'\) return 'lab:run';[\s\S]*\['propose_pattern', 'confirm_pattern', 'reject_pattern', 'learn_declared_pattern'\]\.includes\(operation\)[\s\S]*return 'lab:write';[\s\S]*return 'lab:read';/, 'personal_cognitive_scope_router_must_preserve_read_write_run_boundaries');
assert.match(cognitive, /const requiredScope = operationScope\(operation\)/, 'personal_cognitive_must_authorize_with_operation_scope');
assert.match(cognitive, /operation === 'learn_declared_pattern'/, 'explicit_owner_learning_must_use_personal_cognitive_route');
assert.match(cognitive, /selfDeclared: true/, 'explicit_owner_learning_must_remain_declared');
assert.match(personalLab, /if \(operation === 'run'\) return 'lab:run'/, 'personal_lab_run_must_require_lab_run');
assert.match(personalLab, /return 'lab:write'/, 'personal_lab_writes_must_require_lab_write');
assert.match(studio, /const ownerId = cred\.subjectId/, 'studio_owner_must_derive_from_oauth_subject');
assert.match(studio, /getStudioObject\(objectId, ownerId\)/, 'studio_object_operations_must_be_owner_scoped');

// Institutional gates remain fail-closed.
assert.match(institutionalLab, /authorizeExternalRequest\(req, operationScope\(operation\)\)/, 'institutional_lab_must_still_authorize_by_scope');
assert.match(institutionalLab, /explicit_runtime_confirmation_required/, 'institutional_lab_run_must_require_confirmation');
assert.match(execute, /authorizeExternalRequest\(req, 'execute'\)/, 'institutional_execute_must_keep_execute_scope');
assert.match(execute, /body\.confirm !== true/, 'institutional_execute_must_require_confirmation');
assert.match(execute, /canonicalPromotionAllowed: false/, 'generic_execute_must_not_promote_canon');

// Persistence ownership contract.
assert.match(migration, /sfi_cognitive_twin_runs[\s\S]*owner_id/i, 'personal_cognitive_runs_must_gain_owner_id');
assert.match(migration, /sfi_lab_analyses[\s\S]*owner_id/i, 'personal_lab_runs_must_gain_owner_id');
assert.match(migration, /auth\.uid\(\)/i, 'personal_workspace_rls_must_bind_to_auth_uid');

// GPT discovery contract. The checked-in OpenAPI is a merge base: build regenerates
// the final version from the canonical manifest before the production artifact exists.
const manifestVersion = manifest.match(/version:\s*'([^']+)'/)?.[1] ?? '';
const openapiBaseVersion = String(openapi.info?.version ?? '0.0.0');
assert.ok(semverAtLeast(manifestVersion, [1, 8]), 'canonical_manifest_must_include_personal_oauth_workspace');
assert.ok(semverAtLeast(openapiBaseVersion, [1, 8]), 'checked_in_openapi_base_must_include_personal_oauth_workspace');
assert.equal(openapi.components?.securitySchemes?.sfiOAuth?.type, 'oauth2', 'openapi_must_publish_oauth2');
assert.equal(openapi.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.authorizationUrl, 'https://systemfriction.org/api/oauth/authorize');
assert.equal(openapi.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.tokenUrl, 'https://systemfriction.org/api/oauth/token');
assert.ok(openapi.paths?.['/api/external/v1/cognitive']?.post, 'openapi_must_publish_personal_cognitive');
assert.ok(openapi.paths?.['/api/external/v1/personal-lab']?.post, 'openapi_must_publish_personal_lab');
assert.ok(openapi.paths?.['/api/external/v1/studio']?.post, 'openapi_must_publish_owned_studio');
assert.match(String(openapi['x-sfi-governance']?.personalWorkspaceBoundary || ''), /cannot access institutional proposal/i, 'openapi_must_publish_personal_institutional_boundary');
assert.match(manifest, /event-triggered bounded cognitive automations/, 'manifest_must_describe_automation_model');
assert.match(manifest, /deprecatedParallelRuntimeRemoved: true/, 'manifest_must_record_runtime_convergence');

// The superseded parallel executor chain must stay deleted.
for (const path of [
  'src/lib/sfi/cognitive-runtime/agentLoader.ts',
  'src/lib/sfi/cognitive-runtime/runtimeDispatcher.ts',
  'src/lib/sfi/cognitive-runtime/executeAgent.ts',
  'src/lib/sfi/cognitive-runtime/kernelCycle.ts',
  'src/lib/sfi/cognitive-runtime/startKernel.ts',
  'src/lib/sfi/cognitive-runtime/publishGraph.tmp.ts',
  'src/lib/sfi/cognitive-runtime/graphExecutor.ts',
]) {
  assert.equal(existsSync(path), false, `deprecated_runtime_file_must_remain_deleted:${path}`);
}
for (const path of [
  'src/lib/sfi/cognitive-runtime/runtimeAgentExecutor.ts',
  'src/lib/sfi/cognitive-runtime/agentExecutionMap.ts',
  'src/lib/sfi/cognitive-runtime/cognitiveCycle.ts',
  'src/lib/sfi/cognitive-runtime/automationSelector.ts',
]) {
  assert.equal(existsSync(path), true, `canonical_runtime_file_missing:${path}`);
}

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-EXTERNAL-OAUTH-1.11',
  flow: 'authorization_code',
  pkce: 'S256',
  clientRegistry: 'PERSISTENT_SELF_SERVICE',
  redirectMatching: 'EXACT',
  selfServiceAudience: 'OWNER_ONLY',
  trustedMultiUser: 'INSTITUTIONAL_ONLY',
  legacyClient: 'BACKWARD_COMPATIBLE_ADOPTABLE',
  personalTenant: 'user:<oauth_subject_id>',
  personalScopes: ['cases:read', 'cases:write', 'lab:read', 'lab:write', 'lab:run', 'studio:read', 'studio:content', 'studio:run'],
  personalRoutes: ['/api/external/v1/cases', '/api/external/v1/cognitive', '/api/external/v1/personal-lab', '/api/external/v1/studio'],
  explicitOwnerLearning: 'learn_declared_pattern',
  institutionalSovereignty: ['proposal_authorization', 'root_evidence', 'canonical_promotion'],
  runtime: 'runtimeAgentExecutor -> agentExecutionMap',
}, null, 2));
