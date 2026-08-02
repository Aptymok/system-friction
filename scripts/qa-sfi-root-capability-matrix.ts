import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { studioCapabilityMatrix, studioRootCapabilityReadModel } from '../src/lib/studio/capabilities/studioCapabilityInventory';

const root = process.cwd();
const require = createRequire(import.meta.url);
(require.extensions as Record<string, (module: unknown, filename: string) => void>)['.css'] = () => {};
const { RootCapabilityMatrix } = require('../src/components/root/capabilities/RootCapabilityMatrix') as typeof import('../src/components/root/capabilities/RootCapabilityMatrix');

function filesUnder(relative: string): string[] {
  const absolute = path.join(root, relative);
  return readdirSync(absolute).flatMap((name) => {
    const file = path.join(absolute, name);
    const stat = statSync(file);
    if (stat.isDirectory()) return filesUnder(path.relative(root, file));
    return file;
  });
}

for (const file of filesUnder('src/components/root/capabilities')) {
  const body = readFileSync(file, 'utf8');
  assert.ok(!/createServiceSupabaseClient|from\(['"`][a-z0-9_]+['"`]\)/.test(body), `direct_supabase_access:${path.relative(root, file)}`);
  assert.ok(!body.includes('[object Object]'), `object_object_literal:${path.relative(root, file)}`);
}

const readModel = studioRootCapabilityReadModel();
const required = [
  'audio.dynamic.true_peak',
  'audio.rhythm.beat_tempo_meter',
  'audio.pitch.tracking',
  'audio.pitch.chroma',
  'audio.pitch.key_estimation',
  'audio.harmony.harmonic_change',
  'audio.harmony.harmonic_stability',
  'audio.harmony.tonal_ambiguity',
  'sfi.variable.d_cog',
  'sfi.variable.e_r',
  'sfi.variable.v_i',
];
for (const id of required) assert.ok(readModel.some((item) => item.capability === id), `missing_capability:${id}`);
assert.equal(readModel.find((item) => item.capability === 'audio.rhythm.beat_tempo_meter')?.status, 'AVAILABLE');
assert.equal(readModel.find((item) => item.capability === 'audio.harmony.harmonic_stability')?.status, 'AVAILABLE');
assert.equal(readModel.find((item) => item.capability === 'sfi.variable.d_cog')?.status, 'CALIBRATION_REQUIRED');
assert.ok(readModel.find((item) => item.capability === 'audio.harmony.harmonic_stability')?.affectedRoutes.includes('/studio'), 'harmony_route_missing');
assert.ok((readModel.find((item) => item.capability === 'sfi.variable.d_cog')?.dependencies.length ?? 0) > 0, 'dcog_dependencies_missing');

const matrix = studioCapabilityMatrix();
assert.ok(!matrix.summary.technicallySolvableBlocked.includes('audio.rhythm.beat_tempo_meter'), 'rhythm_still_blocked_by_implementation');
assert.ok(!matrix.summary.technicallySolvableBlocked.includes('audio.harmony.harmonic_stability'), 'harmony_still_blocked_by_implementation');
assert.ok(!matrix.summary.technicallySolvableBlocked.includes('sfi.variable.d_cog'), 'd_cog_wrongly_capability_missing');

const renderStart = performance.now();
const rendered = renderToStaticMarkup(createElement(RootCapabilityMatrix));
const renderMs = Number((performance.now() - renderStart).toFixed(3));
for (const token of ['CAPABILITY MATRIX', 'audio.rhythm.beat_tempo_meter', 'audio.harmony.harmonic_stability', 'AVAILABLE', 'sfi.variable.d_cog', 'CALIBRATION_REQUIRED', 'Dependencies']) {
  assert.ok(rendered.includes(token), `render_missing:${token}`);
}
assert.ok(!rendered.includes('[object Object]'), 'object_object_rendered');
assert.ok(renderMs < 120, `root_capability_matrix_ssr_render_slow:${renderMs}`);

console.log(JSON.stringify({
  ok: true,
  renderedLength: rendered.length,
  renderMs,
  capabilityCount: readModel.length,
  rhythm: readModel.find((item) => item.capability === 'audio.rhythm.beat_tempo_meter')?.status,
  harmony: readModel.find((item) => item.capability === 'audio.harmony.harmonic_stability')?.status,
  dCog: readModel.find((item) => item.capability === 'sfi.variable.d_cog')?.status,
}, null, 2));
