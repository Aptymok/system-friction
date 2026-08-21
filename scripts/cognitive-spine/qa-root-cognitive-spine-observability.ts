import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const reader = read('src/lib/root/cognitiveSpineStatus.ts');
const route = read('src/app/api/root/cognitive-spine/status/route.ts');
const scenes = read('src/components/sfi/scenes.ts');
const liveUi = read('src/components/sfi/SfiConsole.tsx');
const scenePage = read('src/app/[scene]/page.tsx');

assert.ok(reader.includes('ROOT_GOVERNANCE_CONTEXT_PROFILE'), 'root_ct_status_profile_missing');
assert.ok(reader.includes('consume: false'), 'root_ct_status_must_not_consume_context');
assert.ok(reader.includes('internalRefsExposed: false'), 'root_ct_status_internal_ref_boundary_missing');
assert.ok(reader.includes('sources: state.derivedState.sourceCount'), 'root_ct_status_source_count_missing');
assert.ok(reader.includes('evidence: state.evidenceRefs.length'), 'root_ct_status_evidence_count_missing');
assert.ok(reader.includes('verificationDebt: state.verificationDebt.absolute'), 'root_ct_status_verification_debt_missing');
assert.equal(reader.includes('evidenceRefs: state.evidenceRefs'), false, 'root_ct_status_exposes_evidence_refs');
assert.equal(reader.includes('memoryRefs: state.memoryRefs'), false, 'root_ct_status_exposes_memory_refs');
assert.equal(reader.includes('decisionRefs: state.decisionRefs'), false, 'root_ct_status_exposes_decision_refs');
assert.equal(reader.includes(".insert("), false, 'root_ct_status_writes_state');
assert.equal(reader.includes(".update("), false, 'root_ct_status_mutates_state');
assert.ok(reader.includes('available: false as const'), 'root_ct_status_unavailability_fallback_missing');

assert.ok(route.includes("requireRootViewer('root.cognitive-spine.status')"), 'root_ct_status_endpoint_not_root_gated');
assert.ok(route.includes("'Cache-Control': 'no-store'"), 'root_ct_status_endpoint_cache_boundary_missing');

// ROOT observability is now integrated into the canonical live-scene runtime.
// The deleted CognitiveSpineStatusBar is not a required visual component.
assert.ok(scenes.includes("root:{key:'root'"), 'root_live_scene_missing');
assert.ok(scenes.includes("title:'SFI · director operativo'"), 'root_live_scene_semantics_missing');
assert.ok(liveUi.includes('COGNITIVE TWIN'), 'root_live_scene_twin_observability_missing');
assert.ok(liveUi.includes('/api/acp/proposals'), 'root_live_scene_proposal_feed_missing');
assert.ok(liveUi.includes('ACEPTAR') && liveUi.includes('RECHAZAR'), 'root_live_scene_governance_controls_missing');
assert.ok(liveUi.includes('auth.identity?.alias||auth.status'), 'root_live_scene_identity_observability_missing');
assert.ok(scenePage.includes('SCENE_KEYS.includes'), 'dynamic_scene_gate_missing');
assert.ok(scenePage.includes('<SfiConsole scene={scene}'), 'dynamic_scene_runtime_missing');

console.log(JSON.stringify({
  ok: true,
  statusContract: 'SFI-ROOT-CT-STATUS-1.1',
  rootOnly: true,
  consumesCt: false,
  canonicalWrite: false,
  internalRefsExposed: false,
  rootDependsOnCtAvailability: false,
  rootSurface: 'ROOT_LIVE_SCENE',
  twinProposalObservability: true,
  governedDecisionControls: true,
}, null, 2));
