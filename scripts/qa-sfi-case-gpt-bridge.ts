import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const route = read('src/app/api/external/v1/cases/route.ts');
const objectRoute = read('src/app/api/external/v1/cases/object/route.ts');
const readRoute = read('src/app/api/external/v1/cases/read/route.ts');
const transitionRoute = read('src/app/api/external/v1/cases/transition/route.ts');
const transitionPolicy = read('src/lib/sfi/case-platform/externalPolicy.ts');
const manifest = read('src/app/api/external/v1/manifest/route.ts');
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
assert.ok(route.includes('SFI_EXTERNAL_CASE_TRANSITION_SET'), 'generic_case_transition_must_use_shared_policy');
assert.ok(route.includes('SFI_EXTERNAL_CASE_RESERVED_TRANSITIONS'), 'generic_case_reserved_transitions_must_use_shared_policy');
assert.equal(route.includes('generateOperationalReport'), false, 'external_case_bridge_must_not_generate_governed_report_claims');
assert.equal(route.includes("epistemicRole: 'EVIDENCE'"), false, 'external_case_bridge_must_not_mint_evidence');
assert.equal(route.includes("epistemicRole: 'GOVERNANCE_DECISION'"), false, 'external_case_bridge_must_not_mint_governance');
assert.equal(objectRoute.includes("epistemicRole: 'EVIDENCE'"), false, 'case_object_action_must_not_mint_evidence');
assert.equal(objectRoute.includes("epistemicRole: 'GOVERNANCE_DECISION'"), false, 'case_object_action_must_not_mint_governance');
assert.ok(objectRoute.includes("authorizeExternalRequest(request, 'cases:write')"), 'case_object_action_scope_missing');
assert.ok(objectRoute.includes('canonicalRefId'), 'case_object_action_flat_ref_missing');
assert.ok(objectRoute.includes('recordOperationalCaseObject'), 'case_object_action_must_reuse_canonical_writer');
assert.ok(objectRoute.includes('payloadFromTransport(body)'), 'case_object_action_must_reconstruct_transport_payload');
assert.ok(objectRoute.includes("SFI_CASE_PAYLOAD_JSON_INVALID"), 'case_object_action_must_reject_invalid_payload_json');
assert.ok(objectRoute.includes("SFI_CASE_PAYLOAD_JSON_OBJECT_REQUIRED"), 'case_object_action_must_require_object_payload_json');
assert.ok(objectRoute.includes("SFI_CASE_PAYLOAD_TRANSPORT_CONFLICT"), 'case_object_action_must_fail_closed_on_payload_conflict');
assert.ok(objectRoute.includes("Object.prototype.hasOwnProperty.call(body, 'payload')"), 'case_object_action_must_track_direct_payload_presence');
assert.ok(objectRoute.includes("SFI_CASE_PAYLOAD_OBJECT_REQUIRED"), 'case_object_action_must_reject_malformed_direct_payload_even_with_payload_json');
assert.ok(objectRoute.includes('isDeepStrictEqual'), 'case_object_action_must_compare_dual_payloads_structurally');
assert.ok(objectRoute.includes("optionalRefsFromIds(body.sourceRefIds, 'SOURCE_REF_IDS')"), 'case_object_action_source_refs_must_be_strict');
assert.ok(objectRoute.includes("optionalRefsFromIds(body.recordRefIds, 'RECORD_REF_IDS')"), 'case_object_action_record_refs_must_be_strict');
assert.ok(objectRoute.includes("if (!Array.isArray(value)) throw new Error(`SFI_CASE_${field}_INVALID`)"), 'case_object_action_ref_arrays_must_reject_non_arrays');
assert.ok(objectRoute.includes("ids.some((id) => !id) || ids.length !== new Set(ids).size"), 'case_object_action_ref_arrays_must_reject_empty_or_duplicate_ids');

