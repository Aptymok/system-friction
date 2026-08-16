import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const boundary = read('src/lib/field/fieldCognitiveSpineBoundary.ts');
const governed = read('src/lib/field/governedReturn.ts');

assert.ok(boundary.includes('FIELD_BLINDED_OBSERVATION_PROFILE'), 'field_t0_profile_not_blinded');
assert.ok(boundary.includes('consume: false'), 'field_t0_must_not_consume_ct');
assert.ok(boundary.includes('sourceCutoff'), 'field_t0_cutoff_missing');

const baselinePosition = governed.indexOf('const result = await createFieldCycle(ownerId, input)');
const spinePosition = governed.indexOf('cognitiveSpineT0 = await materializeFieldBlindedCognitiveSpineT0');
assert.ok(baselinePosition >= 0, 'field_baseline_cycle_call_missing');
assert.ok(spinePosition > baselinePosition, 'field_ct_materialized_before_blinded_baseline_capture');

assert.ok(governed.includes('cognitiveSpineT0: cognitiveSpineT0 ??'), 'field_t0_not_persisted_in_case_metadata');
assert.ok(governed.includes('operationalSfiCtConsumed: false'), 'field_t0_degraded_path_does_not_preserve_nonconsumption');
assert.ok(governed.includes('cognitiveSpineT0: metadata.cognitiveSpineT0 ?? null'), 'field_return_does_not_preserve_t0_provenance');
assert.ok(governed.includes('FIELD_COGNITIVE_SPINE_T0_UNAVAILABLE'), 'field_t0_unavailability_not_explicit');

console.log(JSON.stringify({
  ok: true,
  profile: 'FIELD_BLINDED_OBSERVATION_V1',
  baselineCapturedBeforeCtObservation: true,
  ctConsumedAtT0: false,
  ctFailureBlocksField: false,
  t0PreservedThroughReturn: true,
}, null, 2));
