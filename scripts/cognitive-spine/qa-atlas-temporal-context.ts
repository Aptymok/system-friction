import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const adapter = read('src/lib/atlas/cognitiveSpineTemporalContext.ts');
const runtime = read('src/lib/atlas/atlasMemoryRuntime.ts');

assert.ok(adapter.includes('ATLAS_TEMPORAL_CONTEXT_PROFILE'), 'atlas_projection_profile_missing');
assert.ok(adapter.includes('consume: true'), 'atlas_temporal_context_not_explicitly_consumed');
assert.ok(adapter.includes('read-only Atlas temporal and lineage inspection'), 'atlas_consumption_reason_missing');
assert.ok(adapter.includes('Relationship does not upgrade epistemic class'), 'atlas_epistemic_boundary_missing');
assert.ok(adapter.includes('temporal association is not causality'), 'atlas_noncausal_boundary_missing');
assert.equal(adapter.includes(".from('"), false, 'atlas_temporal_adapter_must_not_write_or_read_ad_hoc_stores');
assert.ok(adapter.includes('internalRefsExposed: false'), 'atlas_internal_ref_exposure_boundary_missing');
for (const forbiddenOutput of [
  'sourceManifest: state.sourceManifest',
  'eventRefs: state.eventRefs',
  'evidenceRefs: state.evidenceRefs',
  'hypothesisRefs: state.hypothesisRefs',
  'memoryRefs: state.memoryRefs',
  'decisionRefs: state.decisionRefs',
]) {
  assert.equal(adapter.includes(forbiddenOutput), false, `atlas_internal_ref_exposed:${forbiddenOutput}`);
}
assert.ok(adapter.includes('sourceCounts:'), 'atlas_safe_aggregate_counts_missing');

const cutoffPosition = runtime.indexOf('const atlasStartedAt = new Date().toISOString()');
const publisherPosition = runtime.indexOf('buildPublisherDraftRuntime()');
const spinePosition = runtime.indexOf('materializeAtlasCognitiveSpineTemporalContext({');
assert.ok(cutoffPosition >= 0, 'atlas_context_cutoff_missing');
assert.ok(publisherPosition > cutoffPosition && spinePosition > cutoffPosition, 'atlas_cutoff_not_frozen_before_material_and_context_reads');
assert.ok(runtime.includes('sourceCutoff: atlasStartedAt'), 'atlas_snapshot_not_bound_to_runtime_start');
assert.ok(runtime.includes('cognitive_spine: cognitiveSpine'), 'atlas_temporal_context_not_exposed');
assert.ok(runtime.includes('context_changes_publisher_material: false'), 'atlas_context_influence_boundary_missing');
assert.ok(runtime.includes('atlas_requires_ct_to_operate: false'), 'atlas_became_ct_middleware');
assert.ok(runtime.includes('canonical_write_performed: false'), 'atlas_read_causes_canonical_write');
assert.ok(runtime.includes('atlas_cognitive_spine_unavailable:'), 'atlas_ct_unavailability_not_preserved_as_gap');
assert.ok(runtime.includes('Missing context is preserved as a provenance gap'), 'atlas_missing_context_narrative_fill_boundary_missing');
assert.equal(runtime.includes('recordCognitiveTwinExperience'), false, 'atlas_read_promotes_context_to_experience');

console.log(JSON.stringify({
  ok: true,
  profile: 'ATLAS_TEMPORAL_CONTEXT_V1',
  readOnly: true,
  atlasRequiresCtToOperate: false,
  contextChangesPublisherMaterial: false,
  internalInstitutionalRefsExposed: false,
  canonicalWritePerformed: false,
  relationshipUpgradesEpistemicClass: false,
  associationImpliesCausality: false,
}, null, 2));
