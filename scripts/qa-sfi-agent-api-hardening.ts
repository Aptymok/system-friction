import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '../src/lib/sfi/cognitive-runtime/convergedRegistry';
import {
  executionContractForAgent,
  listExecutionContracts,
  normalizeExecutionRequest,
  validateExecutionRequest,
} from '../src/lib/sfi/cognitive-runtime/executionContracts';

const read = (path: string) => readFileSync(path, 'utf8');

const externalRoute = read('src/app/api/external/v1/cognitive-runtime/route.ts');
const rootRoute = read('src/app/api/root/cognitive-runtime/route.ts');
const sharedExecution = read('src/lib/sfi/cognitive-runtime/manualExecution.ts');
const runtimeWriter = read('src/lib/sfi/cognitive-runtime/runtimeAgentExecutor.ts');
const externalAuth = read('src/lib/sfi/externalAuth.ts');
const oauthConfig = read('src/lib/sfi/oauthConfig.ts');
const manifest = read('src/app/api/external/v1/manifest/route.ts');
const openapiMerge = read('scripts/merge-openapi-cases.mjs');
const oauthClientsMigration = read('supabase/migrations/20260827220000_sfi_oauth_client_registry.sql');
const oauthCodesMigration = read('supabase/migrations/20260822214500_create_sfi_oauth_authorization_codes.sql');
const caseMigration = read('supabase/migrations/20260816124000_sfi_case_platform_operational_v1.sql');
const projectMigration = read('supabase/migrations/20260902010000_sfi_final_operating_form.sql');
const actionMigration = read('supabase/migrations/20260816140000_sfi_case_governed_action_v1.sql');
const deploymentWorkflow = read('.github/workflows/sfi-vercel-prebuilt-production.yml');

// Contract plane remains single and complete.
const contracts = listExecutionContracts();
const agentIds = [...new Set(SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((agent) => agent.id))].sort();
const contractIds = [...new Set(contracts.map((contract) => contract.agentId))].sort();
assert.deepEqual(contractIds, agentIds, 'm6_every_agent_must_still_resolve_to_one_execution_contract');
assert.equal(contracts.length, agentIds.length, 'm6_execution_contract_catalog_must_not_duplicate_agents');
const crossImpact = executionContractForAgent('cross_impact');
assert.ok(crossImpact, 'm6_cross_impact_contract_missing');
assert.equal(crossImpact.minTargets, 2, 'm6_cross_impact_must_keep_two_target_minimum');

