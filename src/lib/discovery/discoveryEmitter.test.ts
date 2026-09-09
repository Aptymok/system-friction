import assert from 'node:assert/strict';
import test from 'node:test';
import { SFI_CANONICAL_OBJECT_REGISTRY, canonicalPublicationDisposition } from './canonicalObjectRegistry';
import {
  discoveryAtomXml,
  discoveryEmissionEntries,
  discoveryEmissionReceipt,
  discoveryJsonFeed,
  discoveryMachineResources,
  discoveryRssXml,
  discoverySitemapEntries,
} from './discoveryEmitter';

test('discovery emitter projects only publicable canonical objects through synchronized machine surfaces', () => {
  const entries = discoveryEmissionEntries();
  assert.ok(entries.length > 0, 'expected at least one admitted public canonical object');
  assert.equal(new Set(entries.map((entry) => entry.objectKey)).size, entries.length);

  const blocked = SFI_CANONICAL_OBJECT_REGISTRY
    .filter((record) => canonicalPublicationDisposition(record).disposition === 'BLOCK')
    .map((record) => record.objectKey);
  for (const objectKey of blocked) assert.equal(entries.some((entry) => entry.objectKey === objectKey), false, `blocked object leaked: ${objectKey}`);

  const sitemap = discoverySitemapEntries();
  assert.deepEqual(sitemap.map((entry) => entry.url), entries.map((entry) => entry.canonicalUrl));
  assert.ok(sitemap.every((entry) => Number.isFinite(entry.lastModified.getTime())));

  const json = discoveryJsonFeed();
  assert.equal(json.items.length, entries.length);
  assert.equal(json._sfi.automaticCanon, false);
  assert.equal(json._sfi.automaticPublication, false);

  const rss = discoveryRssXml();
  const atom = discoveryAtomXml();
  assert.match(rss, /<rss version="2\.0"/);
  assert.match(atom, /<feed xmlns="http:\/\/www\.w3\.org\/2005\/Atom">/);
  assert.match(rss, new RegExp(entries[0].objectKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(atom, new RegExp(entries[0].canonicalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('emission receipt is deterministic, non-canonical and keeps IndexNow fail-closed', () => {
  const entry = discoveryEmissionEntries()[0];
  assert.ok(entry);
  const first = discoveryEmissionReceipt(entry.objectKey);
  const second = discoveryEmissionReceipt(entry.objectKey);
  assert.equal(first.contentHash, second.contentHash);
  assert.equal(first.state, 'READY');
  assert.equal(first.epistemicBoundary.externalRepresentationIsNotCanon, true);
  assert.equal(first.epistemicBoundary.automaticCanon, false);
  assert.equal(first.epistemicBoundary.automaticPublication, false);
  assert.equal(first.indexNow.state, 'NOT_CONFIGURED');
  assert.equal(first.indexNow.automaticNotification, false);
  assert.equal(first.lineage[0], entry.objectKey);

  const resources = discoveryMachineResources();
  assert.match(resources.rss, /\/feed\.xml$/);
  assert.match(resources.atom, /\/feed\.atom$/);
  assert.match(resources.jsonFeed, /\/feed\.json$/);
  assert.equal(resources.mcp.canonicalObjectsResource, 'sfi://canonical/objects');
});
