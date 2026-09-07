import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function text(path: string) {
  return readFileSync(path, 'utf8');
}

const adapter = text('src/lib/mcp/authenticatedGovernedMachineAdapter.ts');
const route = text('src/app/api/mcp/authenticated/route.ts');
const publicRoute = text('src/app/api/mcp/public/route.ts');
const publicServer = text('src/lib/mcp/publicMcpServer.ts');
const externalAuth = text('src/lib/sfi/externalAuth.ts');
const accessToken = text('src/lib/sfi/externalSessionToken.ts');
const tokenRoute = text('src/app/api/oauth/token/route.ts');
const manifest = text('src/app/api/external/v1/manifest/route.ts');
const openapiMerge = text('scripts/merge-openapi-authenticated-machine.mjs');
const packageJson = text('package.json');
const grantOwner = text('src/lib/sfi/cognitive-runtime/capabilityGrant.ts');
const brokerOwner = text('src/lib/sfi/cognitive-runtime/capabilityBroker.ts');
const manualExecution = text('src/lib/sfi/cognitive-runtime/manualExecution.ts');

assert.match(adapter, /SFI-AUTHENTICATED-GOVERNED-MACHINE-ADAPTER-1\.0/, 'authenticated_machine_contract_required');
assert.match(adapter, /SFI-CAPABILITY-GRANT-1\.0|SFI_CAPABILITY_GRANT_CONTRACT/, 'integrated_grant_contract_must_be_consumed');
assert.match(adapter, /effectiveCapabilityGrantState/, 'grant_state_must_be_revalidated');
assert.match(adapter, /cognitivePassportForCapability/, 'passport_ceiling_must_be_revalidated');
assert.match(adapter, /GRANT_EXCEEDS_REQUESTER_PASSPORT_AUTHORITY/, 'requester_passport_ceiling_required');
assert.match(adapter, /GRANT_EXCEEDS_REQUESTED_PASSPORT_AUTHORITY/, 'requested_passport_ceiling_required');
assert.match(adapter, /CHILD_AUTHORITY_EXPANSION/, 'parent_authority_ceiling_required');
assert.match(adapter, /GRANT_REPLAY_DETECTED/, 'replay_gate_required');
assert.match(adapter, /UNSATISFIED_GRANT_CONFIRMATION/, 'confirmation_gate_required');
assert.match(adapter, /GRANT_RESOURCE_MISMATCH/, 'resource_binding_required');
assert.match(adapter, /GRANT_ACTION_NOT_ALLOWED/, 'action_binding_required');
assert.match(adapter, /OAUTH_PRINCIPAL_MISMATCH/, 'oauth_principal_binding_required');
assert.match(adapter, /OAUTH_CLIENT_MISMATCH/, 'oauth_client_binding_required');
assert.match(adapter, /OAUTH_SCOPE_MISMATCH/, 'oauth_scope_binding_required');
assert.match(adapter, /INSTITUTIONAL_TENANT_REQUIRED/, 'institutional_tenant_required');
assert.match(adapter, /SECRET_OR_RAW_NONCE_IN_MACHINE_PAYLOAD/, 'secret_boundary_required');
assert.match(adapter, /EXPECTED_NOT_FABRICATED/, 'return_expectation_must_not_be_fabricated');
assert.match(adapter, /SFI_MACHINE_AUTHORIZATION_RESERVED/, 'one_time_reservation_receipt_required');
assert.match(adapter, /reservationEventId/, 'deterministic_replay_reservation_required');
assert.match(adapter, /SFI_MACHINE_EXECUTION_OBSERVED/, 'execution_receipt_required');
assert.match(adapter, /SFI_MACHINE_AUTHORIZATION_DENIED/, 'denial_receipt_required');
assert.match(adapter, /canonicalPromotionAllowed: false/, 'machine_adapter_cannot_promote_canon');
assert.match(adapter, /externalSideEffectExecuted: false/, 'current_adapter_must_not_expose_external_side_effects');

// ABSORB > CREATE: OAuth, grant/broker/passport, execution and event persistence remain existing owners.
assert.match(route, /authorizeExternalRequest/, 'must_absorb_existing_oauth_gateway');
assert.match(route, /appendEpistemicEvent/, 'must_absorb_existing_event_owner');
assert.match(route, /streamRecentEpistemicEvents/, 'must_read_existing_lineage_owner');
assert.match(route, /executeManualCognitiveAgent/, 'must_absorb_existing_cognitive_execution_owner');
assert.doesNotMatch(`${adapter}\n${route}`, /createServiceSupabaseClient|create table|sfi_capability_grants/i, 'no_new_grant_or_event_persistence_owner');
assert.doesNotMatch(adapter, /issueEphemeralCapabilityGrant|mintExternalAccessToken|resolveSfiOAuthClient/, 'adapter_must_not_mint_grants_or_oauth_authority');
assert.doesNotMatch(adapter, /dispatchQueuedProposal|EXTERNAL_ACTION|EXECUTE_EXTERNAL.*decision/i, 'adapter_must_not_open_external_execution_plane');
assert.match(manualExecution, /runCognitiveAgent\(agentId, context\)/, 'canonical_manual_execution_must_still_terminate_in_existing_runtime_owner');

