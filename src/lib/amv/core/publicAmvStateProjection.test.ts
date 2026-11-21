import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { publicAmvStateProjection } from './publicAmvStateProjection';
import type { AmvScopeState } from './amvScopeStateTypes';

const fake: AmvScopeState = {
  ok: true,
  scope: 'scorefriction',
  label: 'ScoreFriction',
  state: 'live',
  latestReading: {
    id: 'private-evidence-id',
    label: 'private-case-title',
    observedAt: '2026-11-21T00:00:00Z',
    summary: 'private-user-context',
    trust: 'verified',
    source: 'private-source',
    payload: { secret: 'private-raw-database-row' },
  },
  sourceTrust: 'observed',
  evidenceSummary: {
    count: 4, verified: 1, declared: 1, derived: 2, degraded: 0,
    sandbox: 0, sourceCoverage: 0.4,
  },
  recentEvents: [{ id: 'private-event-id', label: 'private-event-name', trust: 'verified', summary: 'private-event-summary' }],
  archiveLayerSummary: [{ layer: 'living_observatory', count: 4, canFeedRegime: true }],
  warnings: ['private-database-error'],
  selectedContext: { latest_observation: { case_id: 'private-case-id' } },
  canFeedRegime: true,
  canSupportAttractor: false,
};

test('public state preserves aggregate availability without leaking source rows', () => {
  const result = publicAmvStateProjection(fake);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.scope, 'scorefriction');
  assert.equal(result.evidenceSummary.count, 4);
  assert.equal(result.latestReading?.label, 'Observación agregada');
  assert.deepEqual(result.recentEvents, []);
  assert.equal(result.canFeedRegime, true);
  const serial = JSON.stringify(result);
  for (const privateValue of [
    'private-evidence-id','private-case-title','private-user-context','private-source',
    'private-raw-database-row','private-event-name','private-event-summary','private-database-error','private-case-id',
  ]) assert.equal(serial.includes(privateValue), false, `public output leaked: ${privateValue}`);
});

test('unknown scope errors retain their non-sensitive status', () => {
  const err = publicAmvStateProjection({ ok: false, error: 'unknown_scope', availableScopes: ['scorefriction'] });
  assert.deepEqual(err, { ok: false, error: 'unknown_scope', availableScopes: ['scorefriction'] });
});

test('both public API routes use the public projection before serialization', () => {
  for (const path of ['src/app/api/amv/state/route.ts','src/app/api/scorefriction/state/route.ts']) {
    const code = readFileSync(path, 'utf8');
    assert.match(code, /requireRootViewer\(/);
    assert.match(code, /publicAmvStateProjection\(/);
    assert.match(code, /'Cache-Control': 'private, no-store'/);
  }
});