// External API reuses canonical owners; it does not become a second runtime or storage layer.
assert.match(externalRoute, /SFI-EXTERNAL-COGNITIVE-RUNTIME-1\.0/);
assert.match(externalRoute, /authorizeExternalRequest\(request, 'observe'\)/);
assert.match(externalRoute, /authorizeExternalRequest\(request, 'execute'\)/);
assert.match(externalRoute, /readAgentExecutionStates/);
assert.match(externalRoute, /readExecutionRecords/);
assert.match(externalRoute, /readGenAiAssuranceMetrics/);
assert.match(externalRoute, /executeManualCognitiveAgent/);
assert.match(externalRoute, /credential\.authMethod !== 'oauth'/, 'm6_execution_must_require_user_bound_oauth');
assert.match(externalRoute, /credential\.tenantId !== 'sfi'/, 'm6_execution_must_require_institutional_tenant');
assert.match(externalRoute, /allowLegacyCompatibility: false/, 'm6_external_execution_must_reject_legacy_shape');
assert.match(externalRoute, /executionScopeImpliesApproval: false/);
assert.match(externalRoute, /executionScopeImpliesCanonicalPromotion: false/);
assert.doesNotMatch(externalRoute, /createServiceSupabaseClient|\.from\s*\(/, 'm6_external_adapter_must_not_own_database_reads_or_writes');
assert.doesNotMatch(externalRoute, /recordAgentExecutionEvent|appendEpistemicEvent|persistSFIEvent/, 'm6_external_adapter_must_not_own_event_writes');

// ROOT and external execution now converge before the canonical runtime writer.
assert.match(rootRoute, /executeManualCognitiveAgent/);
assert.doesNotMatch(rootRoute, /runCognitiveAgent|createServiceSupabaseClient|\.from\s*\(/, 'm6_root_route_must_delegate_instead_of_duplicate_execution');
assert.match(sharedExecution, /SFI-MANUAL-COGNITIVE-EXECUTION-1\.0/);
assert.match(sharedExecution, /normalizeExecutionRequest/);
assert.match(sharedExecution, /validateExecutionRequest/);
assert.match(sharedExecution, /runCognitiveAgent/);
assert.match(sharedExecution, /TARGET_CONTEXT_NOT_AUTOMATICALLY_ACCEPTED_EVIDENCE/);
assert.match(sharedExecution, /SOURCE_CANDIDATE_NOT_ACCEPTED_EVIDENCE/);
assert.match(sharedExecution, /observedInputTokens/);
assert.match(sharedExecution, /observedOutputTokens/);
assert.match(sharedExecution, /observedProviderCost/);
assert.match(sharedExecution, /observedLatencyMs/);
assert.doesNotMatch(sharedExecution, /recordAgentExecutionEvent|appendEpistemicEvent|persistSFIEvent|create table/i, 'm6_shared_execution_must_reuse_canonical_writer_and_schema');
assert.match(runtimeWriter, /executionRequestSource/);
assert.match(runtimeWriter, /requestSource:\s*metadata\.executionRequestSource/);

// Existing personal OAuth route allowlist is not expanded into institutional cognitive execution.
assert.doesNotMatch(externalAuth, /pathname === ['"]\/api\/external\/v1\/cognitive-runtime['"]/, 'm6_personal_oauth_must_not_gain_cognitive_runtime_access');
const personalScopesBlock = oauthConfig.match(/SFI_PERSONAL_SCOPES\s*=\s*\[([\s\S]*?)\]\s*as const/)?.[1] ?? '';
assert.doesNotMatch(personalScopesBlock, /'execute'|'observe'|'propose'/, 'm6_personal_scope_ceiling_must_remain_owner_workspace_only');

// Machine discovery is versioned and uses the existing OpenAPI generator instead of a parallel spec owner.
assert.match(manifest, /version:\s*'1\.12\.0'/);
assert.match(manifest, /cognitive-runtime-read/);
assert.match(manifest, /cognitive-runtime-execute/);
assert.match(manifest, /user-bound institutional OAuth/);
assert.match(openapiMerge, /\/api\/external\/v1\/cognitive-runtime/);
assert.match(openapiMerge, /CognitiveRuntimeExecutionRequest/);
assert.match(openapiMerge, /sfiOAuth:\s*\['observe'\]/);
assert.match(openapiMerge, /sfiOAuth:\s*\['execute'\]/);
assert.match(openapiMerge, /Legacy single-target request fields are rejected|Legacy single-target request/i);

// RLS/security review: execution-relevant tenant and OAuth stores retain explicit barriers.
for (const table of ['sfi_tenants', 'sfi_tenant_members', 'sfi_cases', 'sfi_case_objects', 'sfi_case_reports', 'sfi_case_audit_events']) {
  assert.match(caseMigration, new RegExp(`alter table public\\.${table} enable row level security`, 'i'), `m6_rls_missing:${table}`);
}
assert.match(caseMigration, /sfi_tenant_can_read\(target_tenant uuid\)/);
assert.match(caseMigration, /sfi_tenant_can_write\(target_tenant uuid\)/);
assert.match(caseMigration, /m\.user_id = auth\.uid\(\)/);
assert.match(projectMigration, /alter table public\.sfi_projects enable row level security/i);
assert.match(projectMigration, /sfi_projects_tenant_read/);
assert.match(projectMigration, /sfi_tenant_can_read\(tenant_id\)/);
assert.match(projectMigration, /sfi_tenant_can_write\(tenant_id\)/);
assert.match(actionMigration, /alter table public\.sfi_case_action_proposals enable row level security/i);
assert.match(actionMigration, /alter table public\.sfi_case_action_decisions enable row level security/i);
assert.match(oauthClientsMigration, /alter table public\.sfi_oauth_clients enable row level security/i);
assert.match(oauthClientsMigration, /revoke all on table public\.sfi_oauth_clients from anon, authenticated/i);
assert.match(oauthClientsMigration, /grant select, insert, update, delete on table public\.sfi_oauth_clients to service_role/i);
assert.match(oauthCodesMigration, /alter table public\.sfi_oauth_authorization_codes enable row level security/i);
assert.match(oauthCodesMigration, /Service-role access only; no RLS policies are intentionally granted/i);

// Performance check is deliberately bounded to the deterministic request/contract plane.
// It is NOT an end-to-end network/provider latency claim.
const benchmarkStart = performance.now();
for (let i = 0; i < 5_000; i += 1) {
  const contract = executionContractForAgent('cross_impact');
  assert.ok(contract);
  const request = normalizeExecutionRequest('cross_impact', {
    purpose: 'Bounded M6 request-plane benchmark; no causal claim.',
    anchors: [{ kind: 'ANALYSIS_SESSION', id: `analysis:m6:${i}` }],
    targets: [{ kind: 'NODE', id: 'node-a' }, { kind: 'NODE', id: 'node-b' }],
    direction: 'EXPLORE',
  }, `m6-benchmark-${i}`);
  const validation = validateExecutionRequest(contract, request);
  assert.equal(validation.ok, true);
}
const requestPlaneMs = performance.now() - benchmarkStart;
const deterministicBudgetMs = 2_500;
assert.ok(requestPlaneMs < deterministicBudgetMs, `m6_request_plane_budget_exceeded:${requestPlaneMs.toFixed(1)}ms`);

// Deployment evidence is provider-backed and tied to canonical main; it is not inferred from a commit.
assert.match(deploymentWorkflow, /push:\n\s+branches:\n\s+- main/);
assert.match(deploymentWorkflow, /Checkout canonical main/);
assert.match(deploymentWorkflow, /Verify Vercel project scope/);
assert.match(deploymentWorkflow, /Build production artifact in GitHub Actions/);
assert.match(deploymentWorkflow, /Deploy prebuilt artifact to production/);
assert.match(deploymentWorkflow, /vercel@latest deploy --prebuilt --prod/);
assert.match(manifest, /deployment-provider workflow succeeds for the same canonical main SHA/);

console.log(JSON.stringify({
  ok: true,
  gate: 'SFI_AGENT_API_INTEGRATIONS_HARDENING_M6',
  apiContract: 'SFI-EXTERNAL-COGNITIVE-RUNTIME-1.0',
  executionService: 'SFI-MANUAL-COGNITIVE-EXECUTION-1.0',
  contractCatalogUnique: true,
  canonicalWriterReused: true,
  externalLegacyShapeAccepted: false,
  userBoundOAuthRequiredForExecute: true,
  institutionalTenantRequiredForExecute: true,
  personalOAuthExecutionPlaneAccess: false,
  rlsReview: 'PASS_STATIC_CONTRACT_REVIEW',
  performanceScope: 'DETERMINISTIC_REQUEST_CONTRACT_PLANE_ONLY',
  requestPlaneIterations: 5_000,
  requestPlaneMs: Number(requestPlaneMs.toFixed(2)),
  deterministicBudgetMs,
  endToEndLatencyClaimed: false,
  deploymentEvidenceLane: 'SFI Vercel Prebuilt Production',
  dbDelta: 'NONE',
}, null, 2));
