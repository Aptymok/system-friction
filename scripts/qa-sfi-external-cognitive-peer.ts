import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function text(path: string) {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
}

const policy = text('src/lib/sfi/externalCognitivePeer.ts');
const route = text('src/app/api/external/v1/cognitive-peer/route.ts');
const bootstrap = text('src/app/api/external/v1/bootstrap/route.ts');
const manifest = text('src/app/api/external/v1/manifest/route.ts');
const projection = text('src/lib/mcp/authenticatedGatewayProjection.ts');
const publicMcp = text('src/lib/mcp/publicMcpServer.ts');

assert.match(policy, /SFI-EXTERNAL-COGNITIVE-PEER-1\.0/, 'peer_contract_required');
assert.match(policy, /persistedEpistemicClass: 'INFERRED'/, 'peer_output_must_be_inferred');
assert.match(policy, /MINT_OBSERVED_RETURN/, 'peer_return_prohibition_required');
assert.match(policy, /MINT_TRUTH_CLAIM/, 'peer_truth_prohibition_required');
assert.match(policy, /MAKE_GOVERNANCE_DECISION/, 'peer_governance_prohibition_required');
assert.match(policy, /ISSUE_CAPABILITY_GRANT/, 'peer_grant_prohibition_required');
assert.match(policy, /PROMOTE_CANON/, 'peer_canon_prohibition_required');
assert.match(policy, /findForbiddenCognitivePeerKey/, 'peer_forbidden_key_gate_required');

assert.match(route, /authorizeExternalRequest\(req, 'observe'\)/, 'peer_context_requires_observe');
assert.match(route, /authorizeExternalRequest\(req, 'lab:write'\)/, 'peer_submit_requires_lab_write');
assert.match(route, /institutional_user_bound_oauth_required/, 'peer_requires_institutional_user_bound_oauth');
assert.match(route, /buildSfiCognitiveBootstrap/, 'peer_context_must_reuse_governed_bootstrap');
assert.match(route, /eventName: 'SFI_EXTERNAL_COGNITIVE_PEER_RESPONSE_RECEIVED'/, 'peer_response_event_required');
assert.match(route, /epistemicClass: 'inferred'/, 'peer_event_must_be_inferred');
assert.match(route, /acceptedEvidenceCreated: false/, 'peer_must_not_admit_evidence');
assert.match(route, /observedReturnCreated: false/, 'peer_must_not_mint_return');
assert.match(route, /governanceDecisionCreated: false/, 'peer_must_not_govern');
assert.match(route, /executionAuthorized: false/, 'peer_must_not_authorize_execution');
assert.match(route, /learningPromoted: false/, 'peer_must_not_promote_learning');
assert.match(route, /canonPromoted: false/, 'peer_must_not_promote_canon');
assert.doesNotMatch(route, /epistemicClass: 'observed'/, 'peer_route_must_not_write_observed');
assert.doesNotMatch(route, /decideSfiGovernanceProposal|executeAuthorizedSfiAction|recordSfiProposalReturn/, 'peer_route_must_not_call_sovereign_or_return_owners');

assert.match(bootstrap, /externalCognitivePeer:/, 'bootstrap_must_advertise_peer');
assert.match(bootstrap, /getSfiExternalCognitivePeerContext/, 'bootstrap_peer_context_operation_required');
assert.match(bootstrap, /submitSfiExternalCognitivePeerResponse/, 'bootstrap_peer_submit_operation_required');
assert.match(bootstrap, /mayMintReturn: false/, 'bootstrap_must_preserve_return_boundary');
assert.match(bootstrap, /mayPromoteCanon: false/, 'bootstrap_must_preserve_canon_boundary');

assert.match(manifest, /cognitivePeer: '\/api\/external\/v1\/cognitive-peer'/, 'manifest_peer_discovery_required');
assert.match(manifest, /external-cognitive-peer-context/, 'manifest_peer_context_required');
assert.match(manifest, /external-cognitive-peer-submit/, 'manifest_peer_submit_required');

assert.match(projection, /operationId: 'getSfiExternalCognitivePeerContext'[\s\S]*scope: 'observe'/, 'mcp_peer_context_scope_required');
assert.match(projection, /operationId: 'submitSfiExternalCognitivePeerResponse'[\s\S]*scope: 'lab:write'/, 'mcp_peer_submit_scope_required');
assert.doesNotMatch(publicMcp, /getSfiExternalCognitivePeerContext|submitSfiExternalCognitivePeerResponse/, 'public_mcp_must_not_expose_peer_mutation');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-EXTERNAL-COGNITIVE-PEER-QA-1.0',
  contextScope: 'observe',
  submitScope: 'lab:write',
  persistedClass: 'INFERRED',
  publicMcpExposure: false,
  authorityExpansion: false,
  returnMinting: false,
  canonicalPromotion: false,
}, null, 2));
