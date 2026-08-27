import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function text(path: string) {
  return readFileSync(path, 'utf8');
}

const authorize = text('src/app/api/oauth/authorize/route.ts');
const token = text('src/app/api/oauth/token/route.ts');
const externalAuth = text('src/lib/sfi/externalAuth.ts');
const sessionToken = text('src/lib/sfi/externalSessionToken.ts');
const login = text('src/components/sfi/LoginSurface.tsx');
const migration = text('supabase/migrations/20260822214500_create_sfi_oauth_authorization_codes.sql');
const openapi = JSON.parse(text('public/openapi.json')) as Record<string, any>;
const members = text('src/lib/system/access/institutionalMembers.ts');
const manifest = text('src/app/api/external/v1/manifest/route.ts');
const consoleRoute = text('src/app/api/external/v1/console/route.ts');
const studioRoute = text('src/app/api/external/v1/studio/route.ts');
const lab = text('src/app/api/external/v1/lab/route.ts');
const execute = text('src/app/api/external/v1/execute/route.ts');
const proposalReturn = text('src/app/api/external/v1/proposal-return/route.ts');
const outcomeRoute = text('src/app/api/acp/proposals/[id]/outcome/route.ts');
const outcomeWriter = text('src/lib/governance/proposalOutcome.ts');
const llms = text('src/app/llms.txt/route.ts');
const aiIndex = text('src/app/ai-index.json/route.ts');

assert.match(authorize, /requireSfiMember\(\)/, 'oauth_authorize_must_bind_to_authenticated_sfi_member');
assert.match(authorize, /DEFAULT_SCOPES = \['observe', 'propose', 'lab:read'\]/, 'generic_oauth_fallback_must_remain_bounded');
assert.match(authorize, /context\.member\?\.external\?\.scopes/, 'registered_member_oauth_scopes_must_be_explicit');
assert.match(authorize, /explicitlyRequestedScopes \?\? \[\.\.\.allowedScopes\]/, 'omitted_scope_must_default_to_principal_configured_scopes');
assert.match(authorize, /context\.member\?\.external\?\.role/, 'registered_member_external_role_must_be_explicit');
assert.match(authorize, /moduleAccess\.evidence_write === true/, 'legacy_evidence_write_capability_must_remain_explicit');
assert.match(authorize, /allowedScopes\.add\('lab:write'\)/, 'legacy_evidence_writer_may_receive_lab_write');
assert.match(authorize, /'studio:read'/, 'oauth_authorize_must_support_studio_read_scope');
assert.match(authorize, /'studio:content'/, 'oauth_authorize_must_support_studio_content_scope');
assert.match(authorize, /'studio:run'/, 'oauth_authorize_must_support_studio_run_scope');
assert.match(authorize, /codeHash\(code\)/, 'authorization_code_must_be_stored_as_hash');
assert.match(authorize, /code_challenge/, 'oauth_authorize_must_support_pkce');

assert.match(token, /grantType !== 'authorization_code'/, 'token_endpoint_must_reject_other_grants');
assert.match(token, /is\('consumed_at', null\)/, 'authorization_code_must_be_single_use');
assert.match(token, /PKCE verification failed/, 'token_exchange_must_verify_pkce_when_present');
assert.match(token, /mintExternalAccessToken/, 'token_exchange_must_issue_sfi_access_token');

assert.match(externalAuth, /verifyExternalAccessToken\(token\)/, 'external_gateway_must_accept_user_bound_oauth_tokens');
assert.match(externalAuth, /authMethod: 'oauth'/, 'oauth_principal_must_be_auditable');
assert.match(externalAuth, /authMethod: 'static_token'/, 'static_token_backward_compatibility_must_remain');

