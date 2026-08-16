import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const adapter = read('src/lib/root/cognitiveSpineRootContext.ts');
const route = read('src/app/api/root/cognitive-twin/deliberate/route.ts');

assert.ok(adapter.includes('ROOT_GOVERNANCE_CONTEXT_PROFILE'), 'root_projection_profile_missing');
assert.ok(adapter.includes('materializeInstitutionalCognitiveSpineProfile'), 'root_generic_materializer_missing');
assert.ok(adapter.includes('buildBoundedTwinContextFromCognitiveSpine'), 'root_bounded_context_missing');
assert.ok(adapter.includes('consume: true'), 'root_ct_consumption_not_explicit');

for (const forbidden of [
  "from('sfi_cognitive_twin_memory')",
  "from('sfi_cognitive_twin_decisions')",
]) {
  assert.equal(route.includes(forbidden), false, `root_live_twin_read_reintroduced:${forbidden}`);
}

assert.ok(route.includes('materializeRootCognitiveSpineContext'), 'root_deliberation_not_using_spine');
assert.ok(route.includes('snapshot: cognitiveSpine.snapshot'), 'root_run_exact_snapshot_not_persisted');
assert.ok(route.includes('consumptionTrace: cognitiveSpine.trace'), 'root_run_consumption_trace_not_persisted');
assert.ok(route.includes('cognitiveSpineSnapshotHash: cognitiveSpine.snapshot.snapshotHash'), 'root_audit_snapshot_hash_missing');
assert.ok(route.includes('ROOT governance authority does not upgrade evidence, independence, epistemic class or truth.'), 'root_truth_authority_boundary_missing');
assert.ok(route.includes('The consumed Cognitive Spine state is sealed at the declared cutoff'), 'root_midrun_refresh_boundary_missing');

console.log(JSON.stringify({
  ok: true,
  profile: 'ROOT_GOVERNANCE_CONTEXT_V1',
  liveTwinTableRead: false,
  exactSnapshotPersisted: true,
  consumptionTracePersisted: true,
  auditCarriesSnapshotHash: true,
  governanceAuthorityOverTruth: false,
}, null, 2));
