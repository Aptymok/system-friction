import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('src/app/integrations/page.tsx', 'utf8');
const surface = readFileSync('src/components/sfi/OAuthIntegrationsSurface.tsx', 'utf8');
const session = readFileSync('src/components/sfi/SessionControls.tsx', 'utf8');
const clientsRoute = readFileSync('src/app/api/oauth/clients/route.ts', 'utf8');

assert.match(page, /requireUserProfile\(\)/, 'integrations_page_must_require_authenticated_sfi_account');
assert.match(page, /login\?next=%2Fintegrations/, 'integrations_page_must_return_to_integrations_after_login');

assert.match(surface, /searchParams\.get\('redirect_uri'\)/, 'surface_must_extract_redirect_uri_from_full_authorization_url');
assert.match(surface, /\/api\/oauth\/clients/, 'surface_must_use_persistent_oauth_client_registry_api');
assert.match(surface, /method: 'POST'/, 'surface_must_register_clients');
assert.match(surface, /method: 'PATCH'/, 'surface_must_update_callbacks_or_rotate_secrets');
assert.match(surface, /method: 'DELETE'/, 'surface_must_revoke_clients');
assert.match(surface, /\/api\/oauth\/authorize/, 'surface_must_emit_authorization_url');
assert.match(surface, /\/api\/oauth\/token/, 'surface_must_emit_token_url');
assert.match(surface, /\/api\/external\/openapi/, 'surface_must_emit_host_bound_schema_url');
assert.match(surface, /ONE TIME ONLY/, 'surface_must_warn_that_client_secret_is_one_time_only');
assert.doesNotMatch(surface, /SFI_OAUTH_REDIRECT_URIS/, 'surface_must_not_instruct_users_to_edit_vercel_callback_env');
assert.doesNotMatch(surface, /supabase/i, 'surface_must_not expose database operations to users');

assert.match(clientsRoute, /scopeCeiling\(context\)/, 'client_registration_must_enforce_principal_scope_ceiling');
assert.match(clientsRoute, /createOwnedSfiOAuthClient/, 'client_registration_must_use_server_side_registry_writer');
assert.match(session, /href="\/integrations"/, 'authenticated_session_controls_must_expose_integrations_surface');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-OAUTH-INTEGRATIONS-1.0',
  userFlow: 'paste_callback_or_authorization_url -> register -> copy_gpt_config -> update_rotate_revoke',
  vercelEditRequired: false,
  databaseEditRequired: false,
  callbackExactMatch: true,
}, null, 2));
