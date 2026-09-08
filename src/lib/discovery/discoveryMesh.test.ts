import assert from 'node:assert/strict';
import test from 'node:test';
import {
  discoveryMetrics,
  normalizeOpenSourceFeedItem,
  observeDiscovery,
} from './discoveryMesh';

const canonicalSource = {
  sourceId: 'search:test',
  sourceUrl: 'https://search.example/result',
  publisher: 'Example Search',
  platform: 'example-search',
  providerClass: 'SEARCH' as const,
  independent: true,
};

const aiSource = {
  sourceId: 'ai:test',
  sourceUrl: 'https://ai.example/answer',
  publisher: 'Example AI',
  platform: 'example-ai',
  providerClass: 'AI' as const,
  independent: true,
};

test('query mode does not fabricate canonical candidates while the public registry is empty', () => {
  const observed = observeDiscovery({ mode: 'query', query: 'friction evidence governed inference' });
  assert.equal(observed.contract, 'SFI-DISCOVERY-OBSERVATION-1.0');
  assert.equal(observed.candidates.length, 0);
  assert.equal(observed.externalRepresentations.length, 0);
  assert.equal(observed.epistemicBoundary.candidatesAreCanonical, false);
  assert.equal(observed.epistemicBoundary.automaticCanon, false);
  assert.equal(observed.epistemicBoundary.automaticPublication, false);
  assert.equal(observed.epistemicBoundary.automaticExecution, false);
});

test('distinct_intent requires explicit intent rather than guessing it', () => {
  assert.throws(() => observeDiscovery({ mode: 'distinct_intent', query: 'complex system' }), /DISTINCT_INTENT_REQUIRED/);
  const observed = observeDiscovery({ mode: 'distinct_intent', query: 'complex system', intent: 'measure structural friction' });
  assert.equal(observed.intent, 'measure structural friction');
});

test('malformed optional feed metadata degrades the candidate instead of destroying source identity', () => {
  const candidate = normalizeOpenSourceFeedItem({ platform: 'feed:test', title: 'Signal', url: 'not-a-url' });
  assert.equal(candidate.availability, 'DEGRADED');
  assert.equal(candidate.source.platform, 'feed:test');
  assert(candidate.provenance.length === 1);
  assert(candidate.degradationReasons.includes('SOURCE_URL_MISSING_OR_INVALID'));
  assert(candidate.degradationReasons.includes('SUMMARY_MISSING'));
});

test('all discovery metrics preserve NOT_OBSERVED separately from numeric zero', () => {
  const metrics = discoveryMetrics([]);
  assert.equal(metrics.UDR.availability, 'NOT_OBSERVED');
  assert.equal(metrics.UDR.value, null);
  assert.equal(metrics.EIC.value, null);
  assert.equal(metrics.IRD.value, null);
  assert.equal(metrics.ACR.R.value, null);
  assert.equal(metrics.ACR.A.value, null);
  assert.equal(metrics.ACR.C.value, null);
  assert.equal(metrics.ECR.NAME.value, null);
  assert.equal(metrics.ECR.DOMAIN.value, null);
  assert.equal(metrics.ECR.METHOD.value, null);
  assert.equal(metrics.ECR.ENTITY.value, null);
  assert.equal(metrics.MPD.value, null);
  assert.equal(metrics.ERR.value, null);
});

test('AVAILABLE + observed failure may emit real zero without converting unavailable to zero', () => {
  const metrics = discoveryMetrics([{
    observationId: 'obs-zero',
    source: canonicalSource,
    observedAt: '2026-09-08T00:00:00Z',
    query: 'unbranded systemic observation problem',
    unbranded: true,
    retrieved: false,
    status: 'AVAILABLE',
  }]);
  assert.equal(metrics.UDR.availability, 'AVAILABLE');
  assert.equal(metrics.UDR.value, 0);
  assert.equal(metrics.UDR.denominator, 1);
  assert.equal(metrics.EIC.value, null);
});

test('UDR EIC IRD ACR ECR MPD ERR are derived only from eligible observed retrieval tests', () => {
  const metrics = discoveryMetrics([
    {
      observationId: 'obs-search',
      source: canonicalSource,
      observedAt: '2026-09-08T00:00:00Z',
      query: 'evidence governed complex systems institute',
      unbranded: true,
      retrieved: true,
      reconstructedFields: {
        name: 'System Friction Institute',
        domain: 'https://systemfriction.org',
        entityId: 'https://systemfriction.org/#sfi',
      },
      references: [
        { url: 'https://independent.example/reference', independent: true },
        { url: 'https://systemfriction.org/institution', independent: false },
      ],
      collisions: [
        { dimension: 'NAME', observed: false, value: null },
        { dimension: 'DOMAIN', observed: false, value: null },
        { dimension: 'METHOD', observed: true, value: 'ambiguous acronym' },
        { dimension: 'ENTITY', observed: false, value: null },
      ],
      propagationPlatforms: ['search', 'academic'],
    },
    {
      observationId: 'obs-ai',
      source: aiSource,
      observedAt: '2026-09-08T00:01:00Z',
      query: 'evidence governed complex systems institute',
      unbranded: true,
      retrieved: true,
      attributedEntityName: 'System Friction Institute',
      citedCanonicalUrl: 'https://systemfriction.org/concepts/system-friction',
      reconstructedFields: {
        name: 'System Friction Institute',
        domain: 'https://systemfriction.org',
        entityId: 'https://systemfriction.org/#sfi',
      },
      propagationPlatforms: ['ai', 'search'],
    },
    {
      observationId: 'obs-unavailable',
      source: canonicalSource,
      observedAt: '2026-09-08T00:02:00Z',
      query: 'ignored',
      unbranded: true,
      retrieved: false,
      status: 'UNAVAILABLE',
    },
  ]);
  assert.equal(metrics.UDR.value, 1);
  assert.equal(metrics.EIC.value, 1);
  assert.equal(metrics.IRD.value, 0.5);
  assert.equal(metrics.ACR.R.value, 1);
  assert.equal(metrics.ACR.A.value, 1);
  assert.equal(metrics.ACR.C.value, 1);
  assert.equal(metrics.ECR.NAME.value, 0);
  assert.equal(metrics.ECR.METHOD.value, 1);
  assert.equal(metrics.MPD.value, 3);
  assert.equal(metrics.ERR.value, 1);
});

test('open_source mode retains feed provenance and degradation alongside canonical candidates', () => {
  const observed = observeDiscovery({
    mode: 'open_source',
    query: 'governed observation',
    feedItems: [
      { id: 'feed-1', platform: 'rss:test', url: 'https://example.org/item', title: 'Governed observation in systems', summary: 'External candidate.', publisher: 'Independent publisher', publishedAt: '2026-09-07T00:00:00Z' },
      { id: 'feed-2', platform: 'rss:test', title: 'Malformed but retained' },
    ],
  });
  const external = observed.candidates.filter((candidate) => candidate.candidateClass === 'OPEN_SOURCE_CANDIDATE');
  assert.equal(external.length, 2);
  assert.equal(external[0]?.canonical, false);
  assert(external.some((candidate) => candidate.availability === 'DEGRADED'));
  assert.equal(observed.state, 'DEGRADED');
});
