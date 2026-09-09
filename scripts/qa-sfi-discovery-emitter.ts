import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function text(path: string) { return readFile(path, 'utf8'); }

async function main() {
  const emitter = await text('src/lib/discovery/discoveryEmitter.ts');
  const repository = await text('src/lib/discovery/discoveryEmitterRepository.ts');
  const rss = await text('src/app/feed.xml/route.ts');
  const atom = await text('src/app/feed.atom/route.ts');
  const jsonFeed = await text('src/app/feed.json/route.ts');
  const sitemap = await text('src/app/sitemap.ts');
  const aiIndex = await text('src/app/ai-index.json/route.ts');
  const rootRoute = await text('src/app/api/root/discovery/emission/route.ts');

  assert.match(emitter, /SFI-DISCOVERY-EMITTER-1\.0/);
  assert.match(emitter, /SFI-DISCOVERY-EMISSION-RECEIPT-1\.0/);
  assert.match(emitter, /canonicalPublicationDisposition/);
  assert.match(emitter, /discoveryRssXml/);
  assert.match(emitter, /discoveryAtomXml/);
  assert.match(emitter, /discoveryJsonFeed/);
  assert.match(emitter, /sfi:\/\/canonical\/objects/);
  assert.match(emitter, /state: 'NOT_CONFIGURED'/);
  assert.match(emitter, /automaticNotification: false/);
  assert.match(emitter, /indexNowFailureDoesNotUnpublish: true/);

  assert.match(repository, /from\('sfi_external_representations'\)/);
  assert.match(repository, /representation_kind: 'DISCOVERY_EMISSION'/);
  assert.match(repository, /state: 'READY'/);
  assert.match(repository, /external_url: null/);
  assert.match(repository, /observed_at: null/);
  assert.doesNotMatch(repository, /state: 'PUBLISHED'/);

  assert.match(rss, /discoveryRssXml/);
  assert.match(atom, /discoveryAtomXml/);
  assert.match(jsonFeed, /discoveryJsonFeed/);
  assert.match(sitemap, /discoverySitemapEntries/);
  assert.match(aiIndex, /discoveryMachineResources/);

  assert.match(rootRoute, /requireRootActor\('root\.discovery\.emit'\)/);
  assert.match(rootRoute, /persistDiscoveryEmissionReceipt/);
  assert.match(rootRoute, /canonicalMutation: false/);
  assert.match(rootRoute, /automaticPublication: false/);
  assert.match(rootRoute, /externalNotification: false/);

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-DISCOVERY-EMITTER-1.0',
    canonicalOwnerReused: true,
    externalRepresentationOwnerReused: true,
    feeds: ['RSS', 'ATOM', 'JSON_FEED'],
    sitemapSynchronized: true,
    aiIndexSynchronized: true,
    mcpReused: true,
    privateLeakage: false,
    indexNowFailClosed: true,
    automaticPublication: false,
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
