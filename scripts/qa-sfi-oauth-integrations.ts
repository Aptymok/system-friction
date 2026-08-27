import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('src/app/integrations/page.tsx', 'utf8');
const surface = readFileSync('src/components/sfi/OAuthIntegrationsSurface.tsx', 'utf8');
const session = readFileSync('src/components/sfi/SessionControls.tsx', 'utf8');
const clientsRoute = readFileSync('src/app/api/oauth/clients/route.ts', 'utf8');
const authorize = readFileSync('src/app/api/oauth/authorize/route.ts', 'utf8');
const registry = readFileSync('src/lib/sfi/oauthClientRegistry.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260827235000_sfi_oauth_pending_redirect.sql', 'utf8');

assert.match(page, /requireUserProfile\(\)/, 'integrations_page_must_require_authenticated_sfi_account');
assert.match(page, /login\?next=%2Fintegrations/, 'integrations_page_must_return_to_integrations_after_login');

assert.match(surface, /\/api\/oauth\/clients/, 'surface_must_use_persistent_oauth_client_registry_api');
assert.match(surface, /method: 'POST'/, 'surface_must_register_clients');
assert.match(surface, /method: 'PATCH'/, 'surface_must_update_callbacks_or_rotate_secrets');
assert.match(surface, /method: 'DELETE'/, 'surface_must_revoke_clients');
assert.match(surface, /\/api\/oauth\/authorize/, 'surface_must_emit_authorization_url');
assert.match(surface, /\/api\/oauth\/token/, 'surface_must_emit_token_url');
assert.match(surface, /\/api\/external\/openapi/, 'surface_must_emit_host_bound_schema_url');
assert.match(surface, /ONE TIME ONLY/, 'surface_must_warn_that_client_secret_is_one_time_only');
assert.match(surface, /No pegues callback/, 'normal_onboarding_must_not_require_callback_round_trip');
assert.match(surface, /PENDING · AUTO-BIND EN PRIMERA AUTORIZACIÓN/, 'surface_must_explain_pending_first_redirect_state');
assert.doesNotMatch(surface, /SFI_OAUTH_REDIRECT_URIS/, 'surface_must_not_instruct_users_to_edit_vercel_callback_env');
assert.doesNotMatch(surface, /createServiceSupabaseClient|\.from\(['"]sfi_oauth_clients['"]\)|execute_sql/i, 'browser_surface_must_not_access_database_directly');

assert.match(clientsRoute, /scopeCeiling\(context\)/, 'client_registration_must_enforce_principal_scope_ceiling');
assert.match(clientsRoute, /createOwnedSfiOAuthClient/, 'client_registration_must_use_server_side_registry_writer');
assert.match(registry, /allowEmpty: true/, 'owner_client_creation_must_allow_pending_redirect');
assert.match(registry, /bindInitialOwnedSfiOAuthRedirect/, 'registry_must_expose_first_redirect_binding');
assert.match(registry, /redirectUris\.length !== 0/, 'first_redirect_binding_must_only_run_once');
assert.match(registry, /normalizeSfiOAuthRedirectUri\(input\.redirectUri\)/, 'first_redirect_binding_must_validate_exact_https_redirect');

assert.match(authorize, /mayBindFirstOwnerRedirect/, 'authorize_must_detect_pending_owner_redirect');
assert.match(authorize, /client\.audience === 'OWNER_ONLY'/, 'auto_bind_must_be_owner_only');
assert.match(authorize, /client\.redirectUris\.length === 0/, 'auto_bind_must_require_empty_redirect_allowlist');
assert.match(authorize, /canSfiOAuthClientAuthorizeSubject\(client, context\.user\.id\)/, 'auto_bind_must_authenticate_same_owner_before_binding');
assert.match(authorize, /bindInitialOwnedSfiOAuthRedirect/, 'authorize_must_persist_first_exact_redirect');
assert.doesNotMatch(authorize, /chatgpt\.com\/\*/, 'authorize_must_not_use_wildcard_openai_callbacks');

assert.match(migration, /audience = 'OWNER_ONLY'[\s\S]*cardinality\(redirect_uris\) between 0 and 10/, 'owner_only_registry_must_allow_pending_redirect');
assert.match(migration, /audience = 'TRUSTED_MULTI_USER'[\s\S]*cardinality\(redirect_uris\) between 1 and 10/, 'trusted_multi_user_clients_must_keep_explicit_redirect_requirement');
assert.match(session, /href="\/integrations"/, 'authenticated_session_controls_must_expose_integrations_surface');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-OAUTH-INTEGRATIONS-1.1',
  userFlow: 'generate_client -> copy_gpt_config -> first_authorize_auto_binds_exact_redirect -> token -> use',
  callbackPasteRequiredForNormalOnboarding: false,
  vercelEditRequired: false,
  databaseEditRequired: false,
  callbackExactMatch: true,
  autoBindBoundary: 'OWNER_ONLY + authenticated owner + empty redirect allowlist only',
}, null, 2));
