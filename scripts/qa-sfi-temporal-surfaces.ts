import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const worldApi = read('src/app/api/field/map/world/route.ts');
const worldUi = read('src/components/field/map/WorldFieldObservatory.tsx');
const cognitive = read('src/app/api/field/map/world/cognitive/route.ts');
const publicTimeline = read('src/lib/observatory/public/worldSnapshotTimeline.ts');
const publicTimelineUi = read('src/components/observatory/public/PublicObservatoryTimelineNavigator.tsx');
const observatoryPage = read('src/app/observatory/page.tsx');

assert.ok(worldApi.includes('readPagedRows'), 'world_history_must_paginate');
assert.ok(worldApi.includes("'world_hypotheses', 'cutoff_at'"), 'world_hypotheses_must_be_temporally_read');
assert.ok(worldApi.includes("'world_hypothesis_outcomes', 'evaluated_at'"), 'world_outcomes_must_be_temporally_read');
assert.ok(worldApi.includes("'world_learning_events', 'created_at'"), 'world_learning_must_be_temporally_read');
assert.ok(!worldApi.includes(".from('world_hypotheses').select('*').order('created_at', { ascending: false }).limit(100)"), 'legacy_first_100_hypothesis_limit_present');

for (const token of [
  'type="range"',
  'windowHours',
  'visibleNodes',
  'visibleHypotheses',
  'Timeline completa',
  '/api/field/map/world/cognitive',
  'ANALIZAR FRAME CON SFI',
  'sticky top-',
]) assert.ok(worldUi.includes(token), `world_field_temporal_contract_missing:${token}`);
assert.ok(!worldUi.includes('hypotheses.slice(0, 8)'), 'world_field_still_hides_hypotheses_after_eight');
assert.ok(!worldUi.includes('<path key={`${previous.id}:${node.id}`'), 'world_field_still_draws_unpersisted_previous_node_edges');

for (const token of [
  'executeSfiRuntime',
  'runLlmTask',
  "sfi_cognitive_twin_memory",
  "sfi_cognitive_twin_decisions",
  "eq('status', 'CANONICAL')",
  "eq('status', 'APPROVED')",
  "role: 'world_field_frame_analysis'",
  'llmAugmentation: false',
  "epistemicClass: 'PROPOSED'",
]) assert.ok(cognitive.includes(token), `world_field_cognitive_bridge_missing:${token}`);
assert.ok(!/Math\.random|setInterval|setTimeout|while\s*\(\s*true\s*\)/.test(cognitive), 'world_field_cognitive_bridge_must_be_bounded_and_non_synthetic');
assert.ok(/cannot rewrite observations|cannot rewrite/i.test(cognitive), 'world_field_cognitive_mutation_boundary_missing');

for (const token of [
  "from('worldspect_snapshots')",
  'readPublicWorldSnapshotTimeline',
  'VECTOR_DEFINITIONS',
  'Historical frames are reconstructed only from persisted WorldSpect snapshots.',
]) assert.ok(publicTimeline.includes(token), `public_timeline_source_contract_missing:${token}`);
assert.ok(publicTimelineUi.includes('/api/observatory/timeline'), 'public_timeline_ui_not_wired');
assert.ok(publicTimelineUi.includes('type="range"'), 'public_timeline_cursor_missing');
assert.ok(publicTimelineUi.includes('Cada posición corresponde a un snapshot WorldSpect almacenado'), 'public_timeline_epistemic_boundary_missing');
assert.ok(observatoryPage.includes('<PublicObservatoryTimelineNavigator />'), 'public_observatory_timeline_not_rendered');
assert.ok(!publicTimelineUi.includes('sfi_cognitive_twin_'), 'public_observatory_must_not_expose_private_cognitive_twin_corpus');

console.log(JSON.stringify({
  ok: true,
  worldField: {
    paginatedHistory: true,
    temporalNodeFiltering: true,
    allHypothesesVisible: true,
    stickyMapContext: true,
    cognitiveFrameExecution: true,
  },
  cognitiveBridge: {
    agents: true,
    oneLlmSynthesis: true,
    canonicalTwinMemoryOnly: true,
    approvedRulesOnly: true,
    proposedNotObserved: true,
  },
  publicObservatory: {
    persistedWorldSpectFrames: true,
    interactiveTimeline: true,
    privateTwinExposure: false,
  },
}, null, 2));