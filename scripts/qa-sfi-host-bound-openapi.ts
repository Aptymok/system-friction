import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync('src/app/api/external/openapi/route.ts', 'utf8');
const finalMerge = readFileSync('scripts/merge-openapi-authenticated-machine.mjs', 'utf8');
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as Record<string, any>;

assert.match(route, /sourceDocument from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/public\/openapi\.json['"]/, 'actions_schema_must_reuse_canonical_openapi_base');
assert.match(route, /const SFI_ACTIONS_ORIGIN = 'https:\/\/www\.systemfriction\.org'/, 'actions_schema_must_bind_to_canonical_production_origin');
assert.doesNotMatch(route, /request\.nextUrl\.origin/, 'actions_schema_must_not_inherit_apex_or_preview_host');
assert.match(route, /document\.servers = \[\{ url: origin \}\]/, 'actions_schema_must_rewrite_server_origin');
assert.match(route, /authorizationCode\.authorizationUrl = `\$\{origin\}\/api\/oauth\/authorize`/, 'actions_schema_must_rewrite_authorization_url');
assert.match(route, /authorizationCode\.tokenUrl = `\$\{origin\}\/api\/oauth\/token`/, 'actions_schema_must_rewrite_token_url');
assert.match(route, /document\.info\.termsOfService = `\$\{origin\}\/privacy`/, 'actions_schema_must_keep_terms_reachable_on_canonical_origin');
assert.match(route, /document\.externalDocs\.url = `\$\{origin\}\/privacy`/, 'actions_schema_must_keep_external_docs_reachable_on_canonical_origin');
assert.match(route, /schemaBinding = 'CANONICAL_PRODUCTION_ORIGIN'/, 'actions_schema_must_publish_binding_mode');
assert.match(route, /EXTERNAL_ACTION_PREFIX = '\/api\/external\/v1\/'/, 'actions_schema_must_be_external_gateway_only');
assert.match(route, /delete paths\[route\]/, 'non_action_routes_must_be_removed');
assert.match(route, /parameter\?\.in !== 'header'/, 'custom_header_parameters_must_be_removed');
assert.match(route, /oauthSecurityDeclared/, 'oauth_security_declaration_status_must_be_published');
assert.match(route, /separateActionsProjection: false/, 'separate_actions_projection_must_be_disabled');
assert.match(route, /'X-SFI-OpenAPI-Origin': origin/, 'actions_schema_must_expose_origin_receipt');
assert.match(route, /'Cache-Control': 'no-store, max-age=0'/, 'actions_schema_must_not_cache_stale_binding');
assert.doesNotMatch(route, /openapi-actions\.json/, 'host_bound_schema_must_not_reference_removed_projection');

assert.match(finalMerge, /delete api\.paths\['\/api\/mcp\/authenticated'\]/, 'build_must_remove_authenticated_mcp_from_openapi');
assert.match(finalMerge, /gptActionsSchema: '\/openapi\.json'/, 'build_must_publish_canonical_actions_schema');
assert.match(finalMerge, /separateActionsProjection: false/, 'build_must_not_generate_actions_projection');
assert.doesNotMatch(finalMerge, /openapi-actions\.json/, 'build_must_not_reference_removed_actions_projection');

const openapiRedirect = Array.isArray(vercel.redirects)
  ? vercel.redirects.find((entry: any) => entry?.source === '/openapi.json')
  : null;
assert.equal(openapiRedirect?.destination, '/api/external/openapi', 'openapi_json_must_resolve_to_host_bound_canonical_schema_before_filesystem');
assert.equal(openapiRedirect?.permanent, false, 'openapi_redirect_must_be_temporary_307');
assert.ok(!Array.isArray(vercel.rewrites) || !vercel.rewrites.some((entry: any) => entry?.source === '/openapi.json'), 'openapi_json_must_not_use_filesystem_losing_rewrite');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-HOST-BOUND-OPENAPI-1.3',
  canonicalOrigin: 'https://www.systemfriction.org',
  route: '/api/external/openapi',
  publicSchemaUrl: '/openapi.json',
  openapiJsonRedirectedBeforeFilesystem: true,
  redirectStatus: 307,
  binding: 'CANONICAL_PRODUCTION_ORIGIN',
  canonicalDocumentReused: true,
  oauthUrlsRewritten: true,
  oauthSecurityDeclared: true,
  externalGatewayOnly: true,
  authenticatedMcpExcluded: true,
  customHeaderParametersExcluded: true,
  separateActionsProjection: false,
}, null, 2));
