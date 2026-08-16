import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const adapters = read('src/lib/worldspect/runAdapters.ts');
const contrast = read('src/lib/worldspect/cognitiveSpineContrast.ts');
const snapshotStore = read('src/lib/worldspect/snapshotStore.ts');
const ingestRoute = read('src/app/api/worldspect/ingest/route.ts');

assert.ok(adapters.includes('recordWorldSpectPostObservationCognitiveSpineContrast'), 'worldspect_ct_contrast_recorder_missing');
const canonicalPersistPosition = adapters.indexOf('const persistence = await upsertWorldSpectSnapshot');
const contrastPosition = adapters.indexOf('cognitiveSpineContrast = await recordWorldSpectPostObservationCognitiveSpineContrast');
assert.ok(canonicalPersistPosition >= 0, 'worldspect_canonical_persist_missing');
assert.ok(contrastPosition > canonicalPersistPosition, 'worldspect_ct_contrast_occurs_before_canonical_persistence');

const startPosition = adapters.indexOf('const observationStartedAt = new Date().toISOString()');
const firstAdapterObservationPosition = adapters.indexOf('adapter.observe()');
assert.ok(startPosition >= 0, 'worldspect_observation_start_cutoff_missing');
assert.ok(firstAdapterObservationPosition > startPosition, 'worldspect_prior_cutoff_not_captured_before_adapter_observation');
assert.ok(adapters.includes('priorCognitiveStateCutoff: observationStartedAt'), 'worldspect_prior_cutoff_not_bound_to_observation_start');
assert.ok(adapters.includes('ok: persistence.ok'), 'worldspect_observation_success_depends_on_ct_contrast');
assert.ok(adapters.includes('worldspect_post_observation_ct_contrast_unavailable'), 'worldspect_ct_contrast_failure_not_degraded_to_warning');

assert.ok(contrast.includes('WORLDSPECT_CONTEXT_PROFILE'), 'worldspect_projection_profile_missing');
assert.ok(contrast.includes('consume: true'), 'worldspect_post_observation_context_not_explicitly_consumed');
assert.ok(contrast.includes("epistemicClass: 'DERIVED'"), 'worldspect_contrast_not_derived');
assert.ok(contrast.includes('external observation has already been'), 'worldspect_post_observation_order_not_documented');
assert.ok(contrast.includes('association is not validation or causality'), 'worldspect_noncausal_boundary_missing');
assert.ok(contrast.includes('priorStateCutoff'), 'worldspect_prior_state_cutoff_missing');

// Cognitive Spine materialization must never enter the canonical external
// WorldSpect snapshot or its semantic hash. The CT comparison is a separate
// derived artifact persisted only after the observation exists.
assert.equal(/cognitiveSpine|cognitive_spine/i.test(snapshotStore), false, 'worldspect_canonical_snapshot_contaminated_by_ct');
assert.ok(snapshotStore.includes('function hashSnapshot(input: WorldSpectSnapshotInput)'), 'worldspect_canonical_hash_missing');

const manualRouteStart = ingestRoute.indexOf('const observationStartedAt = new Date().toISOString()');
const manualPersist = ingestRoute.indexOf('persistWorldSpectObservations(observations');
assert.ok(manualRouteStart >= 0 && manualPersist > manualRouteStart, 'manual_worldspect_cutoff_not_captured_before_persistence');
assert.ok(ingestRoute.includes('priorCognitiveStateCutoff: observationStartedAt'), 'manual_worldspect_prior_cutoff_not_forwarded');

console.log(JSON.stringify({
  ok: true,
  profile: 'WORLDSPECT_CONTEXT_V1',
  observationBeforeCtContrast: true,
  canonicalWorldSpectHashContainsCt: false,
  contrastEpistemicClass: 'DERIVED',
  ctContrastFailureBlocksObservation: false,
  priorInstitutionalCutoffCapturedBeforeObservation: true,
}, null, 2));
