import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const executionMap = readFileSync('src/lib/sfi/cognitive-runtime/agentExecutionMap.ts', 'utf8');
const runtimeExecutor = readFileSync('src/lib/sfi/cognitive-runtime/runtimeAgentExecutor.ts', 'utf8');
const manualExecution = readFileSync('src/lib/sfi/cognitive-runtime/manualExecution.ts', 'utf8');
const cognitiveRuntimeRoute = readFileSync('src/app/api/external/v1/cognitive-runtime/route.ts', 'utf8');
const externalAuth = readFileSync('src/lib/sfi/externalAuth.ts', 'utf8');
const oauthConfig = readFileSync('src/lib/sfi/oauthConfig.ts', 'utf8');
const manifest = readFileSync('src/app/api/external/v1/manifest/route.ts', 'utf8');
const openapiMerge = readFileSync('scripts/merge-openapi-cases.mjs', 'utf8');
const caseMigration = readFileSync('supabase/migrations/20260728153000_sfi_case_platform_v1.sql', 'utf8');
const projectMigration = readFileSync('supabase/migrations/20260803013000_sfi_projects_tenant_rls.sql', 'utf8');
const runtimeWriter = readFileSync('src/lib/sfi/cognitive-runtime/runtimeAgentExecutor.ts', 'utf8');
const materialEvidence = readFileSync('src/lib/sfi/cognitive-runtime/materialEvidenceView.ts', 'utf8');
const evidenceHunterSource = readFileSync('src/lib/sfi/cognitive-runtime/evidenceHunterAgent.ts', 'utf8');
const temporalResolverSource = readFileSync('src/lib/sfi/cognitive-runtime/temporalFrictionResolver.ts', 'utf8');
const agentLlmSource = readFileSync('src/lib/sfi/agentLlmClient.ts', 'utf8');
const proposalEmitterSource = readFileSync('src/lib/sfi/cognitive-runtime/governedProposalEmitter.ts', 'utf8');

assert.match(executionMap, /SFI_EXECUTION_CONTRACT_VERSION/);
assert.match(executionMap, /targetSelection/);
assert.match(executionMap, /allowedObjectTypes/);
assert.match(executionMap, /requiredObjectTypes/);
assert.match(executionMap, /minTargets/);
assert.match(executionMap, /maxTargets/);
assert.match(executionMap, /evidenceRequired/);
assert.match(executionMap, /evidenceMode/);
assert.match(executionMap, /outputs/);
assert.match(executionMap, /knowledgePolicy/);
assert.match(executionMap, /operationKind/);
assert.match(executionMap, /executionBoundary/);
assert.match(executionMap, /measurementScope/);
assert.match(executionMap, /entityView/);
assert.match(executionMap, /materialEvidencePolicy/);
assert.match(executionMap, /externalSideEffects/);
assert.match(executionMap, /authority/);

assert.match(runtimeExecutor, /SFI_AGENT_EXECUTION_MAP/);
assert.match(runtimeExecutor, /contract/);
assert.match(runtimeExecutor, /validateAgentExecutionContract/);
assert.match(runtimeExecutor, /llmEligible/);
assert.match(runtimeExecutor, /promptProjection/);
assert.match(runtimeExecutor, /llmRuntime/);
assert.match(runtimeExecutor, /governanceDecision/);
assert.match(runtimeExecutor, /authorityBoundary/);
assert.match(runtimeExecutor, /selectedObjectsAreEvidence/);
assert.match(runtimeExecutor, /publicSourcesAreAdmittedEvidence/);
assert.match(runtimeExecutor, /externalEffectExecuted/);
assert.match(runtimeExecutor, /canonicalPromotionAllowed/);
assert.match(runtimeExecutor, /emitGovernedProposalsFromAgentInsight/);

assert.match(manualExecution, /SFI-MANUAL-COGNITIVE-EXECUTION-1\.1/);
assert.match(manualExecution, /validateAgentExecutionContract/);
assert.match(manualExecution, /resolveExecutionObjects/);
assert.match(manualExecution, /runCognitiveAgent/);
assert.match(manualExecution, /CANONICAL_EXECUTION_REQUEST/);
assert.match(manualExecution, /externalEffectExecutedByThisRoute: false/);
assert.match(manualExecution, /publicSourcesAreAdmittedEvidence: false/);
assert.match(manualExecution, /aiInterpretationClass: 'INFERENCE'/);