assert.match(sessionToken, /createHmac\('sha256'/, 'access_tokens_must_be_signed');
assert.match(sessionToken, /exp <= now/, 'access_tokens_must_expire');
assert.match(sessionToken, /aud: 'sfi-external-v1'/, 'access_token_audience_must_be_bound');

assert.match(login, /safeNextPath/, 'login_must_preserve_oauth_return_path');
assert.match(login, /!candidate\.startsWith\('\/\/'\)/, 'login_return_path_must_reject_protocol_relative_redirects');

assert.match(migration, /enable row level security/i, 'oauth_code_table_must_enable_rls');
assert.match(migration, /code_hash text not null unique/i, 'oauth_codes_must_not_be_stored_in_plaintext');
assert.match(migration, /consumed_at timestamptz/i, 'oauth_codes_must_track_consumption');

assert.equal(openapi.info?.version, '1.7.0', 'openapi_version_must_track_owner_scoped_studio_oauth');
assert.equal(openapi.components?.securitySchemes?.sfiOAuth?.type, 'oauth2', 'openapi_must_publish_oauth2');
assert.equal(openapi.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.authorizationUrl, 'https://systemfriction.org/api/oauth/authorize', 'openapi_authorization_url_must_be_canonical');
assert.equal(openapi.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.tokenUrl, 'https://systemfriction.org/api/oauth/token', 'openapi_token_url_must_be_canonical');
assert.match(String(openapi.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.scopes?.['lab:run'] || ''), /explicitly granted/, 'openapi_lab_run_must_describe_explicit_principal_grant');
assert.ok(openapi.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.scopes?.['studio:read'], 'openapi_must_publish_studio_read_scope');
assert.ok(openapi.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.scopes?.['studio:content'], 'openapi_must_publish_studio_content_scope');
assert.ok(openapi.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.scopes?.['studio:run'], 'openapi_must_publish_studio_run_scope');
assert.ok(openapi.paths?.['/api/external/v1/studio']?.post, 'openapi_must_publish_external_studio_route');

assert.match(members, /email: 'edwin\.tzolkin@gmail\.com'/, 'edwin_must_resolve_through_existing_institutional_identity');
assert.match(members, /displayName: 'Edwin'[\s\S]*?role: 'observer'/, 'edwin_root_observation_role_must_remain_non_sovereign');
assert.match(members, /role: 'institutional_operator'/, 'edwin_external_agent_role_must_be_operational');
for (const scope of ['observe', 'propose', 'execute', 'lab:read', 'lab:write', 'lab:run', 'studio:read', 'studio:content', 'studio:run']) {
  assert.match(members, new RegExp(`'${scope.replace(':', '\\:')}'`), `edwin_oauth_scope_missing:${scope}`);
}

assert.match(consoleRoute, /credential\.subjectId/, 'oauth_console_must_bind_studio_discovery_to_token_subject');
assert.match(consoleRoute, /\.eq\('owner_id', credential\.subjectId\)/, 'oauth_console_must_filter_studio_objects_by_authenticated_subject_owner_id');
assert.match(consoleRoute, /ownershipBoundary: 'studio_objects\.owner_id == OAuth subjectId'/, 'oauth_console_must_publish_owner_boundary');
assert.doesNotMatch(consoleRoute, /\.eq\('owner_id', actorId\)/, 'studio_ownership_must_never_use_display_actor_id');
assert.match(consoleRoute, /raw media is not exposed here/, 'oauth_console_must_not_turn_owner_index_into_raw_media_exposure');

assert.match(studioRoute, /authorizeExternalRequest\(req, scope\)/, 'external_studio_must_require_operation_scope');
assert.match(studioRoute, /cred\.authMethod !== 'oauth'/, 'external_studio_must_reject_shared_static_tokens');
assert.match(studioRoute, /!cred\.subjectId/, 'external_studio_must_require_user_bound_subject');
assert.match(studioRoute, /const ownerId = cred\.subjectId/, 'external_studio_owner_must_derive_from_oauth_subject');
assert.match(studioRoute, /listStudioObjects\(ownerId\)/, 'external_studio_list_must_be_owner_scoped');
assert.match(studioRoute, /getStudioObject\(objectId, ownerId\)/, 'external_studio_object_operations_must_be_owner_scoped');
assert.match(studioRoute, /createStudioContentSignedUrl\(objectId, 120\)/, 'external_studio_content_must_be_short_lived');
assert.match(studioRoute, /analyzeStudioAudioObject/, 'external_studio_must_expose_existing_audio_engine');
assert.match(studioRoute, /analyzeStudioVideo/, 'external_studio_must_expose_existing_video_engine');
assert.doesNotMatch(studioRoute, /requireFounder|root_delegate/, 'external_studio_owner_operations_must_not_require_root_sovereignty');

assert.match(lab, /return 'lab:run'/, 'lab_run_operation_must_require_lab_run_scope');
assert.match(lab, /authorizeExternalRequest\(req, operationScope\(operation\)\)/, 'lab_must_authorize_by_operation_scope');
assert.doesNotMatch(lab, /root_delegate_required_for_lab_runtime/, 'lab_run_scope_must_not_be_shadowed_by_hidden_root_role_gate');
assert.match(lab, /explicit_runtime_confirmation_required/, 'lab_runtime_must_still_require_explicit_confirmation');
assert.match(lab, /protocolId_and_persisted_evidenceIds_required/, 'lab_runtime_must_still_require_supported_protocol_and_evidence');

assert.match(execute, /authorizeExternalRequest\(req, 'execute'\)/, 'execute_gate_must_keep_execute_scope');
assert.match(execute, /body\.confirm !== true/, 'execute_gate_must_require_explicit_confirmation');
assert.match(execute, /dispatchQueuedProposal\(proposalId\)/, 'execute_gate_must_use_canonical_governed_dispatcher');
assert.match(execute, /proposalMustAlreadyBeQueued: true/, 'execute_gate_must_preserve_prior_governance');
assert.match(execute, /scopeExpansionAllowed: false/, 'execute_gate_must_not_expand_scope');
assert.match(execute, /canonicalPromotionAllowed: false/, 'execute_gate_must_not_promote_canon');
assert.doesNotMatch(execute, /\.update\(\{\s*status:\s*'accepted'/, 'generic_execute_must_not_mark_proposal_accepted');
assert.doesNotMatch(execute, /executed_at:\s*now/, 'generic_execute_must_not_write_executed_at_column');
assert.doesNotMatch(execute, /\.from\('action_proposals'\)\.update/, 'generic_execute_must_not_become_parallel_proposal_writer');

assert.match(proposalReturn, /authorizeExternalRequest\(req, 'execute'\)/, 'proposal_return_must_require_execute_scope');
assert.match(proposalReturn, /queued_proposal_required_for_return/, 'proposal_return_must_require_queued_proposal');
assert.match(proposalReturn, /evidence_refs/, 'proposal_return_must_require_evidence_refs');
assert.match(proposalReturn, /eventName: 'SFI_PROPOSAL_RETURN_RECORDED'/, 'proposal_return_must_write_dedicated_return_event');
assert.match(proposalReturn, /epistemicClass: 'observed'/, 'proposal_return_must_preserve_observed_return_class');
assert.match(proposalReturn, /lineage: \[proposalId, \.\.\.evidenceRefs\]/, 'proposal_return_lineage_must_anchor_proposal_uuid_and_evidence');
assert.match(proposalReturn, /proposalStatusChanged: false/, 'recording_return_must_not_close_proposal');
assert.match(proposalReturn, /executionDispatchedBySfi: false/, 'external_return_route_must_not_claim_it_dispatched_external_work');
assert.match(proposalReturn, /canonicalPromotionAllowed: false/, 'recording_return_must_not_canonize');

assert.match(outcomeRoute, /recordProposalOutcomeFromObservedReturn/, 'outcome_route_must_delegate_to_single_writer');
assert.match(outcomeWriter, /returnBelongsToProposal/, 'outcome_writer_must_validate_return_lineage');
assert.match(outcomeWriter, /return_event_proposal_mismatch/, 'mismatched_return_must_fail_closed');
assert.match(outcomeWriter, /SFI_PROPOSAL_RETURN_RECORDED/, 'outcome_writer_must_accept_proposal_scoped_return_contract');
assert.match(outcomeWriter, /PENDING_REALITY_CALIBRATION/, 'outcome_writer_must_leave_calibration_pending');
assert.match(outcomeWriter, /CANDIDATE_UNTIL_CALIBRATED/, 'learning_must_remain_candidate_until_calibrated');

assert.match(manifest, /version: '1\.7\.0'/, 'external_manifest_version_must_reflect_owner_scoped_studio_oauth');
assert.match(manifest, /Scope omission defaults to that configured set/, 'manifest_must_explain_principal_configured_scope_default');
assert.match(manifest, /explicit lab:run scope/, 'manifest_must_explain_lab_run_scope_authority');
assert.match(manifest, /studioIdentityBoundary/, 'manifest_must_publish_studio_identity_boundary');
assert.match(manifest, /id: 'studio-analyze'/, 'manifest_must_publish_studio_analyze');
assert.match(manifest, /id: 'proposal-return'/, 'manifest_must_publish_proposal_return');
assert.match(manifest, /dispatches the same governed router used after authorization/, 'manifest_must_describe_governed_execute_dispatch');
assert.match(llms, /\/execute dispatches only a proposal that is already queued/, 'llms_must_explain_post_authorization_dispatch');
assert.match(llms, /\/proposal-return/, 'llms_must_publish_proposal_return');
assert.match(aiIndex, /queued_internal_auto_dispatch: true/, 'ai_index_must_publish_bounded_internal_auto_dispatch');
assert.match(aiIndex, /external_action_without_adapter: 'fail_closed'/, 'ai_index_must_publish_external_fail_closed_boundary');
assert.match(aiIndex, /return_must_match_proposal_uuid: true/, 'ai_index_must_publish_return_lineage_requirement');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-EXTERNAL-OAUTH-1.6',
  flow: 'authorization_code',
  pkce: 'S256',
  genericFallbackScopes: ['observe', 'propose', 'lab:read'],
  edwinExternalRole: 'institutional_operator',
  edwinExternalScopes: ['observe', 'propose', 'execute', 'lab:read', 'lab:write', 'lab:run', 'studio:read', 'studio:content', 'studio:run'],
  studioBoundary: 'OAuth subjectId == studio_objects.owner_id',
  studioSupportedExternalAnalyzers: ['audio', 'video'],
  staticTokenCompatibility: true,
  sovereigntyBoundary: {
    evidenceCandidateAcceptance: 'ROOT',
    proposalApproval: 'ROOT',
    canonicalPromotion: 'ROOT',
    labRunAuthority: 'explicit_lab_run_scope',
  },
  executionBoundary: {
    queuedInternalAutoDispatch: true,
    externalActionWithoutAdapter: 'fail_closed',
    genericExecuteWritesExecutedAt: false,
    proposalScopedObservedReturn: true,
    returnMustMatchProposalUuid: true,
    canonicalPromotionRemainsSeparate: true,
  },
}, null, 2));
