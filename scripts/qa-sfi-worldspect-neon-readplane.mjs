#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const continuity = fs.readFileSync('src/lib/sfi/continuityPostgres.ts', 'utf8');
const store = fs.readFileSync('src/lib/worldspect/snapshotStore.ts', 'utf8');
const health = fs.readFileSync('src/app/api/worldspect/health/route.ts', 'utf8');
const trend = fs.readFileSync('src/app/api/worldspect/trend/route.ts', 'utf8');
const real = fs.readFileSync('src/app/api/worldspect/real/route.ts', 'utf8');
const pulse = fs.readFileSync('scripts/qa-world-vector-pulse.mjs', 'utf8');

assert.match(continuity, /readContinuityLatestWorldSpectSnapshot/, 'latest snapshot continuity reader missing');
assert.match(continuity, /readContinuityWorldSpectSnapshotAtOrBefore/, 'historical snapshot continuity reader missing');
assert.match(continuity, /readContinuityRecentWorldSpectSnapshots/, 'recent snapshot continuity reader missing');
assert.match(continuity, /order by observed_at desc[\s\S]*limit \$\{input\.limit\}[\s\S]*\) recent[\s\S]*order by observed_at asc/, 'continuity recent snapshot read must select newest bounded window and return chronological order');

assert.match(store, /readPlane: 'NEON'/, 'snapshot store must expose Neon fallback');
assert.match(store, /if \(error && isSfiContinuityConfigured\(\)\)/, 'snapshot reads must fall back only after a primary error');
assert.match(store, /readPlane: 'UNAVAILABLE'/, 'snapshot reads must expose unavailable continuity instead of throwing');
assert.match(store, /order\('observed_at', \{ ascending: false \}\)\.limit\(limit\)/, 'primary recent snapshot read must select newest bounded window');
assert.match(store, /data\.slice\(\)\.reverse\(\)\.map/, 'primary newest window must be restored to chronological order');
assert.match(store, /continuity_read_failed/, 'snapshot reads must retain continuity failure diagnostics');

const upsertStart = store.indexOf('export async function upsertWorldSpectSnapshot');
assert.ok(upsertStart >= 0, 'canonical WorldSpect upsert missing');
const upsertBlock = store.slice(upsertStart, store.indexOf('export function snapshotRowToApiData', upsertStart));
assert.doesNotMatch(upsertBlock, /continuity|NEON|readContinuity/i, 'canonical WorldSpect writer must not be redirected to Neon');

assert.match(health, /DEGRADED_CONTINUITY/, 'health must expose controlled continuity degradation');
assert.match(health, /read_plane/, 'health must expose read plane');
assert.match(health, /healthRead\.readPlane === 'SUPABASE' \? await alertTableWarnings\(\) : \[\]/, 'health must not re-enter Supabase-only alert reads after continuity fallback');
assert.match(trend, /getRecentWorldSpectSnapshotsRead/, 'trend must use read-plane-aware snapshot reader');
assert.match(trend, /read_plane/, 'trend must expose read plane');
assert.match(real, /getLatestWorldSpectSnapshotRead/, 'real snapshot must use read-plane-aware reader');
assert.match(real, /readPlane/, 'real snapshot must expose read plane');
assert.match(pulse, /WORLD_VECTOR_PULSE_QA_DEGRADED_CONTINUITY/, 'pulse QA must distinguish controlled continuity degradation');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-WORLDSPECT-NEON-READPLANE-1.0',
  primaryWriter: 'SUPABASE',
  continuityReadFallback: true,
  continuityWriteExpansion: false,
}));