assert.ok(readRoute.includes("authorizeExternalRequest(request, 'cases:read')"), 'case_read_action_scope_missing');
assert.ok(readRoute.includes("auth.credential.authMethod !== 'oauth'"), 'case_read_action_must_require_oauth');
assert.ok(readRoute.includes('auth.credential.subjectId'), 'case_read_action_must_require_subject');
assert.ok(readRoute.includes('readOperationalCase(caseId, auth.credential.subjectId)'), 'case_read_action_must_reuse_canonical_reader');
assert.equal(readRoute.includes('transitionOperationalCase'), false, 'case_read_action_must_be_read_only');

assert.ok(transitionRoute.includes("authorizeExternalRequest(request, 'cases:write')"), 'case_transition_action_scope_missing');
assert.ok(transitionRoute.includes("auth.credential.authMethod !== 'oauth'"), 'case_transition_action_must_require_oauth');
assert.ok(transitionRoute.includes('auth.credential.subjectId'), 'case_transition_action_must_require_subject');
assert.ok(transitionRoute.includes('transitionOperationalCase'), 'case_transition_action_must_reuse_canonical_state_machine');
assert.ok(transitionRoute.includes('SFI_EXTERNAL_CASE_TRANSITION_SET'), 'case_transition_action_must_use_shared_policy');
assert.ok(transitionRoute.includes('SFI_EXTERNAL_CASE_RESERVED_TRANSITIONS'), 'case_transition_action_reserved_states_must_use_shared_policy');

for (const allowed of ['DRAFT', 'OPEN', 'OBSERVING', 'ANALYZING', 'AWAITING_GOVERNANCE', 'CLOSED', 'REJECTED']) {
  assert.ok(transitionPolicy.includes(`'${allowed}'`), `shared_case_transition_missing:${allowed}`);
}
for (const reserved of ['INTERVENING', 'AWAITING_RETURN']) {
  assert.ok(transitionPolicy.includes(`'${reserved}'`), `shared_case_reserved_transition_missing:${reserved}`);
}
const allowedPolicySection = transitionPolicy.slice(
  transitionPolicy.indexOf('SFI_EXTERNAL_CASE_TRANSITIONS'),
  transitionPolicy.indexOf('SFI_EXTERNAL_CASE_TRANSITION_SET'),
);
assert.equal(allowedPolicySection.includes("'INTERVENING'"), false, 'shared_case_policy_must_not_allow_intervening');
assert.equal(allowedPolicySection.includes("'AWAITING_RETURN'"), false, 'shared_case_policy_must_not_allow_awaiting_return');

