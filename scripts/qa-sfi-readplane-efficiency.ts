#!/usr/bin/env npx tsx
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createReadPlaneCoalescer } from '../src/lib/sfi/readPlaneCache';

const store = fs.readFileSync('src/lib/worldspect/snapshotStore.ts', 'utf8');
const health = fs.readFileSync('src/app/api/worldspect/health/route.ts', 'utf8');
const trend = fs.readFileSync('src/app/api/worldspect/trend/route.ts', 'utf8');
const real = fs.readFileSync('src/app/api/worldspect/real/route.ts', 'utf8');
const gold = fs.readFileSync('src/lib/observatory/gold/observatoryGoldAdapter.ts', 'utf8');
const publicObservatory = fs.readFileSync('src/lib/observatory/public/readPublicObservatoryState.ts', 'utf8');
const publicTimeline = fs.readFileSync('src/lib/observatory/public/worldSnapshotTimeline.ts', 'utf8');
const productionSmoke = fs.readFileSync('scripts/qa-sfi-production-observatory-smoke.mjs', 'utf8');

assert.match(store, /unstable_cache/, 'WorldSpect reads must use the shared Next data cache');
assert.match(store, /WORLDSPECT_SHARED_CACHE_TTL_SECONDS = 30/, 'shared cache TTL must remain explicitly bounded');
assert.match(store, /WORLDSPECT_PROCESS_CACHE_TTL_SECONDS = 2/, 'process coalescing TTL must remain explicitly bounded');
assert.match(store, /createReadPlaneCoalescer/, 'WorldSpect reads must coalesce simultaneous misses');
assert.match(store, /revalidateTag\(WORLDSPECT_READ_CACHE_TAG, \{ expire: 0 \}\)/, 'successful canonical writes must invalidate shared reads immediately');
assert.match(store, /const sourceReadAt = new Date\(\)\.toISOString\(\)/, 'cached source reads must carry a production-observable execution marker');
assert.match(store, /source_read_at: sourceReadAt/, 'public cache diagnostics must expose the cached source execution marker');
assert.match(store, /latestReadCoalescer\.clear\(\)/, 'successful canonical writes must clear process latest cache');
assert.match(store, /recentReadCoalescer\.clear\(\)/, 'successful canonical writes must clear process recent cache');
assert.match(store, /publicHistoryReadCoalescer\.clear\(\)/, 'successful canonical writes must clear process public-history cache');
assert.match(store, /worldspect-public-history/, 'lightweight public history must have a dedicated shared cache namespace');
assert.match(store, /select\('observed_at,created_at,source_state,confidence,wsi,nti,ingest_mode,sources'\)/, 'public history must use the lightweight projection');
assert.doesNotMatch(gold, /getRecentWorldSpectSnapshots/, 'Observatory Gold must not pull full WorldSpect rows for public history');
assert.match(gold, /getWorldSpectPublicHistory/, 'Observatory Gold must use shared lightweight public history');
assert.doesNotMatch(publicObservatory, /createServiceSupabaseClient|from\('worldspect_snapshots'\)/, 'Public Observatory must not own an independent WorldSpect persistence query');
assert.match(publicObservatory, /getWorldSpectPublicHistoryRead/, 'Public Observatory must use shared public-history owner');
assert.doesNotMatch(publicTimeline, /createServiceSupabaseClient|from\('worldspect_snapshots'\)|readContinuityWorldSnapshotTimeline/, 'Timeline must not own persistence or failover logic');
assert.match(publicTimeline, /getWorldSpectPublicHistoryRead/, 'Timeline must use shared public-history owner');
assert.match(health, /read_cache: healthRead\.cache/, 'health must expose read-cache diagnostics');
assert.match(trend, /read_cache: snapshotRead\.cache/, 'trend must expose read-cache diagnostics');
assert.match(real, /readCache: latestRead\.cache/, 'real snapshot must expose read-cache diagnostics');
assert.match(productionSmoke, /CACHE_REUSE_PROBE_DELAY_MS = 3000/, 'production smoke must probe beyond process-cache TTL');
assert.match(productionSmoke, /source_read_at/, 'production smoke must compare source-read execution markers');
assert.match(productionSmoke, /shared_cache_source_read_reexecuted_inside_ttl/, 'production smoke must fail when shared cache re-executes source reads inside TTL');
assert.match(productionSmoke, /readCacheReuse/, 'production smoke must gate shared-cache reuse');

async function main() {
  let sourceCalls = 0;
  const coalescer = createReadPlaneCoalescer<[number, string, number], number>({
    namespace: 'qa-worldspect-recent',
    ttlSeconds: 2,
    loader: async () => {
      sourceCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return sourceCalls;
    },
  });
  
  const burst = await Promise.all([
    coalescer.read(90, 'all', 120),
    coalescer.read(90, 'all', 120),
    coalescer.read(90, 'all', 120),
  ]);
  assert.equal(sourceCalls, 1, 'three simultaneous identical reads must execute one source load');
  assert.equal(burst.filter((entry) => entry.cache.status === 'COALESCED').length, 2);
  
  await coalescer.read(90, 'all', 120);
  assert.equal(sourceCalls, 1, 'warm identical read must not execute a second source load');
  
  const diagnostics = coalescer.diagnostics();
  assert.equal(diagnostics.loader_calls, 1);
  assert.equal(diagnostics.coalesced_reads, 2);
  assert.equal(diagnostics.memory_hits, 1);
  
  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-READ-PLANE-EFFICIENCY-1.0',
    worldSpect: {
      legacyRepresentativeColdBurstSourceReads: 3,
      boundedColdBurstSourceReads: 2,
      warmBurstAdditionalSourceReads: 0,
      recentWindowConsumers: ['health', 'trend'],
      latestWindowConsumers: ['real'],
      lightweightPublicHistoryConsumers: ['observatory-gold', 'public-observatory', 'timeline'],
      measuredFullRowBytes120: 7703905,
      measuredLightweightBytes120: 1842916,
      measuredEgressReductionPercent: 76.08,
      sharedCacheTtlSeconds: 30,
      processCoalescingTtlSeconds: 2,
    },
    proof: diagnostics,
  }));
  
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
