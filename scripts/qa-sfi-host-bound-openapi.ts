import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync('src/app/api/external/openapi/route.ts', 'utf8');
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
assert.match(route, /'X-SFI-OpenAPI-Origin': origin/, 'actions_schema_must_expose_origin_receipt');
assert.match(route, /'Cache-Control': 'no-store, max-age=0'/, 'actions_schema_must_not_cache_stale_binding');

const openapiRewrite = Array.isArray(vercel.rewrites)
  ? vercel.rewrites.find((entry: any) => entry?.source === '/openapi.json')
  : null;
assert.equal(openapiRewrite?.destination, '/api/external/openapi', 'legacy_openapi_url_must_route_through_actions_schema');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-HOST-BOUND-OPENAPI-1.1',
  canonicalOrigin: 'https://www.systemfriction.org',
  route: '/api/external/openapi',
  legacyRoute: '/openapi.json',
  legacyRouteRewritten: true,
  binding: 'CANONICAL_PRODUCTION_ORIGIN',
  canonicalDocumentReused: true,
  oauthUrlsRewritten: true,
}, null, 2));
