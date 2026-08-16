import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const studioTwinContext = read('src/core/cognitive-twin/studioContext.ts');
const studioSpineAdapter = read('src/lib/studio/cognitive/studioCognitiveSpineContext.ts');
const studioRuntime = read('src/lib/studio/cognitive/studioCognitiveRuntime.ts');
const reconstructionRoute = read('src/app/api/studio/session/reconstruct/route.ts');

assert.ok(studioTwinContext.includes('materializeStudioCognitiveSpineContext'), 'studio_twin_read_not_delegated_to_spine');
assert.ok(studioTwinContext.includes('snapshotId: materialized.snapshot.snapshotId'), 'studio_snapshot_identity_missing');
assert.ok(studioTwinContext.includes('snapshotHash: materialized.snapshot.snapshotHash'), 'studio_snapshot_hash_missing');
assert.ok(studioTwinContext.includes('consumed: materialized.trace.ctSnapshotConsumed'), 'studio_consumption_trace_missing');

for (const forbidden of [
  "from('sfi_cognitive_twin_memory')",
  'readCanonicalCognitiveTwinMemory',
]) {
  assert.equal(studioTwinContext.includes(forbidden), false, `studio_live_twin_read_reintroduced:${forbidden}`);
}

assert.ok(studioSpineAdapter.includes("STUDIO_OBJECT_CONTEXT_PROFILE"), 'studio_projection_profile_missing');
assert.ok(studioSpineAdapter.includes("profileId: STUDIO_OBJECT_CONTEXT_PROFILE.profileId"), 'studio_profile_not_materialized');
assert.ok(studioSpineAdapter.includes('buildBoundedTwinContextFromCognitiveSpine'), 'studio_bounded_context_adapter_missing');
assert.ok(studioSpineAdapter.includes('consume: true'), 'studio_consumption_not_explicit');

// Existing cognitive paths may keep the compatibility function during the
// migration, but it must now resolve through the sealed boundary above.
assert.ok(studioRuntime.includes('readStudioTwinContext'), 'studio_runtime_context_boundary_missing');
assert.ok(reconstructionRoute.includes('readStudioTwinContext'), 'studio_reconstruction_context_boundary_missing');

console.log(JSON.stringify({
  ok: true,
  profile: 'STUDIO_OBJECT_CONTEXT_V1',
  liveTwinTableRead: false,
  sealedSnapshotIdentityExposed: true,
  boundedMemoryDecisionContext: true,
  runtimeCompatibilityPath: true,
  reconstructionCompatibilityPath: true,
}, null, 2));
