import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const route = read('src/app/api/external/v1/cases/route.ts');
const auth = read('src/lib/sfi/externalAuth.ts');
const authorize = read('src/app/api/oauth/authorize/route.ts');
const observatoryApi = read('src/app/api/observatory/world/route.ts');
const observatoryPage = read('src/app/observatory/page.tsx');
const merge = read('scripts/merge-openapi-cases.mjs');
const openapi = JSON.parse(read('public/openapi.json')) as Record<string, any>;

for (const token of [
  "authorizeExternalRequest(request, scope)",
  "credential.authMethod !== 'oauth'",
  'credential.subjectId',
  "'cases:read'",
  "'cases:write'",
  'createOperationalCase',
  'readOperationalCase',
  'normalizeAndRegisterOperationalCaseSource',
  'recordOperationalCaseObject',
  'transitionOperationalCase',
]) assert.ok(route.includes(token), `case_gpt_bridge_missing:${token}`);

for (const allowed of [
  "'RECORD'",
  "'OBSERVATION'",
  "'SYSTEM_MODEL'",
  "'HYPOTHESIS'",
  "'ANALYSIS'",
  "'RECOMMENDATION'",
  "'REPORT'",
  "'UNRESOLVED_QUESTION'",
  "'CONTRADICTION'",
]) assert.ok(route.includes(allowed), `case_safe_object_kind_missing:${allowed}`);

assert.ok(route.includes("forbiddenAuthority: ['EVIDENCE', 'GOVERNANCE_DECISION', 'INTERVENTION', 'RETURN', 'TRUTH_CLAIM']"), 'case_forbidden_authority_boundary_missing');
assert.ok(route.includes("excluded: ['INTERVENING', 'AWAITING_RETURN']"), 'case_external_intervention_return_transition_must_remain_blocked');
assert.equal(route.includes('generateOperationalReport'), false, 'external_case_bridge_must_not_generate_governed_report_claims');
assert.equal(route.includes("epistemicRole: 'EVIDENCE'"), false, 'external_case_bridge_must_not_mint_evidence');
assert.equal(route.includes("epistemicRole: 'GOVERNANCE_DECISION'"), false, 'external_case_bridge_must_not_mint_governance');

assert.match(auth, /scope\.startsWith\('cases:'\).*\/api\/external\/v1\/cases/s, 'personal_case_scope_must_be_route_bound');
for (const scope of ['cases:read', 'cases:write']) {
  assert.ok(authorize.includes(`'${scope}'`), `oauth_case_scope_missing:${scope}`);
  assert.ok(merge.includes(`oauth.scopes['${scope}']`), `openapi_merge_scope_missing:${scope}`);
}

assert.ok(observatoryApi.includes('source_url,payload'), 'observatory_public_provenance_fields_missing');
assert.ok(observatoryApi.includes('provenance:'), 'observatory_public_provenance_projection_missing');
assert.ok(observatoryPage.includes('ObservatoryProvenanceFeed'), 'observatory_provenance_feed_not_rendered');

assert.ok(openapi.paths?.['/api/external/v1/cases']?.post, 'openapi_case_workspace_path_missing_after_merge');
const scopes = openapi.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.scopes ?? {};
assert.ok(scopes['cases:read'], 'openapi_cases_read_scope_missing_after_merge');
assert.ok(scopes['cases:write'], 'openapi_cases_write_scope_missing_after_merge');
assert.match(String(openapi['x-sfi-governance']?.caseWorkspaceBoundary ?? ''), /cannot mint accepted EVIDENCE/i, 'openapi_case_authority_boundary_missing');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-GPT-CASE-BRIDGE-1.0',
  route: '/api/external/v1/cases',
  scopes: ['cases:read', 'cases:write'],
  userBoundOAuth: true,
  tenantIsolation: true,
  acceptedEvidenceAuthority: false,
  governanceAuthority: false,
  interventionAuthority: false,
  returnAuthority: false,
  observatoryProvenance: true,
}, null, 2));
