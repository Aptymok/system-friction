import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function text(path: string) {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
}

const adapter = text('src/lib/mcp/authenticatedGovernedMachineAdapter.ts');
const gatewayProjection = text('src/lib/mcp/authenticatedGatewayProjection.ts');
const route = text('src/app/api/mcp/authenticated/route.ts');
const protectedResourceMetadata = text('src/app/.well-known/oauth-protected-resource/route.ts');
const rootDecisionRoute = text('src/app/api/external/v1/governance/proposals/[id]/decision/route.ts');
const publicRoute = text('src/app/api/mcp/public/route.ts');
const publicServer = text('src/lib/mcp/publicMcpServer.ts');
const externalAuth = text('src/lib/sfi/externalAuth.ts');
const accessToken = text('src/lib/sfi/externalSessionToken.ts');
const tokenRoute = text('src/app/api/oauth/token/route.ts');
const authorizeRoute = text('src/app/api/oauth/authorize/route.ts');
const oauthAuthorizationMetadata = text('src/app/.well-known/oauth-authorization-server/route.ts');
const oauthClientRegistry = text('src/lib/sfi/oauthClientRegistry.ts');
const manifest = text('src/app/api/external/v1/manifest/route.ts');
const openapiMerge = text('scripts/merge-openapi-authenticated-machine.mjs');
const hostBoundOpenapi = text('src/app/api/external/openapi/route.ts');
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
assert.match(adapter, /externalSideEffectExecuted: false/, 'grant_bound_cognitive_execution_must_not_expose_external_side_effects');
assert.match(gatewayProjection, /SFI-AUTHENTICATED-GATEWAY-PROJECTION-1\.0/, 'gateway_projection_contract_required');
assert.match(gatewayProjection, /invoke_sfi_gateway_operation/, 'gateway_projection_tool_required');
assert.match(gatewayProjection, /SFI_GATEWAY_OPERATION_NOT_ALLOWED/, 'gateway_projection_must_reject_arbitrary_operations');
assert.match(gatewayProjection, /governance:decide/, 'gateway_projection_must_preserve_root_decision_scope');
assert.doesNotMatch(gatewayProjection, /executeSfiCognitiveAgentContract/, 'gateway_projection_must_not_bypass_grant_bound_cognitive_execution');
assert.match(adapter, /cognitiveGrantBypassAllowed: false/, 'gateway_projection_must_publish_no_cognitive_grant_bypass');
assert.match(adapter, /ONLY_THROUGH_EXISTING_GATEWAY_AUTHORIZATION/, 'gateway_projection_external_effects_must_remain_owned_by_canonical_gateway');

assert.match(route, /authorizeExternalRequest/, 'must_absorb_existing_oauth_gateway');
assert.match(route, /appendEpistemicEvent/, 'must_absorb_existing_event_owner');
assert.match(route, /streamRecentEpistemicEvents/, 'must_read_existing_lineage_owner');
assert.match(route, /executeManualCognitiveAgent/, 'must_absorb_existing_cognitive_execution_owner');
assert.match(adapter, /sfi:\/\/institutional\/context/, 'authenticated_machine_must_expose_compact_institutional_context_resource');
assert.match(adapter, /readInstitutionalContext/, 'institutional_context_resource_must_delegate_to_bound_reader');
assert.match(route, /readContinuityDashboard/, 'institutional_context_must_reuse_continuity_owner');
assert.match(route, /readObservedSfiCognitiveRuntime/, 'institutional_context_must_reuse_observed_cognitive_runtime_owner');
assert.match(route, /readUniversalOpenCycles/, 'institutional_context_must_reuse_universal_cycle_owner');
assert.match(route, /SFI-CHATGPT-INSTITUTIONAL-CONTEXT-1\.0/, 'institutional_context_contract_required');
assert.doesNotMatch(`${adapter}\n${route}`, /createServiceSupabaseClient|create table|sfi_capability_grants/i, 'no_new_grant_or_event_persistence_owner');
assert.doesNotMatch(adapter, /issueEphemeralCapabilityGrant|mintExternalAccessToken|resolveSfiOAuthClient/, 'adapter_must_not_mint_grants_or_oauth_authority');
assert.doesNotMatch(adapter, /dispatchQueuedProposal|EXTERNAL_ACTION|EXECUTE_EXTERNAL.*decision/i, 'adapter_must_not_open_external_execution_plane');
assert.match(manualExecution, /runCognitiveAgent\(agentId, context\)/, 'canonical_manual_execution_must_still_terminate_in_existing_runtime_owner');

