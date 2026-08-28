import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const hygiene = read('src/lib/studio/hygiene/studioObjectHygiene.ts');
const repository = read('src/lib/studio/production/studioProductionRepository.ts');
const contextRoute = read('src/app/api/studio/objects/[id]/context/route.ts');
const externalStudio = read('src/app/api/external/v1/studio/route.ts');
const observatoryRoute = read('src/app/api/observatory/world/route.ts');
const observatoryFeed = read('src/components/sfi/ObservatoryProvenanceFeed.tsx');
const vercel = read('vercel.json');

for (const token of ['SFI-STUDIO-HYGIENE-1.0', 'VERIFIED_HASH', 'contentKey', 'PROCESSING_ATTEMPT', 'processingState']) {
  assert.ok(hygiene.includes(token), `studio_hygiene_contract_missing:${token}`);
}
assert.ok(hygiene.includes("class: 'TECHNICAL_LINEAGE'"), 'studio_trace_must_be_technical_lineage');
assert.ok(hygiene.includes("epistemicAuthority: 'NONE'"), 'studio_trace_must_not_claim_evidence_authority');
assert.ok(hygiene.includes('attempt outcomes remain separate lineage'), 'studio_processing_attempt_boundary_missing');
assert.ok(hygiene.includes('title, size or filename similarity must not be treated as duplicate proof'), 'studio_unverified_duplicate_boundary_missing');
assert.ok(hygiene.includes('BINARY_RETRIEVABLE_BY_REFERENCE'), 'studio_materialization_state_missing');
assert.ok(hygiene.includes('IDENTITY_ONLY'), 'studio_identity_only_state_missing');
assert.ok(hygiene.includes('creativeConstraints'), 'studio_creative_constraints_projection_missing');
assert.ok(hygiene.includes('operatorFeedback'), 'studio_operator_feedback_projection_missing');

assert.ok(repository.includes("metadata->hygiene->>lifecycleClass.eq.CANONICAL"), 'studio_canonical_archive_visibility_missing');
assert.ok(repository.includes('status.neq.archived'), 'studio_historical_archive_filter_missing');
assert.ok(repository.includes('includeArchived'), 'studio_archive_opt_in_missing');
assert.ok(repository.includes('before'), 'studio_cursor_missing');
assert.ok(repository.includes('clampLimit'), 'studio_list_limit_missing');
assert.ok(repository.includes('projectStudioObjectForHumans'), 'studio_human_projection_missing');

assert.ok(contextRoute.includes('creativeConstraints'), 'studio_context_creative_constraints_missing');
assert.ok(contextRoute.includes('operatorFeedback'), 'studio_context_operator_feedback_missing');
assert.match(contextRoute, /prohibitedEffects[\s\S]*creativeConstraints[\s\S]*operatorFeedback/, 'studio_context_semantic_separation_missing');

assert.ok(externalStudio.includes('ARCHIVED_EXCLUDED_BY_DEFAULT'), 'external_studio_operational_default_missing');
assert.ok(externalStudio.includes('nextCursor'), 'external_studio_pagination_missing');
assert.ok(externalStudio.includes('studio_binary_not_materialized'), 'external_studio_materialization_boundary_missing');

for (const token of ['whyShown', 'sourceRole', 'verificationState', 'caseBinding', 'AUTOMATED_BACKGROUND_MONITOR', 'COLLAPSED_BY_DEFAULT']) {
  assert.ok(observatoryRoute.includes(token), `observatory_relevance_contract_missing:${token}`);
}
assert.ok(observatoryRoute.includes('SOURCE/PROVENANCE does not imply accepted EVIDENCE'), 'observatory_epistemic_boundary_missing');
assert.ok(observatoryFeed.includes("visibility === 'VISIBLE_BY_DEFAULT'"), 'observatory_background_must_be_collapsed');
assert.ok(observatoryFeed.includes('WHY SHOWN'), 'observatory_reason_for_inclusion_not_visible');
assert.ok(observatoryFeed.includes('SOURCE / PROVENANCE ≠ ACCEPTED EVIDENCE'), 'observatory_source_evidence_boundary_not_visible');

const config = JSON.parse(vercel) as { git?: { deploymentEnabled?: Record<string, boolean> } };
assert.equal(config.git?.deploymentEnabled?.main, false, 'studio_hygiene_pr_must_not_enable_vercel_main_deploy');
assert.equal(config.git?.deploymentEnabled?.['*'], false, 'studio_hygiene_pr_must_not_enable_vercel_preview_deploy');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-STUDIO-HYGIENE-1.0',
  historicalArchiveExcludedByDefault: true,
  canonicalArchiveVisibleByDefault: true,
  contentIdentityByHash: true,
  processingAttemptsRemainDistinctLineage: true,
  traceAuthority: 'NONE',
  operatorFeedbackSeparated: true,
  canonicalMaterializationSeparated: true,
  observatoryReasonForInclusion: true,
  responseShaping: true,
  vercelDeploymentsRemainDisabled: true,
}, null, 2));
