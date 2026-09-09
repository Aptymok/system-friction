import assert from 'node:assert/strict';
import test from 'node:test';
import { SFI_PUBLIC_PROFILE } from '../public/institutionProfile';
import {
  SFI_CANONICAL_OBJECT_CONTRACT,
  SFI_CANONICAL_OBJECT_REGISTRY,
  canonicalObjectKey,
  canonicalPublicationDisposition,
  canonicalUrlFor,
  type SfiCanonicalObjectRecord,
} from './canonicalObjectRegistry';
import {
  discoveryAtomXml,
  discoveryEmissionEntries,
  discoveryEmissionReceipt,
  discoveryJsonFeed,
  discoveryMachineResources,
  discoveryRssXml,
  discoverySitemapEntries,
} from './discoveryEmitter';

function publicFixture(): SfiCanonicalObjectRecord {
  const sourceRef = 'source:fixture:discovery-emitter';
  const slug = 'fixture-discovery-emitter';
  return {
    contract: SFI_CANONICAL_OBJECT_CONTRACT,
    id: 'sfi-object-discovery-emitter-fixture',
    objectKey: canonicalObjectKey('REPORT', slug),
    objectType: 'REPORT',
    slug,
    canonicalUrl: canonicalUrlFor('REPORT', slug),
    title: 'Discovery Emitter Fixture',
    summary: 'Deterministic publicable fixture used only to falsify discovery emission behavior.',
    bodyRef: null,
    epistemicState: 'DECLARED',
    version: '1.0.0',
    language: 'en',
    authors: ['System Friction Institute'],
    methods: [],
    relatedObjects: [],
    sourceRefs: [sourceRef],
    publicState: 'PUBLIC',
    license: 'CC BY 4.0',
    createdAt: '2026-09-09T00:00:00.000Z',
    updatedAt: '2026-09-09T00:00:00.000Z',
    entity: {
      entityId: SFI_PUBLIC_PROFILE.institution.entityId,
      relation: 'PUBLISHED_BY',
    },
    publication: { state: 'PUBLISHED', explicit: true },
    eligibility: {
      privacyClass: 'PUBLIC',
      publicEligible: true,
      securityEligible: true,
    },
    rights: { state: 'OPEN' },
    evidenceIdentity: { state: 'VALID', refs: [sourceRef] },
    limitations: [],
    missing: [],
  };
}

test('discovery emitter preserves an authoritative empty public registry without fabrication', () => {
  const entries = discoveryEmissionEntries();
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

  if (entries.length === 0) {
    assert.deepEqual(sitemap, []);
    assert.deepEqual(json.items, []);
    assert.doesNotMatch(rss, /<item>/);
    assert.doesNotMatch(atom, /<entry>/);
  }
});

test('publicable fixture is synchronized across feed, sitemap and receipt projections', () => {
  const fixture = publicFixture();
  const records = [fixture];
  const entries = discoveryEmissionEntries(records);
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.objectKey, fixture.objectKey);

  const sitemap = discoverySitemapEntries(records);
  assert.deepEqual(sitemap.map((entry) => entry.url), [fixture.canonicalUrl]);

  const json = discoveryJsonFeed(records);
  assert.equal(json.items[0]?.id, fixture.objectKey);
  assert.equal(json.items[0]?.url, fixture.canonicalUrl);

  const rss = discoveryRssXml(records);
  const atom = discoveryAtomXml(records);
  assert.match(rss, new RegExp(fixture.objectKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(atom, new RegExp(fixture.canonicalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const first = discoveryEmissionReceipt(fixture.objectKey, records);
  const second = discoveryEmissionReceipt(fixture.objectKey, records);
  assert.equal(first.contentHash, second.contentHash);
  assert.equal(first.state, 'READY');
  assert.equal(first.epistemicBoundary.externalRepresentationIsNotCanon, true);
  assert.equal(first.epistemicBoundary.automaticCanon, false);
  assert.equal(first.epistemicBoundary.automaticPublication, false);
  assert.equal(first.indexNow.state, 'NOT_CONFIGURED');
  assert.equal(first.indexNow.automaticNotification, false);
  assert.equal(first.lineage[0], fixture.objectKey);
});

test('machine-resource map reuses public MCP and keeps IndexNow fail closed', () => {
  const resources = discoveryMachineResources();
  assert.match(resources.rss, /\/feed\.xml$/);
  assert.match(resources.atom, /\/feed\.atom$/);
  assert.match(resources.jsonFeed, /\/feed\.json$/);
  assert.equal(resources.mcp.canonicalObjectsResource, 'sfi://canonical/objects');
  assert.equal(resources.indexNow.state, 'NOT_CONFIGURED');
  assert.equal(resources.indexNow.automaticNotification, false);
});
