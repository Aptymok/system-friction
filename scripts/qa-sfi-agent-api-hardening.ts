import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = readFileSync('src/app/api/external/v1/manifest/route.ts', 'utf8');
const externalAuth = readFileSync('src/lib/sfi/externalAuth.ts', 'utf8');
const oauthConfig = readFileSync('src/lib/sfi/oauth/config.ts', 'utf8');
const openapiMerge = readFileSync('scripts/merge-openapi-cases.mjs', 'utf8');
const caseMigration = readFileSync('supabase/migrations/20260830010000_create_case_platform_v1.sql', 'utf8');
const projectMigration = readFileSync('supabase/migrations/20260830110000_create_sfi_projects.sql', 'utf8');
const actionMigration = readFileSync('supabase/migrations/20260830123000_create_case_action_v1.sql', 'utf8');
const oauthClientsMigration = readFileSync('supabase/migrations/20260828010000_create_sfi_oauth_gateway.sql', 'utf8');
const runtimeWriter = readFileSync('src/lib/sfi/cognitive-runtime/runtimeAgentExecutor.ts', 'utf8');
const materialEvidence = readFileSync('src/lib/evidence/materialEvidence.ts', 'utf8');
const evidenceHunterSource = readFileSync('src/lib/agents/evidenceHunter.ts', 'utf8');
const temporalResolverSource = readFileSync('src/lib/agents/temporalResolver.ts', 'utf8');
const agentLlmSource = readFileSync('src/lib/sfi/cognitive-runtime/agentLlm.ts', 'utf8');
const proposalEmitterSource = readFileSync('src/lib/sfi/cognitive-runtime/proposalEmitter.ts', 'utf8');

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

const manifestVersion = manifest.match(/version:\s*'(\d+\.\d+\.\d+)'/)?.[1] ?? null;
assert.ok(manifestVersion, 'external_manifest_semver_required');
assert.match(openapiMerge, /const canonicalVersion = manifestSource\.match/);
assert.match(openapiMerge, /api\.info\.version = canonicalVersion/);
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
assert.match(actionMigration, /alter table public\.sfi_case_action_proposals enable row level security/i);
assert.match(actionMigration, /alter table public\.sfi_case_action_decisions enable row level security/i);
assert.match(oauthClientsMigration, /alter table public\.sfi_oauth_clients enable row level security/i);
assert.match(oauthClientsMigration, /revoke all on table public\.sfi_oauth_clients from anon, authenticated/i);
assert.match(oauthClientsMigration, /grant select, insert, update, delete on table public\.sfi_oauth_clients to service_role/i);

console.log(JSON.stringify({ ok: true, manifestVersion, canonicalOpenapiVersionSource: true }, null, 2));