assert.match(cognitiveRuntimeRoute, /authorizeExternalRequest\(req, 'execute'\)/);
assert.match(cognitiveRuntimeRoute, /credential\.authMethod !== 'oauth'/);
assert.match(cognitiveRuntimeRoute, /tenantId !== 'sfi'/);
assert.match(cognitiveRuntimeRoute, /executeManualCognitiveAgent/);
assert.match(cognitiveRuntimeRoute, /allowLegacyCompatibility: false/);

assert.match(runtimeWriter, /emitGovernedProposalsFromAgentInsight/);

assert.match(materialEvidence, /REUSED_EXISTING_MATERIAL_EVIDENCE_WITHOUT_READMISSION_OR_DUPLICATION/);
assert.match(materialEvidence, /OBSERVED.*DERIVED.*CANONICAL.*IMPORTED.*EXTRACTED/s);
assert.match(evidenceHunterSource, /REUSE_EXISTING_MATERIAL_EVIDENCE_BEFORE_REQUESTING_NEW_EVIDENCE/);
assert.match(evidenceHunterSource, /EXISTING_SUPPORT_REUSED/);
assert.match(temporalResolverSource, /ATTENTION_BEFORE_CREATION/);
assert.match(temporalResolverSource, /created_at <= attention_started_at <= resolved_at/);
assert.match(temporalResolverSource, /retrospective capture, field semantics, migration, timezone, ETL\/import and application defects/);
assert.match(agentLlmSource, /OBSERVATION -> CONTRADICTION -> RIVAL CAUSES -> FRICTION -> SYSTEMIC MECHANISM -> INTERVENTION -> HARD RULE -> RETURN CONTRACT/);
assert.match(agentLlmSource, /Do not ask the operator to re-upload or re-provide a dataset/);
assert.match(agentLlmSource, /rivalCauses/);
assert.match(agentLlmSource, /systemicMechanism/);
assert.match(agentLlmSource, /hardRules/);
assert.match(agentLlmSource, /returnContract/);
assert.match(agentLlmSource, /falsificationConditions/);
assert.match(proposalEmitterSource, /COGNITIVE_INTERVENTION_CANDIDATE/);
assert.match(proposalEmitterSource, /PROPOSAL_REQUIRES_ROOT_GOVERNANCE/);
assert.match(proposalEmitterSource, /RIVAL_CAUSES_REQUIRED_FOR_CONTRADICTION/);
assert.match(proposalEmitterSource, /DUPLICATE_GOVERNED_PROPOSAL_REUSED/);
assert.match(proposalEmitterSource, /THIS_EMITTER_DOES_NOT_EXECUTE_INTERVENTION_OR_RECORD_RETURN/);

assert.doesNotMatch(externalAuth, /pathname === ['"]\/api\/external\/v1\/cognitive-runtime['"]/, 'm6_personal_oauth_must_not_gain_cognitive_runtime_access');
const personalScopesBlock = oauthConfig.match(/SFI_PERSONAL_SCOPES\s*=\s*\[([\s\S]*?)\]\s*as const/)?.[1] ?? '';
assert.doesNotMatch(personalScopesBlock, /'execute'|'observe'|'propose'/, 'm6_personal_scope_ceiling_must_remain_owner_workspace_only');

assert.match(manifest, /version:\s*'1\.13\.0'/);
assert.match(manifest, /cognitive-runtime-read/);
assert.match(manifest, /cognitive-runtime-execute/);
assert.match(manifest, /user-bound institutional OAuth/);
assert.match(openapiMerge, /\/api\/external\/v1\/cognitive-runtime/);
assert.match(openapiMerge, /CognitiveRuntimeExecutionRequest/);
assert.match(openapiMerge, /sfiOAuth:\s*\['observe'\]/);
assert.match(openapiMerge, /sfiOAuth:\s*\['execute'\]/);
assert.match(openapiMerge, /Legacy single-target request fields are rejected|Legacy single-target request/i);

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

console.log(JSON.stringify({
  ok: true,
  gate: 'SFI-AGENT-API-HARDENING-1.0',
  executionContract: 'SFI-EXECUTION-CONTRACT-1.0',
  manualExecution: 'SFI-MANUAL-COGNITIVE-EXECUTION-1.1',
  externalRuntime: 'SFI-EXTERNAL-COGNITIVE-RUNTIME-1.0',
  externalSideEffects: false,
  canonicalPromotionAllowed: false,
  publicSourcesAdmittedByExecution: false,
  personalOauthCanExecuteInstitutionalRuntime: false,
}, null, 2));
