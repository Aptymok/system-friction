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
const outcome = text('src/app/api/acp/proposals/[id]/outcome/route.ts');
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

// Generic execute is now a fail-closed capability gate, not a hidden executed_at mutation.
assert.match(execute, /authorizeExternalRequest\(req, 'execute'\)/, 'execute_gate_must_keep_execute_scope');
assert.match(execute, /\.eq\('status', 'queued'\)/, 'execute_gate_must_require_queued_governance_state');
assert.match(execute, /execution_adapter_required/, 'execute_gate_must_fail_closed_without_adapter');
assert.match(execute, /execution_dispatch_not_implemented/, 'execute_gate_must_refuse_generic_dispatch_even_when_adapter_is_declared');
assert.match(execute, /mutated: false/, 'generic_execute_must_report_no_mutation');
assert.match(execute, /executedAtWritten: false/, 'generic_execute_must_not_write_executed_at');
assert.doesNotMatch(execute, /\.update\(\{\s*status:\s*'accepted'/, 'generic_execute_must_not_mark_proposal_accepted');
assert.doesNotMatch(execute, /executed_at:\s*now/, 'generic_execute_must_not_write_executed_at_column');

// A real executor may return evidence against a queued UUID without closing or canonizing it.
assert.match(proposalReturn, /authorizeExternalRequest\(req, 'execute'\)/, 'proposal_return_must_require_execute_scope');
assert.match(proposalReturn, /queued_proposal_required_for_return/, 'proposal_return_must_require_queued_proposal');
assert.match(proposalReturn, /evidence_refs/, 'proposal_return_must_require_evidence_refs');
assert.match(proposalReturn, /eventName: 'SFI_PROPOSAL_RETURN_RECORDED'/, 'proposal_return_must_write_dedicated_return_event');
assert.match(proposalReturn, /epistemicClass: 'observed'/, 'proposal_return_must_preserve_observed_return_class');
assert.match(proposalReturn, /lineage: \[proposalId, \.\.\.evidenceRefs\]/, 'proposal_return_lineage_must_anchor_proposal_uuid_and_evidence');
assert.match(proposalReturn, /proposalStatusChanged: false/, 'recording_return_must_not_close_proposal');
assert.match(proposalReturn, /executionDispatchedBySfi: false/, 'recording_return_must_not_claim_sfi_dispatch');
assert.match(proposalReturn, /canonicalPromotionAllowed: false/, 'recording_return_must_not_canonize');

// ROOT outcome closure must verify that the observed RETURN belongs to the same proposal.
assert.match(outcome, /returnBelongsToProposal/, 'outcome_must_validate_return_lineage');
assert.match(outcome, /return_event_proposal_mismatch/, 'mismatched_return_must_fail_closed');
assert.match(outcome, /SFI_PROPOSAL_RETURN_RECORDED/, 'outcome_must_accept_proposal_scoped_return_contract');
assert.match(outcome, /PENDING_REALITY_CALIBRATION/, 'outcome_must_leave_calibration_pending');
assert.match(outcome, /CANDIDATE_UNTIL_CALIBRATED/, 'learning_must_remain_candidate_until_calibration');

assert.match(manifest, /version: '1\.6\.3'/, 'external_manifest_version_must_reflect_return_lineage_contract');
assert.match(manifest, /id: 'proposal-return'/, 'manifest_must_publish_proposal_return');
assert.match(manifest, /does not dispatch, write executed_at, or mark accepted/, 'manifest_must_describe_truthful_execute_gate');
assert.match(llms, /execution_adapter_required/, 'llms_must_not_tell_agents_generic_execute_performs_work');
assert.match(llms, /\/proposal-return/, 'llms_must_publish_proposal_return');
assert.match(aiIndex, /generic_auto_dispatch: false/, 'ai_index_must_publish_auto_dispatch_off');
assert.match(aiIndex, /return_must_match_proposal_uuid: true/, 'ai_index_must_publish_return_lineage_requirement');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-EXTERNAL-OAUTH-1.2',
  flow: 'authorization_code',
  pkce: 'S256',
  defaultNonRootScopes: ['observe', 'propose', 'lab:read'],
  evidenceWriterAdditionalScopes: ['lab:write'],
  rootOnlyScopes: ['execute', 'lab:run'],
  staticTokenCompatibility: true,
  executionBoundary: {
    genericAutoDispatch: false,
    genericExecuteWritesExecutedAt: false,
    proposalScopedObservedReturn: true,
    returnMustMatchProposalUuid: true,
    canonicalPromotionRemainsSeparate: true,
  },
}, null, 2));
