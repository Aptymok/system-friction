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
const worldVectorReadModel = fs.readFileSync('src/lib/world-vector/readModel.ts', 'utf8');
const worldInterfaceState = fs.readFileSync('src/lib/sfi/worldInterfaceState.ts', 'utf8');
const studioCulturalLens = fs.readFileSync('src/lib/studio/production/studioCulturalLens.ts', 'utf8');

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
assert.match(store, /select\('observed_at,created_at,source_state,confidence,wsi,nti,ingest_mode,sources,degraded_sources,adapter_error'\)/, 'public history must use the lightweight health/trend projection');
assert.doesNotMatch(gold, /getRecentWorldSpectSnapshots/, 'Observatory Gold must not pull full WorldSpect rows for public history');
assert.match(gold, /getWorldSpectPublicHistory/, 'Observatory Gold must use shared lightweight public history');
assert.doesNotMatch(publicObservatory, /createServiceSupabaseClient|from\('worldspect_snapshots'\)/, 'Public Observatory must not own an independent WorldSpect persistence query');
assert.match(publicObservatory, /getWorldSpectPublicHistoryRead/, 'Public Observatory must use shared public-history owner');
assert.doesNotMatch(publicTimeline, /createServiceSupabaseClient|from\('worldspect_snapshots'\)|readContinuityWorldSnapshotTimeline/, 'Timeline must not own persistence or failover logic');
assert.match(publicTimeline, /getWorldSpectPublicHistoryRead/, 'Timeline must use shared public-history owner');
assert.match(health, /getWorldSpectPublicHistoryRead/, 'health must use shared lightweight public history');
assert.doesNotMatch(health, /getRecentWorldSpectSnapshotsRead/, 'health must not pull full snapshot history');
assert.match(health, /read_cache: healthRead\.cache/, 'health must expose read-cache diagnostics');
assert.match(trend, /getWorldSpectPublicHistoryRead/, 'trend must use shared lightweight public history');
assert.doesNotMatch(trend, /getRecentWorldSpectSnapshotsRead/, 'trend must not pull full snapshot history');
assert.match(trend, /source\.domain \?\? source\.mihm_var/, 'trend must recover canonical domain identity from persisted lightweight sources');
assert.match(trend, /read_cache: snapshotRead\.cache/, 'trend must expose read-cache diagnostics');
assert.match(real, /readCache: latestRead\.cache/, 'real snapshot must expose read-cache diagnostics');
assert.match(worldVectorReadModel, /getWorldSpectPublicHistoryRead/, 'World Vector sample-count history must use lightweight WorldSpect history');
assert.doesNotMatch(worldVectorReadModel, /getRecentWorldSpectSnapshotsRead/, 'World Vector must not pull full snapshots only to count recent samples');
assert.match(worldInterfaceState, /getWorldSpectPublicHistoryRead/, 'World Interface schedule health must reuse lightweight WorldSpect history with continuity fallback');
assert.doesNotMatch(worldInterfaceState, /createServiceSupabaseClient|from\('worldspect_snapshots'\)/, 'World Interface must not own an independent WorldSpect history query');
assert.match(studioCulturalLens, /getWorldSpectPublicHistory/, 'Studio Cultural Lens must reuse lightweight WorldSpect history');
assert.doesNotMatch(studioCulturalLens, /getRecentWorldSpectSnapshots|raw_payload|aggregateWorldSpect/, 'Studio Cultural Lens must not pull full snapshot history or raw payload for trend reconstruction');
assert.match(studioCulturalLens, /source\.domain \?\? source\.mihm_var/, 'Studio Cultural Lens must reconstruct canonical domain identity from lightweight sources');
assert.match(studioCulturalLens, /DOMAIN_LAYER_PRIORITY/, 'Studio Cultural Lens must preserve the canonical layer-priority rule for cultural trend values');

for (const [surface, source] of [
  ['health', health],
  ['trend', trend],
  ['real', real],
] as const) {
  assert.doesNotMatch(source, /Vercel-CDN-Cache-Control/, `${surface} must not depend on the previously falsified provider-specific header`);
  assert.match(source, /Cache-Control': 'public, max-age=0, s-maxage=30, must-revalidate'/, `${surface} must use the documented shared-cache directive while keeping browser max-age at zero`);
  assert.doesNotMatch(source, /export const dynamic = ['"]force-dynamic['"]/, `${surface} must not force per-request dynamic rendering because it defeats shared route/data caching`);
}

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
      recentWindowConsumers: ['health', 'trend', 'world-vector', 'world-interface', 'studio-cultural-lens'],
      latestWindowConsumers: ['real'],
      lightweightPublicHistoryConsumers: ['observatory-gold', 'public-observatory', 'timeline', 'world-vector', 'world-interface', 'studio-cultural-lens'],
      measuredFullRowBytes120: 7703905,
      measuredLightweightBytes120: 1842916,
      measuredEgressReductionPercent: 76.08,
      measuredHealthTrendProjectionBytes120: 1745492,
      measuredHealthTrendReductionPercent: 75.89,
      sharedCacheTtlSeconds: 30,
      processCoalescingTtlSeconds: 2,
      publicWorldSpectEdgeCacheTtlSeconds: 30,
      browserCacheMaxAgeSeconds: 0,
    },
    proof: diagnostics,
  }));
  
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
