import assert from 'node:assert/strict';

const TARGET = (process.env.SFI_PRODUCTION_SMOKE_TARGET || 'https://www.systemfriction.org').replace(/\/$/, '');
const EXPECTED_AUTH = `${TARGET}/api/oauth/authorize`;
const EXPECTED_TOKEN = `${TARGET}/api/oauth/token`;
const ENDPOINTS = ['/api/external/openapi', '/openapi.json'];
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
        'user-agent': 'SFI-production-oauth-openapi-assurance/1.3',
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

function overlongDescriptions(document) {
  const found = [];
  for (const [route, pathItem] of Object.entries(document?.paths || {})) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      const operation = pathItem?.[method];
      if (!operation) continue;
      if (typeof operation.description === 'string' && operation.description.length > 300) {
        found.push(`${method.toUpperCase()} ${route}:${operation.description.length}`);
      }
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

  const flow = observation.json.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode;
  assert.equal(flow?.authorizationUrl, EXPECTED_AUTH, `${observation.path}:authorization_origin_mismatch`);
  assert.equal(flow?.tokenUrl, EXPECTED_TOKEN, `${observation.path}:token_origin_mismatch`);
  assert.ok(observation.json.components?.securitySchemes?.sfiOAuth, `${observation.path}:oauth_security_scheme_required`);
  assert.deepEqual(headerParameters(observation.json), [], `${observation.path}:custom_header_parameters_not_allowed_for_gpt_actions`);
  assert.deepEqual(overlongDescriptions(observation.json), [], `${observation.path}:operation_descriptions_must_fit_gpt_actions_limit`);
  assert.equal(observation.json.paths?.['/api/mcp/authenticated'], undefined, `${observation.path}:authenticated_mcp_must_be_out_of_band`);
  assert.ok(observation.json.paths?.['/api/external/v1/console']?.get, `${observation.path}:console_required`);
  assert.equal(observation.json.paths['/api/external/v1/console'].get.operationId, 'readSfiConsole', `${observation.path}:console_operation_id_mismatch`);
  assert.deepEqual(observation.json.paths['/api/external/v1/console'].get.security, [{ sfiOAuth: ['observe'] }], `${observation.path}:console_oauth_scope_required`);
  assert.equal(observation.json['x-sfi-governance']?.schemaBinding, 'CANONICAL_PRODUCTION_ORIGIN', `${observation.path}:schema_binding_missing`);
  assert.equal(observation.originReceipt, TARGET, `${observation.path}:origin_receipt_mismatch`);
}

assert.deepEqual(
  observations.map((item) => item.json.info?.version),
  observations.map(() => observations[0].json.info?.version),
  'canonical_schema_versions_must_match',
);
assert.ok(observations[0].json.info?.version, 'live_openapi_version_required');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-PRODUCTION-OAUTH-OPENAPI-RETURN-1.3',
  target: TARGET,
  liveVersion: observations[0].json.info.version,
  expected: {
    server: TARGET,
    canonicalAuthorizationUrl: EXPECTED_AUTH,
    canonicalTokenUrl: EXPECTED_TOKEN,
    canonicalSchemaBinding: 'CANONICAL_PRODUCTION_ORIGIN',
    gptActionsSchema: '/openapi.json',
    oauthSecurityDeclarationsRequired: true,
    customHeaderParameters: 0,
    authenticatedMcpRoutes: 0,
    maxOperationDescriptionChars: 300,
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
    headerParameters: headerParameters(item.json),
    overlongDescriptions: overlongDescriptions(item.json),
    hasMcp: Boolean(item.json.paths?.['/api/mcp/authenticated']),
  })),
}, null, 2));