// OAuth client binding is retained by the existing signed token rather than trusted from caller input.
assert.match(accessToken, /clientId\?: string/, 'oauth_access_token_claim_must_support_client_binding');
assert.match(tokenRoute, /clientId,\n\s*label:/, 'oauth_token_exchange_must_bind_verified_client_id');
assert.match(externalAuth, /clientId: session\.clientId/, 'gateway_credential_must_expose_verified_client_id');
assert.match(route, /credential\.authMethod !== 'oauth'/, 'authenticated_machine_must_reject_static_tokens');
assert.match(route, /!credential\.clientId/, 'authenticated_machine_must_reject_unbound_legacy_tokens');

// Ephemeral grant possession proof: raw nonce is transient header-only; persisted nonceHash is the comparison owner.
assert.match(grantOwner, /capabilityGrantNonceHash\(nonce: string\)/, 'upstream_grant_hash_owner_required');
assert.match(route, /x-sfi-capability-grant-nonce/i, 'machine_grant_nonce_header_required');
assert.match(route, /capabilityGrantNonceHash\(rawGrantNonce\)/, 'raw_nonce_must_be_hashed_immediately');
assert.match(route, /persistedNonceHash === presentedGrantNonceHash/, 'persisted_nonce_hash_must_match_presented_grant_proof');
assert.match(route, /eventGrantId !== targetGrantId/, 'grant_proof_filter_must_only_apply_to_requested_grant');
assert.doesNotMatch(adapter, /x-sfi-capability-grant-nonce/i, 'raw_nonce_must_not_enter_adapter_or_execution_envelope');

// Secret/model boundary: forbidden secret-shaped keys are explicitly rejected, while the adapter/route never read credential stores or secret env values.
assert.match(adapter, /FORBIDDEN_SECRET_KEY/, 'secret_shaped_payload_keys_must_be_rejected');
assert.doesNotMatch(adapter, /process\.env|createServiceSupabaseClient|client_secret_hash/i, 'adapter_must_not_read_service_credentials');
assert.doesNotMatch(route, /process\.env|createServiceSupabaseClient|client_secret_hash|SFI_EXTERNAL_SESSION_SECRET/i, 'machine_route_must_not_read_service_credentials');
assert.match(adapter, /rawNoncePersisted: false/g, 'receipts_must_state_raw_nonce_is_not_persisted');
assert.doesNotMatch(adapter, /providerRouter|agentLlmClient|getLlmOperationPlan|operationModelBroker|modelBroker/i, 'model_selection_must_not_be_authority_owner');
assert.match(adapter, /modelAuthorityExpansionAllowed: false/, 'model_capability_must_not_expand_authority');

// Public read-only MCP remains a separate immutable authority surface.
assert.match(publicServer, /SFI-PUBLIC-MCP-READONLY-1\.0/, 'public_mcp_contract_must_remain');
assert.match(publicServer, /PUBLIC_READ_ONLY/, 'public_mcp_authority_must_remain_read_only');
assert.doesNotMatch(publicRoute, /authenticatedGovernedMachineAdapter|authorizeExternalRequest|executeManualCognitiveAgent/, 'public_mcp_must_not_inherit_authenticated_execution');
assert.doesNotMatch(publicServer, /invoke_cognitive_capability|SFI_MACHINE_AUTHORIZATION_RESERVED/, 'public_tool_catalog_must_not_gain_execution');

// Manifest + generated OpenAPI describe capability without claiming external publication.
assert.match(manifest, /version: '1\.13\.0'/, 'manifest_version_must_advance');
assert.match(manifest, /authenticatedMcp: '\/api\/mcp\/authenticated'/, 'manifest_must_discover_authenticated_mcp');
assert.match(manifest, /SFI-AUTHENTICATED-GOVERNED-MACHINE-ADAPTER-1\.0/, 'manifest_contract_required');
assert.match(manifest, /externalRegistryReceipt: null/, 'manifest_must_not_fabricate_external_registry_receipt');
assert.match(manifest, /claimedPublished: false/, 'manifest_must_not_claim_external_publication');
assert.match(openapiMerge, /\/api\/mcp\/authenticated/, 'openapi_merge_must_add_authenticated_path');
assert.match(openapiMerge, /X-SFI-Capability-Grant-Nonce/, 'openapi_must_describe_transient_grant_proof');
assert.match(openapiMerge, /sfiOAuth: \['execute'\]/, 'openapi_must_reuse_existing_oauth_execute_scope');
assert.match(openapiMerge, /externalPublicationReceipt: null/, 'openapi_must_not_fabricate_external_publication');
assert.match(packageJson, /merge-openapi-authenticated-machine\.mjs/, 'production_build_must_materialize_authenticated_machine_openapi');

// Canonical owners remain the grant/broker contracts integrated before this slice.
assert.match(grantOwner, /export const SFI_CAPABILITY_GRANT_CONTRACT = 'SFI-CAPABILITY-GRANT-1\.0'/, 'grant_owner_must_remain_ws01');
assert.match(brokerOwner, /CAPABILITY_REQUEST_IS_NOT_AUTHORIZATION/, 'broker_admit_must_remain_non-authorizing');
assert.doesNotMatch(adapter, /SFI_CAPABILITY_GRANT_CONTRACT\s*=/, 'ws04_must_not_redeclare_grant_contract');

// Keep QA output intentionally non-sensitive: report only contract/gate state and deltas.
console.log(JSON.stringify({
  ok: true,
  gate: 'SFI-AUTHENTICATED-GOVERNED-MACHINE-1.0',
  contract: 'SFI-AUTHENTICATED-GOVERNED-MACHINE-ADAPTER-1.0',
  bindingVerification: 'PASS',
  persistenceDelta: 'NONE',
  authorityDelta: 'NONE',
  externalPublicationReceipt: null,
}, null, 2));
