import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync('src/app/api/external/openapi/route.ts', 'utf8');

assert.match(route, /sourceDocument from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/public\/openapi\.json['"]/, 'host_bound_schema_must_reuse_canonical_openapi');
assert.match(route, /request\.nextUrl\.origin/, 'host_bound_schema_must_bind_to_request_origin');
assert.match(route, /document\.servers = \[\{ url: origin \}\]/, 'host_bound_schema_must_rewrite_server_origin');
assert.match(route, /authorizationCode\.authorizationUrl = `\$\{origin\}\/api\/oauth\/authorize`/, 'host_bound_schema_must_rewrite_authorization_url');
assert.match(route, /authorizationCode\.tokenUrl = `\$\{origin\}\/api\/oauth\/token`/, 'host_bound_schema_must_rewrite_token_url');
assert.match(route, /document\.info\.termsOfService = `\$\{origin\}\/privacy`/, 'host_bound_schema_must_keep_terms_reachable_on_same_origin');
assert.match(route, /document\.externalDocs\.url = `\$\{origin\}\/privacy`/, 'host_bound_schema_must_keep_external_docs_reachable_on_same_origin');
assert.match(route, /schemaBinding = 'REQUEST_ORIGIN'/, 'host_bound_schema_must_publish_binding_mode');
assert.match(route, /'Cache-Control': 'no-store, max-age=0'/, 'host_bound_schema_must_not_cache_stale_host_binding');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-HOST-BOUND-OPENAPI-1.0',
  route: '/api/external/openapi',
  binding: 'REQUEST_ORIGIN',
  canonicalDocumentReused: true,
  oauthUrlsRewritten: true,
}, null, 2));