for (const pathname of [
  '/api/external/v1/cases',
  '/api/external/v1/cases/intake',
  '/api/external/v1/cases/create',
  '/api/external/v1/cases/object',
  '/api/external/v1/cases/read',
  '/api/external/v1/cases/transition',
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

assert.ok(manifest.includes("path: '/cases/object'"), 'manifest_dedicated_case_object_missing');
assert.ok(manifest.includes("operationId: 'addSfiCaseObjectJson'"), 'manifest_dedicated_case_object_operation_id_missing');
assert.ok(manifest.includes("body: { required: ['caseId', 'kind', 'canonicalRefId', 'payloadJson'] }"), 'manifest_dedicated_case_object_required_fields_missing');
assert.ok(manifest.includes("path: '/cases/read'"), 'manifest_dedicated_case_read_missing');
assert.ok(manifest.includes("operationId: 'readSfiCase'"), 'manifest_dedicated_case_read_operation_id_missing');
assert.ok(manifest.includes("path: '/cases/transition'"), 'manifest_dedicated_case_transition_missing');
assert.ok(manifest.includes("operationId: 'transitionSfiCaseV2'"), 'manifest_dedicated_case_transition_operation_id_missing');
assert.equal(manifest.includes("operationId: 'transitionSfiCase'"), false, 'manifest_stale_case_transition_operation_id_present');
assert.ok(manifest.includes("scope: 'cases:read'"), 'manifest_case_read_scope_missing');
assert.ok(manifest.includes("scope: 'cases:write'"), 'manifest_case_write_scope_missing');

assert.ok(observatoryApi.includes('source_url,payload'), 'observatory_public_provenance_fields_missing');
assert.ok(observatoryApi.includes('provenance:'), 'observatory_public_provenance_projection_missing');
assert.ok(observatoryPage.includes('ObservatoryConsole'), 'observatory_canonical_console_not_rendered');
assert.equal(observatoryPage.includes('ObservatoryInterpretiveFlow'), false, 'observatory_page_must_not_mount_duplicate_interpretive_owner');
assert.ok(observatoryConsole.includes('ObservatoryInterpretiveFlow'), 'observatory_interpretive_flow_not_rendered_by_canonical_owner');
assert.ok(observatoryConsole.includes('<ObservatoryInterpretiveFlow world={world} availability={availability.world}/>'), 'observatory_interpretive_flow_must_share_canonical_read_model');
for (const token of ['sourceRole','verificationState','FRONTERA EPISTÉMICA','INFERENCE_ONLY','RETURN / CONTRAST']) {
  assert.ok(observatoryInterpretiveFlow.includes(token), `observatory_interpretive_provenance_missing:${token}`);
}

assert.ok(merge.includes("operationId: 'readSfiCase'"), 'openapi_merge_read_case_action_missing');
assert.ok(merge.includes("operationId: 'transitionSfiCaseV2'"), 'openapi_merge_transition_case_action_missing');
assert.equal(merge.includes("operationId: 'transitionSfiCase'"), false, 'openapi_merge_stale_transition_action_present');
assert.ok(merge.includes('api.components.schemas.CaseReadRequest'), 'openapi_merge_case_read_schema_missing');
assert.ok(merge.includes('api.components.schemas.CaseTransitionRequest'), 'openapi_merge_case_transition_schema_missing');
assert.ok(merge.includes("'REJECTED'"), 'openapi_merge_rejected_transition_missing');
assert.ok(merge.includes('INTERVENING and AWAITING_RETURN remain unavailable'), 'openapi_merge_reserved_transition_boundary_missing');

assert.equal(openapi.info?.version, '1.18.0', 'openapi_gateway_version_invalid');
assert.equal(openapi.info?.['x-sfi-action-revision'], 'case-lifecycle-actions-v6', 'openapi_case_action_revision_invalid');
assert.ok(openapi.paths?.['/api/external/v1/cases']?.post, 'openapi_case_workspace_path_missing_after_merge');
assert.equal(openapi.paths?.['/api/external/v1/cases/object']?.post?.operationId, 'addSfiCaseObjectJson', 'openapi_case_object_action_missing_after_merge');
assert.equal(openapi.paths?.['/api/external/v1/cases/read']?.post?.operationId, 'readSfiCase', 'openapi_case_read_action_missing_after_merge');
assert.equal(openapi.paths?.['/api/external/v1/cases/transition']?.post?.operationId, 'transitionSfiCaseV2', 'openapi_case_transition_action_missing_after_merge');
assert.notEqual(openapi.paths?.['/api/external/v1/cases/transition']?.post?.operationId, 'transitionSfiCase', 'openapi_stale_case_transition_operation_id_present');
assert.equal(openapi.paths?.['/api/external/v1/cases/create']?.post?.operationId, 'createSfiCaseFromResolvedIntake', 'openapi_case_create_action_missing_after_merge');

const objectSchema = openapi.components?.schemas?.CaseObjectTransportRequest ?? {};
assert.ok(Array.isArray(objectSchema.required), 'case_object_transport_required_fields_missing');
for (const field of ['caseId', 'kind', 'canonicalRefId', 'payloadJson']) {
  assert.ok(objectSchema.required.includes(field), `case_object_transport_required_field_missing:${field}`);
}
assert.equal(objectSchema.properties?.canonicalRefId?.type, 'string', 'case_object_transport_flat_ref_id_missing');
assert.equal(objectSchema.properties?.payloadJson?.type, 'string', 'case_object_transport_payload_json_missing');
assert.equal(objectSchema.properties?.payload?.type, 'object', 'case_object_transport_legacy_payload_compatibility_missing');
assert.ok(objectSchema.properties?.kind?.enum?.includes('CONTRADICTION'), 'case_object_transport_contradiction_kind_missing');

const readSchema = openapi.components?.schemas?.CaseReadRequest ?? {};
assert.deepEqual(readSchema.required, ['caseId'], 'case_read_transport_required_fields_invalid');
assert.equal(readSchema.properties?.caseId?.type, 'string', 'case_read_transport_case_id_missing');

const transitionSchema = openapi.components?.schemas?.CaseTransitionRequest ?? {};
assert.ok(Array.isArray(transitionSchema.required), 'case_transition_transport_required_fields_missing');
assert.deepEqual(transitionSchema.required, ['caseId', 'status'], 'case_transition_transport_required_fields_invalid');
const transitionEnum = transitionSchema.properties?.status?.enum ?? [];
assert.deepEqual(transitionEnum, ['DRAFT', 'OPEN', 'OBSERVING', 'ANALYZING', 'AWAITING_GOVERNANCE', 'CLOSED', 'REJECTED'], 'openapi_case_transition_status_enum_invalid');
assert.equal(transitionEnum.includes('INTERVENING'), false, 'openapi_case_transition_must_not_allow_intervening');
assert.equal(transitionEnum.includes('AWAITING_RETURN'), false, 'openapi_case_transition_must_not_allow_awaiting_return');

assert.deepEqual(openapi.paths?.['/api/external/v1/cases/read']?.post?.security, [{ sfiOAuth: ['cases:read'] }], 'openapi_case_read_scope_invalid');
assert.deepEqual(openapi.paths?.['/api/external/v1/cases/transition']?.post?.security, [{ sfiOAuth: ['cases:write'] }], 'openapi_case_transition_scope_invalid');

const scopes = openapi.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.scopes ?? {};
assert.ok(scopes['cases:read'], 'openapi_cases_read_scope_missing_after_merge');
assert.ok(scopes['cases:write'], 'openapi_cases_write_scope_missing_after_merge');
assert.match(String(openapi['x-sfi-governance']?.caseWorkspaceBoundary ?? ''), /cannot mint accepted EVIDENCE/i, 'openapi_case_authority_boundary_missing');
assert.match(String(openapi['x-sfi-governance']?.caseWorkspaceBoundary ?? ''), /INTERVENING and AWAITING_RETURN remain reserved/i, 'openapi_case_reserved_lifecycle_boundary_missing');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-GPT-CASE-BRIDGE-1.6',
  route: '/api/external/v1/cases',
  readAction: '/api/external/v1/cases/read',
  readOperationId: 'readSfiCase',
  objectAction: '/api/external/v1/cases/object',
  objectOperationId: 'addSfiCaseObjectJson',
  transitionAction: '/api/external/v1/cases/transition',
  transitionOperationId: 'transitionSfiCaseV2',
  createOperationId: 'createSfiCaseFromResolvedIntake',
  flatCanonicalRefRequired: true,
  payloadJsonRequiredForGptTransport: true,
  legacyPayloadObjectAcceptedAtRuntime: true,
  lineageRefArraysStrict: true,
  contradictionObjectAllowed: true,
  sharedLifecyclePolicy: true,
  manifestDiscovery: true,
  rejectedTransitionAllowed: true,
  interventionTransitionAllowed: false,
  awaitingReturnTransitionAllowed: false,
  personalCaseRoutes: [
    '/api/external/v1/cases',
    '/api/external/v1/cases/intake',
    '/api/external/v1/cases/create',
    '/api/external/v1/cases/object',
    '/api/external/v1/cases/read',
    '/api/external/v1/cases/transition',
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
