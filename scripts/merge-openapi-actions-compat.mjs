import fs from 'node:fs';
import path from 'node:path';

const canonicalPath = path.join(process.cwd(), 'public', 'openapi.json');
const actionsPath = path.join(process.cwd(), 'public', 'openapi-actions.json');
const canonical = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
const api = structuredClone(canonical);
const canonicalOrigin = 'https://systemfriction.org';

// GPT Actions must always use the institutional canonical origin even if an older
// deployment/preview URL survives in a checked-in or intermediate projection.
api.servers = [{ url: canonicalOrigin }];
if (api.info) api.info.termsOfService = `${canonicalOrigin}/privacy`;
if (api.externalDocs) api.externalDocs.url = `${canonicalOrigin}/privacy`;
const oauthFlow = api.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode;
if (oauthFlow) {
  oauthFlow.authorizationUrl = `${canonicalOrigin}/api/oauth/authorize`;
  oauthFlow.tokenUrl = `${canonicalOrigin}/api/oauth/token`;
}
if (api['x-sfi-governance']) api['x-sfi-governance'].privacyPolicy = `${canonicalOrigin}/privacy`;

const conciseDescriptions = new Map([
  ['POST /api/external/v1/result', 'Persist a structured SFI analysis result without persisting raw binary content. Requires lab:write and preserves provenance/epistemic boundaries.'],
  ['POST /api/external/v1/signal', 'Run or continue a governed SFI signal cycle. Supports intake, run, return and close while preserving proposal, execution, observation and RETURN as distinct states.'],
  ['POST /api/external/v1/cognitive', 'Read or run the OAuth subject owner-scoped Cognitive workspace. Personal execution cannot enter institutional ROOT, proposal, canonical-promotion or shared execution authority.'],
  ['POST /api/external/v1/cases', 'Read or mutate Case Platform state available to the OAuth subject. Case writes do not mint accepted evidence, institutional authority, observed RETURN or canonical promotion.'],
  ['GET /api/external/v1/bootstrap', 'Return the versioned SFI cognitive bootstrap for an authorized external client, including bounded contracts, policies and current cognitive/runtime metadata.'],
  ['POST /api/mcp/authenticated', 'Authenticated MCP/JSON-RPC adapter for governed SFI machine clients. Discovery is read-only; executable tools/call remains subject to OAuth, active capability grant, authority ceiling and possession proof.'],
]);

for (const [route, pathItem] of Object.entries(api.paths || {})) {
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const operation = pathItem?.[method];
    if (!operation) continue;
    const key = `${method.toUpperCase()} ${route}`;
    if (conciseDescriptions.has(key)) operation.description = conciseDescriptions.get(key);
    if (typeof operation.description === 'string' && operation.description.length > 300) {
      const clipped = operation.description.slice(0, 297).replace(/\s+\S*$/, '').trimEnd();
      operation.description = `${clipped}...`;
    }
  }
}

const mcp = api.paths?.['/api/mcp/authenticated']?.post;
if (mcp) {
  mcp.parameters = (mcp.parameters || []).filter((parameter) => parameter?.in !== 'header');
  mcp['x-sfi-actions-boundary'] = {
    projection: '/openapi-actions.json',
    canonicalOpenApi: '/openapi.json',
    customHeaderParametersExposed: false,
    capabilityGrantNonceStillRequiredByMcpRuntimeForExecutableToolsCall: true,
    actionProjectionDoesNotWeakenMcpAuthorization: true,
  };
  const response = mcp.responses?.['200']?.content?.['application/json'];
  if (response) response.schema = {
    type: 'object',
    properties: {
      jsonrpc: { type: 'string' },
      id: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'null' }] },
      result: { type: 'object', properties: { content: { type: 'array', items: { type: 'object', properties: {}, additionalProperties: true } }, structuredContent: { type: 'object', properties: {}, additionalProperties: true }, resources: { type: 'array', items: { type: 'object', properties: {}, additionalProperties: true } } }, additionalProperties: true },
      error: { type: 'object', properties: { code: { type: 'number' }, message: { type: 'string' }, data: { type: 'object', properties: {}, additionalProperties: true } }, additionalProperties: true },
    },
    additionalProperties: false,
  };
}

const violations = [];
for (const [route, pathItem] of Object.entries(api.paths || {})) {
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const operation = pathItem?.[method];
    if (!operation) continue;
    if (typeof operation.description === 'string' && operation.description.length > 300) violations.push(`${method.toUpperCase()} ${route}:description>${operation.description.length}`);
    for (const parameter of operation.parameters || []) if (parameter?.in === 'header') violations.push(`${method.toUpperCase()} ${route}:header:${parameter.name || 'unnamed'}`);
  }
}
if (violations.length) throw new Error(`SFI_ACTIONS_OPENAPI_COMPAT_FAILED:${violations.join(',')}`);

const canonicalMcp = canonical.paths?.['/api/mcp/authenticated']?.post;
if (!canonicalMcp?.parameters?.some((parameter) => parameter?.in === 'header' && parameter?.name === 'X-SFI-Capability-Grant-Nonce')) {
  throw new Error('SFI_CANONICAL_OPENAPI_MCP_NONCE_PARAMETER_MISSING');
}

api['x-sfi-actions-compatibility'] = {
  contract: 'SFI-GPT-ACTIONS-OPENAPI-COMPAT-1.0',
  canonicalSource: '/openapi.json',
  projection: '/openapi-actions.json',
  canonicalOrigin,
  maxOperationDescriptionChars: 300,
  customHeaderParametersExcluded: true,
  authenticatedMcpRuntimeAuthorizationUnchanged: true,
};

fs.writeFileSync(actionsPath, `${JSON.stringify(api, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, contract: 'SFI-GPT-ACTIONS-OPENAPI-COMPAT-1.0', canonical: 'public/openapi.json', projection: 'public/openapi-actions.json', canonicalOrigin }, null, 2));
