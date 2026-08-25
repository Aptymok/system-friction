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
const execute = text('src/app/api/external/v1/execute/route.ts');
const proposalReturn = text('src/app/api/external/v1/proposal-return/route.ts');
const outcomeRoute = text('src/app/api/acp/proposals/[id]/outcome/route.ts');
const outcomeWriter = text('src/lib/governance/proposalOutcome.ts');
const llms = text('src/app/llms.txt/route.ts');
const aiIndex = text('src/app/ai-index.json/route.ts');

assert.match(authorize, /requireSfiMember\(\)/, 'oauth_authorize_must_bind_to_authenticated_sfi_member');
assert.match(authorize, /DEFAULT_SCOPES = \['observe', 'propose', 'lab:read'\]/, 'default_non_root_oauth_scopes_must_be_bounded');
assert.match(authorize, /moduleAccess\.evidence_write === true/, 'evidence_write_capability_must_be_explicit');
assert.match(authorize, /allowedScopes\.add\('lab:write'\)/, 'evidence_writer_may_receive_lab_write');
assert.match(authorize, /rootDelegate \? 'root_delegate' : evidenceWriter \? 'evidence_writer' : 'agent'/, 'root_delegate_must_not_be_default');
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

assert.equal(openapi.components?.securitySchemes?.sfiOAuth?.type, 'oauth2', 'openapi_must_publish_oauth2');
assert.equal(
  openapi.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.authorizationUrl,
  'https://systemfriction.org/api/oauth/authorize',
  'openapi_authorization_url_must_be_canonical',
);
assert.equal(
  openapi.components?.securitySchemes?.sfiOAuth?.flows?.authorizationCode?.tokenUrl,
  'https://systemfriction.org/api/oauth/token',
  'openapi_token_url_must_be_canonical',
);

assert.match(members, /email: 'edwin\.tzolkin@gmail\.com'/, 'edwin_must_resolve_through_existing_institutional_identity');
assert.match(members, /displayName: 'Edwin'[\s\S]*?role: 'observer'/, 'edwin_must_not_inherit_root_delegate_from_oauth');

// Generic execute now delegates only already-authorized queued work to the canonical governed router.
assert.match(execute, /authorizeExternalRequest\(req, 'execute'\)/, 'execute_gate_must_keep_execute_scope');
assert.match(execute, /body\.confirm !== true/, 'execute_gate_must_require_explicit_confirmation');
assert.match(execute, /dispatchQueuedProposal\(proposalId\)/, 'execute_gate_must_use_canonical_governed_dispatcher');
assert.match(execute, /proposalMustAlreadyBeQueued: true/, 'execute_gate_must_preserve_prior_governance');
assert.match(execute, /scopeExpansionAllowed: false/, 'execute_gate_must_not_expand_scope');
assert.match(execute, /canonicalPromotionAllowed: false/, 'execute_gate_must_not_promote_canon');
assert.doesNotMatch(execute, /\.update\(\{\s*status:\s*'accepted'/, 'generic_execute_must_not_mark_proposal_accepted');
assert.doesNotMatch(execute, /executed_at:\s*now/, 'generic_execute_must_not_write_executed_at_column');
assert.doesNotMatch(execute, /\.from\('action_proposals'\)\.update/, 'generic_execute_must_not_become_parallel_proposal_writer');

// A real external executor may still return evidence against a queued UUID without closing or canonizing it.
assert.match(proposalReturn, /authorizeExternalRequest\(req, 'execute'\)/, 'proposal_return_must_require_execute_scope');
assert.match(proposalReturn, /queued_proposal_required_for_return/, 'proposal_return_must_require_queued_proposal');
assert.match(proposalReturn, /evidence_refs/, 'proposal_return_must_require_evidence_refs');
assert.match(proposalReturn, /eventName: 'SFI_PROPOSAL_RETURN_RECORDED'/, 'proposal_return_must_write_dedicated_return_event');
assert.match(proposalReturn, /epistemicClass: 'observed'/, 'proposal_return_must_preserve_observed_return_class');
assert.match(proposalReturn, /lineage: \[proposalId, \.\.\.evidenceRefs\]/, 'proposal_return_lineage_must_anchor_proposal_uuid_and_evidence');
assert.match(proposalReturn, /proposalStatusChanged: false/, 'recording_return_must_not_close_proposal');
assert.match(proposalReturn, /executionDispatchedBySfi: false/, 'external_return_route_must_not_claim_it_dispatched_external_work');
assert.match(proposalReturn, /canonicalPromotionAllowed: false/, 'recording_return_must_not_canonize');

// The route delegates closure to the single outcome writer; the writer owns observed RETURN lineage validation.
assert.match(outcomeRoute, /recordProposalOutcomeFromObservedReturn/, 'outcome_route_must_delegate_to_single_writer');
assert.match(outcomeWriter, /returnBelongsToProposal/, 'outcome_writer_must_validate_return_lineage');
assert.match(outcomeWriter, /return_event_proposal_mismatch/, 'mismatched_return_must_fail_closed');
assert.match(outcomeWriter, /SFI_PROPOSAL_RETURN_RECORDED/, 'outcome_writer_must_accept_proposal_scoped_return_contract');
assert.match(outcomeWriter, /PENDING_REALITY_CALIBRATION/, 'outcome_writer_must_leave_calibration_pending');
assert.match(outcomeWriter, /CANDIDATE_UNTIL_CALIBRATED/, 'learning_must_remain_candidate_until_calibrated');

assert.match(manifest, /version: '1\.6\.3'/, 'external_manifest_version_must_reflect_return_lineage_contract');
assert.match(manifest, /id: 'proposal-return'/, 'manifest_must_publish_proposal_return');
assert.match(manifest, /dispatches the same governed router used after authorization/, 'manifest_must_describe_governed_execute_dispatch');
assert.match(llms, /\/execute dispatches only a proposal that is already queued/, 'llms_must_explain_post_authorization_dispatch');
assert.match(llms, /\/proposal-return/, 'llms_must_publish_proposal_return');
assert.match(aiIndex, /queued_internal_auto_dispatch: true/, 'ai_index_must_publish_bounded_internal_auto_dispatch');
assert.match(aiIndex, /external_action_without_adapter: 'fail_closed'/, 'ai_index_must_publish_external_fail_closed_boundary');
assert.match(aiIndex, /return_must_match_proposal_uuid: true/, 'ai_index_must_publish_return_lineage_requirement');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-EXTERNAL-OAUTH-1.3',
  flow: 'authorization_code',
  pkce: 'S256',
  defaultNonRootScopes: ['observe', 'propose', 'lab:read'],
  evidenceWriterAdditionalScopes: ['lab:write'],
  rootOnlyScopes: ['execute', 'lab:run'],
  staticTokenCompatibility: true,
  executionBoundary: {
    queuedInternalAutoDispatch: true,
    externalActionWithoutAdapter: 'fail_closed',
    genericExecuteWritesExecutedAt: false,
    proposalScopedObservedReturn: true,
    returnMustMatchProposalUuid: true,
    canonicalPromotionRemainsSeparate: true,
  },
}, null, 2));
