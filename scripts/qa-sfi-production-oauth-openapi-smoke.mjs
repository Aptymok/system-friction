import assert from 'node:assert/strict';

const TARGET = (process.env.SFI_PRODUCTION_SMOKE_TARGET || 'https://www.systemfriction.org').replace(/\/$/, '');
const EXPECTED_AUTH = `${TARGET}/api/oauth/authorize`;
const EXPECTED_TOKEN = `${TARGET}/api/oauth/token`;
const ENDPOINTS = ['/api/external/openapi', '/openapi.json', '/openapi-actions.json'];
const TIMEOUT_MS = 12000;

async function read(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${TARGET}${path}`, {
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'SFI-production-oauth-openapi-assurance/1.2',
      },
    });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return {
      path,
      status: response.status,
      finalUrl: response.url,
      originReceipt: response.headers.get('x-sfi-openapi-origin'),
      json,
      bodyPrefix: text.slice(0, 240),
    };
  } finally {
    clearTimeout(timer);
  }
}

function headerParameters(document) {
  const found = [];
  for (const [route, pathItem] of Object.entries(document?.paths || {})) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      const operation = pathItem?.[method];
      if (!operation) continue;
      for (const parameter of operation.parameters || []) {
        if (parameter?.in === 'header') found.push(`${method.toUpperCase()} ${route}:${parameter.name || 'unnamed'}`);
      }
    }
  }
  return found;
}

function operationSecurity(document) {
  const found = [];
  for (const [route, pathItem] of Object.entries(document?.paths || {})) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      const operation = pathItem?.[method];
      if (!operation) continue;
      if (operation.security !== undefined) found.push(`${method.toUpperCase()} ${route}`);
    }
  }
  return found;
}

const observations = [];
for (const path of ENDPOINTS) observations.push(await read(path));

for (const observation of observations) {
  assert.equal(observation.status, 200, `${observation.path}:status_must_be_200`);
  assert.ok(observation.finalUrl.startsWith(TARGET), `${observation.path}:must_finish_on_canonical_origin`);
  assert.ok(observation.json && typeof observation.json === 'object', `${observation.path}:must_return_json`);
  assert.equal(observation.json.servers?.[0]?.url, TARGET, `${observation.path}:server_origin_mismatch`);
}

for (const observation of observations.slice(0, 2)) {
  const flow = observation.json.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode;
  assert.equal(flow?.authorizationUrl, EXPECTED_AUTH, `${observation.path}:authorization_origin_mismatch`);
  assert.equal(flow?.tokenUrl, EXPECTED_TOKEN, `${observation.path}:token_origin_mismatch`);
  assert.equal(observation.json['x-sfi-governance']?.schemaBinding, 'CANONICAL_PRODUCTION_ORIGIN', `${observation.path}:schema_binding_missing`);
  assert.equal(observation.originReceipt, TARGET, `${observation.path}:origin_receipt_mismatch`);
}

const actions = observations.find((item) => item.path === '/openapi-actions.json');
assert.ok(actions, 'actions_projection_required');
assert.equal(actions.json['x-sfi-governance']?.schemaBinding, 'GPT_ACTIONS_CANONICAL_PRODUCTION_ORIGIN', 'actions_schema_binding_missing');
assert.equal(actions.json['x-sfi-actions-compatibility']?.customHeaderParametersExcluded, true, 'actions_custom_header_boundary_missing');
assert.equal(actions.json['x-sfi-actions-compatibility']?.canonicalOrigin, TARGET, 'actions_canonical_origin_mismatch');
assert.equal(actions.json['x-sfi-actions-compatibility']?.authTransportOwner, 'GPT_ACTION_EDITOR_OAUTH', 'actions_auth_transport_owner_mismatch');
assert.equal(actions.json['x-sfi-actions-compatibility']?.openApiOAuthDeclarationsExcluded, true, 'actions_openapi_oauth_boundary_missing');
assert.equal(actions.json['x-sfi-actions-compatibility']?.mcpExcluded, true, 'actions_mcp_boundary_missing');
assert.equal(actions.json.security, undefined, 'actions_projection_must_not_define_top_level_security');
assert.equal(actions.json.components?.securitySchemes?.sfiOAuth, undefined, 'actions_projection_must_not_define_sfi_oauth_scheme');
assert.equal(actions.json.paths?.['/api/mcp/authenticated'], undefined, 'actions_projection_must_not_expose_mcp');
assert.deepEqual(headerParameters(actions.json), [], 'actions_projection_must_not_expose_custom_header_parameters');
assert.deepEqual(operationSecurity(actions.json), [], 'actions_projection_must_not_duplicate_editor_oauth_security');
for (const route of Object.keys(actions.json.paths || {})) {
  assert.ok(route.startsWith('/api/external/v1/'), `actions_projection_non_external_route:${route}`);
}
assert.ok(actions.json.paths?.['/api/external/v1/console']?.get, 'actions_projection_console_required');
assert.equal(actions.json.paths['/api/external/v1/console'].get.operationId, 'readSfiConsole', 'actions_projection_console_operation_id_mismatch');

assert.deepEqual(
  observations.map((item) => item.json.info?.version),
  observations.map(() => observations[0].json.info?.version),
  'canonical_and_actions_schema_versions_must_match',
);
assert.ok(observations[0].json.info?.version, 'live_openapi_version_required');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-PRODUCTION-OAUTH-OPENAPI-RETURN-1.2',
  target: TARGET,
  liveVersion: observations[0].json.info.version,
  expected: {
    server: TARGET,
    canonicalAuthorizationUrl: EXPECTED_AUTH,
    canonicalTokenUrl: EXPECTED_TOKEN,
    canonicalSchemaBinding: 'CANONICAL_PRODUCTION_ORIGIN',
    actionsSchemaBinding: 'GPT_ACTIONS_CANONICAL_PRODUCTION_ORIGIN',
    actionsAuthTransportOwner: 'GPT_ACTION_EDITOR_OAUTH',
    actionsOpenApiSecurityDeclarations: 0,
    actionsCustomHeaderParameters: 0,
    actionsMcpRoutes: 0,
  },
  observations: observations.map((item) => ({
    path: item.path,
    status: item.status,
    finalUrl: item.finalUrl,
    originReceipt: item.originReceipt,
    server: item.json.servers?.[0]?.url,
    authorizationUrl: item.json.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.authorizationUrl ?? null,
    tokenUrl: item.json.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.tokenUrl ?? null,
    schemaBinding: item.json['x-sfi-governance']?.schemaBinding,
    authTransportOwner: item.json['x-sfi-actions-compatibility']?.authTransportOwner ?? null,
    headerParameters: headerParameters(item.json),
    operationSecurity: operationSecurity(item.json),
    hasMcp: Boolean(item.json.paths?.['/api/mcp/authenticated']),
  })),
}, null, 2));
