#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const continuity = fs.readFileSync('src/lib/sfi/continuityPostgres.ts', 'utf8');
const store = fs.readFileSync('src/lib/worldspect/snapshotStore.ts', 'utf8');
const health = fs.readFileSync('src/app/api/worldspect/health/route.ts', 'utf8');
const trend = fs.readFileSync('src/app/api/worldspect/trend/route.ts', 'utf8');
const real = fs.readFileSync('src/app/api/worldspect/real/route.ts', 'utf8');
const pulse = fs.readFileSync('scripts/qa-world-vector-pulse.mjs', 'utf8');
const worldCron = fs.readFileSync('.github/workflows/worldspect-cron.yml', 'utf8');
const worldVectorReadModel = fs.readFileSync('src/lib/world-vector/readModel.ts', 'utf8');
const worldVectorOperational = fs.readFileSync('src/lib/world-vector/operationalState.ts', 'utf8');

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

assert.match(health, /getWorldSpectPublicHistoryRead/, 'health must use lightweight shared history reader');
assert.match(health, /DEGRADED_CONTINUITY/, 'health must expose controlled continuity degradation');
assert.match(health, /read_plane/, 'health must expose read plane');
assert.match(health, /healthRead\.readPlane === 'SUPABASE' \? await alertTableWarnings\(\) : \[\]/, 'health must not re-enter Supabase-only alert reads after continuity fallback');
assert.match(trend, /getWorldSpectPublicHistoryRead/, 'trend must use read-plane-aware lightweight history reader');
assert.match(trend, /read_plane/, 'trend must expose read plane');
assert.match(real, /getLatestWorldSpectSnapshotRead/, 'real snapshot must use read-plane-aware reader');
assert.match(real, /readPlane/, 'real snapshot must expose read plane');
assert.match(pulse, /WORLD_VECTOR_PULSE_QA_DEGRADED_CONTINUITY/, 'pulse QA must distinguish controlled continuity degradation');
assert.match(pulse, /WORLD_VECTOR_PULSE_QA_BLOCKED_BY_EGRESS_POLICY/, 'pulse QA must distinguish an intentionally blocked scheduled cycle from an executed observation failure');
assert.match(pulse, /restricted_read_plane_unavailable/, 'blocked scheduled cycle must still fail when the WorldSpect read plane is unavailable');
assert.match(worldCron, /SFI_WORLD_CYCLE_EXECUTION_STATE/, 'world cron must propagate scheduled execution state into pulse QA');
assert.match(worldCron, /SFI_WORLD_CYCLE_MIXED_EGRESS_STATE/, 'world cron must fail closed when only part of the scheduled cycle is egress-restricted');
assert.match(worldVectorReadModel, /getLatestWorldSpectSnapshotRead/, 'World Vector latest observation must preserve WorldSpect read-plane provenance');
assert.match(worldVectorReadModel, /getWorldSpectPublicHistoryRead/, 'World Vector history must preserve WorldSpect read-plane provenance through the lightweight shared reader');
assert.doesNotMatch(worldVectorReadModel, /getRecentWorldSpectSnapshotsRead/, 'World Vector history must not require full WorldSpect rows merely to preserve read-plane provenance');
assert.match(worldVectorReadModel, /read_provenance/, 'World Vector read model must expose provenance instead of discarding it');
assert.match(worldVectorReadModel, /world_vector_latest_primary_degraded/, 'World Vector must surface primary latest-read degradation');
assert.match(worldVectorReadModel, /world_vector_history_primary_degraded/, 'World Vector must surface primary history-read degradation');
assert.match(worldVectorOperational, /read_provenance: today\.read_provenance/, 'World Vector operational audit must retain read provenance');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-WORLDSPECT-NEON-READPLANE-1.1',
  primaryWriter: 'SUPABASE',
  continuityReadFallback: true,
  continuityWriteExpansion: false,
}));
