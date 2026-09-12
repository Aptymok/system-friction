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
        'user-agent': 'SFI-production-oauth-openapi-assurance/1.0',
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
  assert.equal(observation.json['x-sfi-governance']?.schemaBinding, 'CANONICAL_PRODUCTION_ORIGIN', `${observation.path}:schema_binding_missing`);
  assert.equal(observation.originReceipt, TARGET, `${observation.path}:origin_receipt_mismatch`);
}

assert.deepEqual(
  observations.map((item) => item.json.info?.version),
  [observations[0].json.info?.version, observations[0].json.info?.version],
  'legacy_and_actions_schema_versions_must_match',
);
assert.ok(observations[0].json.info?.version, 'live_openapi_version_required');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-PRODUCTION-OAUTH-OPENAPI-RETURN-1.0',
  target: TARGET,
  liveVersion: observations[0].json.info.version,
  expected: {
    server: TARGET,
    authorizationUrl: EXPECTED_AUTH,
    tokenUrl: EXPECTED_TOKEN,
    schemaBinding: 'CANONICAL_PRODUCTION_ORIGIN',
  },
  observations: observations.map((item) => ({
    path: item.path,
    status: item.status,
    finalUrl: item.finalUrl,
    originReceipt: item.originReceipt,
    server: item.json.servers?.[0]?.url,
    authorizationUrl: item.json.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.authorizationUrl,
    tokenUrl: item.json.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.tokenUrl,
    schemaBinding: item.json['x-sfi-governance']?.schemaBinding,
  })),
}, null, 2));
