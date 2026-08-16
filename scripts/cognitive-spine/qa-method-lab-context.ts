import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const adapter = read('src/lib/method-lab/cognitiveSpineContext.ts');
const run = read('src/lib/method-lab/simulationRun.ts');
const route = read('src/app/api/root/method-lab/simulate/route.ts');

assert.ok(adapter.includes('LAB_EXPERIMENT_CONTEXT_PROFILE'), 'method_lab_projection_profile_missing');
assert.ok(adapter.includes('const consume = contextRefs.length > 0'), 'method_lab_consumption_not_allowlist_bound');
assert.ok(adapter.includes('allowedRefs: contextRefs'), 'method_lab_allowlist_not_applied');
assert.ok(adapter.includes('requireAllAllowedRefs: true'), 'method_lab_missing_refs_do_not_fail_closed');
assert.ok(adapter.includes('buildBoundedTwinContextFromCognitiveSpine'), 'method_lab_bounded_twin_context_missing');

assert.ok(run.includes('cognitiveSpineContextRefs?: string[]'), 'method_lab_context_refs_input_missing');
assert.ok(run.includes('materializeMethodLabCognitiveSpineContext'), 'method_lab_spine_not_materialized');
assert.ok(run.includes('...(consumedCognitiveSpineContext ? { cognitiveSpineContext: consumedCognitiveSpineContext } : {})'), 'unconsumed_spine_leaks_into_execution_metadata');
assert.ok(run.includes("evidence: [...evidence]"), 'method_lab_persisted_evidence_boundary_missing');
assert.equal(run.includes('evidence.push(cognitiveSpine'), false, 'method_lab_spine_context_promoted_to_evidence');
assert.ok(run.includes("consumedCognitiveSpine: cognitiveSpine.consumed ?"), 'method_lab_result_hash_does_not_distinguish_consumed_context');
assert.ok(run.includes('snapshot: cognitiveSpine.snapshot'), 'method_lab_exact_snapshot_not_persisted');
assert.ok(run.includes('consumptionTrace: cognitiveSpine.consumptionTrace'), 'method_lab_consumption_trace_not_persisted');
assert.ok(run.includes("epistemicClass: 'SIMULATED'"), 'method_lab_epistemic_class_changed');

assert.ok(route.includes('cognitiveSpineContextRefs'), 'method_lab_route_context_allowlist_missing');
assert.ok(route.includes('cognitiveSpineSnapshotHash'), 'method_lab_root_audit_snapshot_hash_missing');
assert.ok(route.includes('cognitiveSpineConsumed'), 'method_lab_root_audit_consumption_missing');

console.log(JSON.stringify({
  ok: true,
  profile: 'LAB_EXPERIMENT_CONTEXT_V1',
  allowlistRequiredForConsumption: true,
  missingAllowedRefFailsClosed: true,
  noAllowlistMeansUnconsumed: true,
  contextPromotedToEvidence: false,
  simulationEpistemicClass: 'SIMULATED',
  exactSnapshotPersisted: true,
}, null, 2));