assert.match(accessToken, /clientId\?: string/, 'oauth_access_token_claim_must_support_client_binding');
assert.match(tokenRoute, /clientId,\n\s*label:/, 'oauth_token_exchange_must_bind_verified_client_id');
assert.match(oauthAuthorizationMetadata, /client_id_metadata_document_supported:\s*true/, 'oauth_metadata_must_advertise_cimd');
assert.match(oauthAuthorizationMetadata, /token_endpoint_auth_methods_supported:\s*\['none', 'client_secret_basic', 'client_secret_post'\]/, 'oauth_metadata_must_allow_pkce_public_client_without_regressing_secret_clients');
assert.match(oauthClientRegistry, /https:\/\/chatgpt\.com\/oauth\/client\.json/, 'chatgpt_stable_cimd_client_id_required');
assert.match(oauthClientRegistry, /https:\/\/chatgpt\.com\/connector_platform_oauth_redirect/, 'chatgpt_stable_redirect_required');
assert.match(oauthClientRegistry, /source:\s*'chatgpt_cimd'/, 'chatgpt_cimd_client_must_be_explicitly_bounded');
assert.match(oauthClientRegistry, /client\.source === 'chatgpt_cimd'\) return clientSecret === ''/, 'chatgpt_cimd_must_use_public_client_token_exchange');
assert.match(authorizeRoute, /client\.source === 'chatgpt_cimd'[\s\S]*PKCE S256 is required for the ChatGPT MCP client/, 'chatgpt_cimd_authorization_must_require_pkce_s256');
assert.match(tokenRoute, /client\.source === 'chatgpt_cimd'[\s\S]*!found\.record\.code_challenge/, 'chatgpt_cimd_token_exchange_must_fail_closed_without_pkce');
assert.match(externalAuth, /clientId: session\.clientId/, 'gateway_credential_must_expose_verified_client_id');
assert.match(route, /credential\.authMethod !== 'oauth'/, 'authenticated_machine_must_reject_static_tokens');
assert.match(route, /!credential\.clientId/, 'authenticated_machine_must_reject_unbound_legacy_tokens');
assert.match(route, /requiredScopeForAuthenticatedGatewayInvocation/, 'gateway_projection_scope_must_be_resolved_before_authorization');
assert.match(adapter, /securitySchemes:\s*\[\{ type: 'oauth2', scopes: \['execute'\] \}\]/, 'cognitive_tool_must_advertise_oauth_security_scheme');
assert.match(gatewayProjection, /SFI_AUTHENTICATED_GATEWAY_SECURITY_SCHEMES/, 'root_gateway_tool_must_advertise_oauth_security_scheme');
assert.match(gatewayProjection, /_meta:\s*\{[\s\S]*securitySchemes:/, 'root_gateway_tool_must_publish_legacy_security_scheme_copy');
assert.match(route, /isPublicDiscoveryRequest/, 'authenticated_mcp_must_allow_unauthenticated_tool_discovery');
assert.match(route, /dispatchPublicDiscovery/, 'authenticated_mcp_discovery_must_not_require_identity');
assert.match(route, /mcp\/www_authenticate/, 'authenticated_mcp_must_emit_runtime_oauth_link_challenge');
assert.match(route, /error_description="Authorize SYSTEM FRICTION INSTITUTE to continue"/, 'authenticated_mcp_oauth_challenge_must_be_user_linkable');
assert.match(route, /Authorization: authorization/, 'gateway_projection_must_forward_only_bound_oauth_identity_to_canonical_gateway');
const gatewayForwardBlock = route.match(/invokeGateway: async \(invocation\) => \{([\s\S]*?)\n    \},\n    readInstitutionalContext/)?.[1] ?? '';
assert.ok(gatewayForwardBlock, 'gateway_projection_forward_block_must_be_inspectable');
assert.match(gatewayForwardBlock, /Authorization: authorization/, 'gateway_projection_must_forward_bearer_identity');
assert.doesNotMatch(gatewayForwardBlock, /x-sfi-capability-grant-nonce|rawGrantNonce|presentedGrantNonceHash/i, 'gateway_projection_must_not_forward_cognitive_possession_proof');
assert.match(route, /buildAuthenticatedGatewayRequest/, 'gateway_projection_must_reuse_allowlisted_request_builder');
assert.match(protectedResourceMetadata, /SFI_AUTHENTICATED_MCP_SCOPES/, 'authenticated_mcp_resource_metadata_must_publish_exact_projected_scope_set');
assert.match(rootDecisionRoute, /credential\.role !== 'root_delegate'/, 'governance_decision_must_require_root_delegate');
assert.match(rootDecisionRoute, /sovereignRootProfile/, 'governance_decision_must_revalidate_sovereign_root_profile');

assert.match(grantOwner, /capabilityGrantNonceHash\(nonce: string\)/, 'upstream_grant_hash_owner_required');
assert.match(route, /x-sfi-capability-grant-nonce/i, 'machine_grant_nonce_header_required');
assert.match(route, /capabilityGrantNonceHash\(rawGrantNonce\)/, 'raw_nonce_must_be_hashed_immediately');
assert.match(route, /persistedNonceHash === presentedGrantNonceHash/, 'persisted_nonce_hash_must_match_presented_grant_proof');
assert.match(route, /eventGrantId !== targetGrantId/, 'grant_proof_filter_must_only_apply_to_requested_grant');
assert.doesNotMatch(adapter, /x-sfi-capability-grant-nonce/i, 'raw_nonce_must_not_enter_adapter_or_execution_envelope');

assert.match(adapter, /FORBIDDEN_SECRET_KEY/, 'secret_shaped_payload_keys_must_be_rejected');
assert.doesNotMatch(adapter, /process\.env|createServiceSupabaseClient|client_secret_hash/i, 'adapter_must_not_read_service_credentials');
assert.doesNotMatch(route, /process\.env|createServiceSupabaseClient|client_secret_hash|SFI_EXTERNAL_SESSION_SECRET/i, 'machine_route_must_not_read_service_credentials');
assert.match(adapter, /rawNoncePersisted: false/g, 'receipts_must_state_raw_nonce_is_not_persisted');
assert.doesNotMatch(adapter, /providerRouter|agentLlmClient|getLlmOperationPlan|operationModelBroker|modelBroker/i, 'model_selection_must_not_be_authority_owner');
assert.match(adapter, /modelAuthorityExpansionAllowed: false/, 'model_capability_must_not_expand_authority');

assert.match(publicServer, /SFI-PUBLIC-MCP-READONLY-1\.0/, 'public_mcp_contract_must_remain');
assert.match(publicServer, /PUBLIC_READ_ONLY/, 'public_mcp_authority_must_remain_read_only');
assert.doesNotMatch(publicRoute, /authenticatedGovernedMachineAdapter|authorizeExternalRequest|executeManualCognitiveAgent/, 'public_mcp_must_not_inherit_authenticated_execution');
assert.doesNotMatch(publicServer, /invoke_cognitive_capability|SFI_MACHINE_AUTHORIZATION_RESERVED/, 'public_tool_catalog_must_not_gain_execution');

const manifestVersion = manifest.match(/version:\s*'(\d+\.\d+\.\d+)'/)?.[1] ?? null;
assert.ok(manifestVersion, 'manifest_semver_required');
const [manifestMajor, manifestMinor] = manifestVersion.split('.').map(Number);
assert.ok(manifestMajor > 1 || (manifestMajor === 1 && manifestMinor >= 13), 'manifest_version_must_not_regress_below_r4c');
assert.match(manifest, /authenticatedMcp: '\/api\/mcp\/authenticated'/, 'manifest_must_discover_authenticated_mcp');
assert.match(manifest, /SFI-AUTHENTICATED-GOVERNED-MACHINE-ADAPTER-1\.0/, 'manifest_contract_required');
assert.match(manifest, /SFI-CHATGPT-INSTITUTIONAL-CONTEXT-1\.0/, 'manifest_must_declare_institutional_context_resource');
assert.match(manifest, /externalRegistryReceipt: null/, 'manifest_must_not_fabricate_external_registry_receipt');
assert.match(manifest, /claimedPublished: false/, 'manifest_must_not_claim_external_publication');

// MCP remains live, but it is not part of the GPT Actions OpenAPI contract.
assert.match(openapiMerge, /delete api\.paths\['\/api\/mcp\/authenticated'\]/, 'gpt_actions_openapi_must_exclude_authenticated_mcp');
assert.match(openapiMerge, /openApiExposure: 'OUT_OF_BAND_MCP'/, 'mcp_must_be_documented_as_out_of_band');
assert.match(openapiMerge, /gptActionsSchema: '\/openapi\.json'/, 'canonical_openapi_must_be_gpt_actions_schema');
assert.match(openapiMerge, /oauthSecurityDeclared/, 'canonical_openapi_must_keep_oauth_declaration');
assert.match(openapiMerge, /parameter\?\.in !== 'header'/, 'gpt_actions_openapi_must_exclude_custom_header_parameters');
assert.match(openapiMerge, /externalPublicationReceipt: null/, 'openapi_must_not_fabricate_external_publication');
assert.doesNotMatch(openapiMerge, /openapi-actions\.json/, 'second_actions_projection_must_not_exist');
assert.match(hostBoundOpenapi, /authorizationCode\.authorizationUrl/, 'host_bound_openapi_must_bind_oauth_authorization_url');
assert.match(hostBoundOpenapi, /authorizationCode\.tokenUrl/, 'host_bound_openapi_must_bind_oauth_token_url');
assert.match(packageJson, /merge-openapi-authenticated-machine\.mjs/, 'production_build_must_finalize_canonical_actions_openapi');

assert.match(grantOwner, /export const SFI_CAPABILITY_GRANT_CONTRACT = 'SFI-CAPABILITY-GRANT-1\.0'/, 'grant_owner_must_remain_ws01');
assert.match(brokerOwner, /CAPABILITY_REQUEST_IS_NOT_AUTHORIZATION/, 'broker_admit_must_remain_non-authorizing');
assert.doesNotMatch(adapter, /SFI_CAPABILITY_GRANT_CONTRACT\s*=/, 'ws04_must_not_redeclare_grant_contract');

console.log(JSON.stringify({
  ok: true,
  gate: 'SFI_AUTHENTICATED_GOVERNED_MACHINE_R4C',
  manifestVersion,
  gptActionsOpenApi: '/openapi.json',
  authenticatedMcpOpenApiExposure: 'OUT_OF_BAND_MCP',
}, null, 2));
