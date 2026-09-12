import fs from 'node:fs';
import path from 'node:path';

const canonicalPath = path.join(process.cwd(), 'public', 'openapi.json');
const actionsPath = path.join(process.cwd(), 'public', 'openapi-actions.json');
const canonical = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
const api = structuredClone(canonical);
const canonicalOrigin = 'https://www.systemfriction.org';
const apiOrigin = canonicalOrigin;

// GPT Actions authentication is configured in the GPT editor, separately from
// the OpenAPI schema. Keep the Actions projection transport-neutral: the editor
// owns OAuth token acquisition/injection, while this schema only describes the
// compatible external endpoints ChatGPT may call.
api.servers = [{ url: apiOrigin }];
if (api.info) api.info.termsOfService = `${apiOrigin}/privacy`;
if (api.externalDocs) api.externalDocs.url = `${apiOrigin}/privacy`;
api['x-sfi-governance'] ||= {};
api['x-sfi-governance'].privacyPolicy = `${apiOrigin}/privacy`;
api['x-sfi-governance'].schemaBinding = 'GPT_ACTIONS_CANONICAL_PRODUCTION_ORIGIN';

// The GPT Action editor owns OAuth. Do not duplicate that contract inside the
// Actions OpenAPI because ChatGPT applies the configured user credential to the
// action independently of OpenAPI security declarations.
delete api.security;
if (api.components?.securitySchemes) {
  delete api.components.securitySchemes.sfiOAuth;
  if (Object.keys(api.components.securitySchemes).length === 0) delete api.components.securitySchemes;
}

// GPT Actions should expose only the governed External Agent Gateway. MCP keeps
// its stronger machine-client nonce boundary in canonical OpenAPI/runtime and is
// intentionally absent from this projection rather than advertised partially.
for (const route of Object.keys(api.paths || {})) {
  if (!route.startsWith('/api/external/v1/')) delete api.paths[route];
}

const conciseDescriptions = new Map([
  ['POST /api/external/v1/result', 'Persist a structured SFI analysis result without persisting raw binary content. Requires lab:write and preserves provenance/epistemic boundaries.'],
  ['POST /api/external/v1/signal', 'Run or continue a governed SFI signal cycle. Supports intake, run, return and close while preserving proposal, execution, observation and RETURN as distinct states.'],
  ['POST /api/external/v1/cognitive', 'Read or run the OAuth subject owner-scoped Cognitive workspace. Personal execution cannot enter institutional ROOT, proposal, canonical-promotion or shared execution authority.'],
  ['POST /api/external/v1/cases', 'Read or mutate Case Platform state available to the OAuth subject. Case writes do not mint accepted evidence, institutional authority, observed RETURN or canonical promotion.'],
  ['GET /api/external/v1/bootstrap', 'Return the versioned SFI cognitive bootstrap for an authorized external client, including bounded contracts, policies and current cognitive/runtime metadata.'],
]);

for (const [route, pathItem] of Object.entries(api.paths || {})) {
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const operation = pathItem?.[method];
    if (!operation) continue;
    delete operation.security;
    const key = `${method.toUpperCase()} ${route}`;
    if (conciseDescriptions.has(key)) operation.description = conciseDescriptions.get(key);
    if (typeof operation.description === 'string' && operation.description.length > 300) {
      const clipped = operation.description.slice(0, 297).replace(/\s+\S*$/, '').trimEnd();
      operation.description = `${clipped}...`;
    }
  }
}

const violations = [];
if (api.security) violations.push('top_level_security_present');
if (api.components?.securitySchemes?.sfiOAuth) violations.push('oauth_security_scheme_present');
if (api.paths?.['/api/mcp/authenticated']) violations.push('mcp_present');
for (const [route, pathItem] of Object.entries(api.paths || {})) {
  if (!route.startsWith('/api/external/v1/')) violations.push(`non_external_path:${route}`);
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const operation = pathItem?.[method];
    if (!operation) continue;
    if (operation.security) violations.push(`${method.toUpperCase()} ${route}:security_present`);
    if (typeof operation.description === 'string' && operation.description.length > 300) violations.push(`${method.toUpperCase()} ${route}:description>${operation.description.length}`);
    for (const parameter of operation.parameters || []) if (parameter?.in === 'header') violations.push(`${method.toUpperCase()} ${route}:header:${parameter.name || 'unnamed'}`);
  }
}
if (violations.length) throw new Error(`SFI_ACTIONS_OPENAPI_COMPAT_FAILED:${violations.join(',')}`);

// Prove that simplifying the GPT projection does not weaken canonical machine
// authorization. Canonical OpenAPI must keep OAuth and the MCP possession nonce.
const canonicalOauth = canonical.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode;
if (!canonicalOauth) throw new Error('SFI_CANONICAL_OPENAPI_OAUTH_SCHEME_MISSING');
const canonicalMcp = canonical.paths?.['/api/mcp/authenticated']?.post;
if (!canonicalMcp?.parameters?.some((parameter) => parameter?.in === 'header' && parameter?.name === 'X-SFI-Capability-Grant-Nonce')) {
  throw new Error('SFI_CANONICAL_OPENAPI_MCP_NONCE_PARAMETER_MISSING');
}

api['x-sfi-actions-compatibility'] = {
  contract: 'SFI-GPT-ACTIONS-OPENAPI-COMPAT-1.2',
  canonicalSource: '/openapi.json',
  projection: '/openapi-actions.json',
  canonicalOrigin,
  apiOrigin,
  authTransportOwner: 'GPT_ACTION_EDITOR_OAUTH',
  openApiOAuthDeclarationsExcluded: true,
  mcpExcluded: true,
  externalGatewayOnly: true,
  maxOperationDescriptionChars: 300,
  customHeaderParametersExcluded: true,
  canonicalMachineAuthorizationUnchanged: true,
};

fs.writeFileSync(actionsPath, `${JSON.stringify(api, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-GPT-ACTIONS-OPENAPI-COMPAT-1.2',
  canonical: 'public/openapi.json',
  projection: 'public/openapi-actions.json',
  canonicalOrigin,
  apiOrigin,
  authTransportOwner: 'GPT_ACTION_EDITOR_OAUTH',
  mcpExcluded: true,
}, null, 2));
