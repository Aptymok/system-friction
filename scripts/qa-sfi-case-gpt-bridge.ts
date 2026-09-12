import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const route = read('src/app/api/external/v1/cases/route.ts');
const objectRoute = read('src/app/api/external/v1/cases/object/route.ts');
const auth = read('src/lib/sfi/externalAuth.ts');
const authorize = read('src/app/api/oauth/authorize/route.ts');
const oauthConfig = read('src/lib/sfi/oauthConfig.ts');
const observatoryApi = read('src/app/api/observatory/world/route.ts');
const observatoryPage = read('src/app/observatory/page.tsx');
const observatoryConsole = read('src/components/sfi/ObservatoryConsole.tsx');
const observatoryInterpretiveFlow = read('src/components/sfi/ObservatoryInterpretiveFlow.tsx');
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
  'canonicalRefFromAction',
  'canonicalRefId',
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
]) {
  assert.ok(route.includes(allowed), `case_safe_object_kind_missing:${allowed}`);
  assert.ok(objectRoute.includes(allowed), `case_object_action_safe_kind_missing:${allowed}`);
}

assert.ok(route.includes("forbiddenAuthority: ['EVIDENCE', 'GOVERNANCE_DECISION', 'INTERVENTION', 'RETURN', 'TRUTH_CLAIM']"), 'case_forbidden_authority_boundary_missing');
assert.ok(objectRoute.includes("forbiddenAuthority: ['EVIDENCE', 'GOVERNANCE_DECISION', 'INTERVENTION', 'RETURN', 'TRUTH_CLAIM']"), 'case_object_action_forbidden_authority_boundary_missing');
assert.ok(route.includes("excluded: ['INTERVENING', 'AWAITING_RETURN']"), 'case_external_intervention_return_transition_must_remain_blocked');
assert.equal(route.includes('generateOperationalReport'), false, 'external_case_bridge_must_not_generate_governed_report_claims');
assert.equal(route.includes("epistemicRole: 'EVIDENCE'"), false, 'external_case_bridge_must_not_mint_evidence');
assert.equal(route.includes("epistemicRole: 'GOVERNANCE_DECISION'"), false, 'external_case_bridge_must_not_mint_governance');
assert.equal(objectRoute.includes("epistemicRole: 'EVIDENCE'"), false, 'case_object_action_must_not_mint_evidence');
assert.equal(objectRoute.includes("epistemicRole: 'GOVERNANCE_DECISION'"), false, 'case_object_action_must_not_mint_governance');
assert.ok(objectRoute.includes("authorizeExternalRequest(request, 'cases:write')"), 'case_object_action_scope_missing');
assert.ok(objectRoute.includes('canonicalRefId'), 'case_object_action_flat_ref_missing');
assert.ok(objectRoute.includes('recordOperationalCaseObject'), 'case_object_action_must_reuse_canonical_writer');
assert.ok(objectRoute.includes("if (!isRow(body.payload)) throw new Error('SFI_CASE_PAYLOAD_REQUIRED')"), 'case_object_action_must_reject_missing_or_non_object_payload');

for (const pathname of [
  '/api/external/v1/cases',
  '/api/external/v1/cases/intake',
  '/api/external/v1/cases/create',
  '/api/external/v1/cases/object',
]) {
  assert.ok(auth.includes(`'${pathname}'`), `personal_case_route_missing:${pathname}`);
}
assert.match(auth, /scope\.startsWith\('cases:'\)[\s\S]*new Set\(\[/, 'personal_case_scope_must_use_explicit_owner_scoped_allowlist');
assert.match(authorize, /SFI_ROOT_SCOPES/, 'oauth_authorize_must_use_central_scope_registry');
assert.match(authorize, /SFI_PERSONAL_SCOPES/, 'oauth_authorize_must_use_personal_scope_registry');
for (const scope of ['cases:read', 'cases:write']) {
  assert.ok(oauthConfig.includes(`'${scope}'`), `oauth_case_scope_missing:${scope}`);
  assert.ok(merge.includes(`oauth.scopes['${scope}']`), `openapi_merge_scope_missing:${scope}`);
}

assert.ok(observatoryApi.includes('source_url,payload'), 'observatory_public_provenance_fields_missing');
assert.ok(observatoryApi.includes('provenance:'), 'observatory_public_provenance_projection_missing');
assert.ok(observatoryPage.includes('ObservatoryConsole'), 'observatory_canonical_console_not_rendered');
assert.equal(observatoryPage.includes('ObservatoryInterpretiveFlow'), false, 'observatory_page_must_not_mount_duplicate_interpretive_owner');
assert.ok(observatoryConsole.includes('ObservatoryInterpretiveFlow'), 'observatory_interpretive_flow_not_rendered_by_canonical_owner');
assert.ok(observatoryConsole.includes('<ObservatoryInterpretiveFlow world={world} availability={availability.world}/>'), 'observatory_interpretive_flow_must_share_canonical_read_model');
for (const token of ['sourceRole','verificationState','FRONTERA EPISTÉMICA','INFERENCE_ONLY','RETURN / CONTRAST']) {
  assert.ok(observatoryInterpretiveFlow.includes(token), `observatory_interpretive_provenance_missing:${token}`);
}

assert.ok(openapi.paths?.['/api/external/v1/cases']?.post, 'openapi_case_workspace_path_missing_after_merge');
assert.equal(openapi.paths?.['/api/external/v1/cases/object']?.post?.operationId, 'addSfiCaseObject', 'openapi_case_object_action_missing_after_merge');
const objectSchema = openapi.components?.schemas?.CaseObjectTransportRequest ?? {};
assert.ok(Array.isArray(objectSchema.required), 'case_object_transport_required_fields_missing');
for (const field of ['caseId', 'kind', 'canonicalRefId', 'payload']) {
  assert.ok(objectSchema.required.includes(field), `case_object_transport_required_field_missing:${field}`);
}
assert.equal(objectSchema.properties?.canonicalRefId?.type, 'string', 'case_object_transport_flat_ref_id_missing');
const scopes = openapi.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.scopes ?? {};
assert.ok(scopes['cases:read'], 'openapi_cases_read_scope_missing_after_merge');
assert.ok(scopes['cases:write'], 'openapi_cases_write_scope_missing_after_merge');
assert.match(String(openapi['x-sfi-governance']?.caseWorkspaceBoundary ?? ''), /cannot mint accepted EVIDENCE/i, 'openapi_case_authority_boundary_missing');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-GPT-CASE-BRIDGE-1.1',
  route: '/api/external/v1/cases',
  objectAction: '/api/external/v1/cases/object',
  objectOperationId: 'addSfiCaseObject',
  flatCanonicalRefRequired: true,
  payloadRequiredAtRuntime: true,
  personalCaseRoutes: [
    '/api/external/v1/cases',
    '/api/external/v1/cases/intake',
    '/api/external/v1/cases/create',
    '/api/external/v1/cases/object',
  ],
  scopes: ['cases:read', 'cases:write'],
  userBoundOAuth: true,
  tenantIsolation: true,
  acceptedEvidenceAuthority: false,
  governanceAuthority: false,
  interventionAuthority: false,
  returnAuthority: false,
  observatoryProvenance: true,
  observatoryInterpretation: 'SHARED_AUTHORITATIVE_READ_MODEL',
}, null, 2));