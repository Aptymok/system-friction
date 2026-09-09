import assert from 'node:assert/strict';
import test from 'node:test';
import { discoveryExposurePlan, discoveryExposureTargets } from './exposureProjection';
import { SFI_DISCOVERY_CRAWLER_POLICY, sfiRobotsRules } from './crawlerPolicy';

test('owned discovery surfaces are ready without claiming external publication', () => {
  const plan = discoveryExposurePlan();
  assert.equal(plan.contract, 'SFI-DISCOVERY-EXPOSURE-1.2');
  assert.equal(plan.boundary.automaticCanon, false);
  assert.equal(plan.boundary.automaticPublication, false);
  assert.equal(plan.boundary.automaticExternalAction, false);
  assert.equal(plan.boundary.externalPublicationLineageObjectScoped, true);
  assert.equal(plan.boundary.externalIdentityUrlUsesOriginAndPathBoundary, true);
  assert.ok(plan.targets.some((target) => target.key === 'ai-index' && target.state === 'READY_OWNED_SURFACE'));
  assert.ok(plan.targets.some((target) => target.key === 'public-mcp' && target.state === 'READY_OWNED_SURFACE'));
  assert.ok(plan.packets.every((packet) => packet.boundary.exposureIsNotCanon
    && packet.boundary.exposureIsNotPublicationReceipt
    && packet.boundary.publishedTargetsAreObjectScoped
    && packet.boundary.externalIdentityUrlUsesOriginAndPathBoundary));
});

test('claimed institution profiles require governed external action until an observed receipt exists', () => {
  const targets = discoveryExposureTargets();
  const medium = targets.find((target) => target.key === 'medium-profile');
  assert.ok(medium);
  assert.equal(medium.state, 'GOVERNED_EXTERNAL_ACTION_REQUIRED');
  assert.equal(medium.automaticPublication, false);
});

test('PUBLISHED is admitted only from an external URL + observed time receipt', () => {
  const withoutObservedTime = discoveryExposureTargets([{
    canonical_object_key: 'concept:system-friction',
    representation_kind: 'MEDIUM',
    state: 'PUBLISHED',
    external_url: 'https://medium.com/@systemfriction/example',
    content_hash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    observed_at: null,
    created_at: '2026-09-09T00:00:00.000Z',
  }], 'concept:system-friction');
  assert.equal(withoutObservedTime.find((target) => target.key === 'medium-profile')?.state, 'GOVERNED_EXTERNAL_ACTION_REQUIRED');

  const observed = discoveryExposureTargets([{
    canonical_object_key: 'concept:system-friction',
    representation_kind: 'MEDIUM',
    state: 'PUBLISHED',
    external_url: 'https://medium.com/@systemfriction/example',
    content_hash: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    observed_at: '2026-09-09T12:00:00.000Z',
    created_at: '2026-09-09T12:00:00.000Z',
  }], 'concept:system-friction');
  const medium = observed.find((target) => target.key === 'medium-profile');
  assert.equal(medium?.state, 'OBSERVED_PUBLISHED');
  assert.equal(medium?.url, 'https://medium.com/@systemfriction/example');
  assert.equal(medium?.canonicalObjectKey, 'concept:system-friction');
  assert.equal(medium?.observedAt, '2026-09-09T12:00:00.000Z');
});

test('an observed external publication cannot leak into another canonical object packet', () => {
  const representations = [{
    canonical_object_key: 'concept:system-friction',
    representation_kind: 'MEDIUM',
    state: 'PUBLISHED' as const,
    external_url: 'https://medium.com/@systemfriction/example',
    content_hash: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    observed_at: '2026-09-09T12:00:00.000Z',
    created_at: '2026-09-09T12:00:00.000Z',
  }];
  const correct = discoveryExposureTargets(representations, 'concept:system-friction');
  const unrelated = discoveryExposureTargets(representations, 'method:mihm');
  assert.equal(correct.find((target) => target.key === 'medium-profile')?.state, 'OBSERVED_PUBLISHED');
  assert.equal(unrelated.find((target) => target.key === 'medium-profile')?.state, 'GOVERNED_EXTERNAL_ACTION_REQUIRED');
  assert.equal(unrelated.find((target) => target.key === 'medium-profile')?.observedAt, null);
});

test('external identity matching rejects same-origin path-prefix collisions', () => {
  const collision = discoveryExposureTargets([{
    canonical_object_key: 'concept:system-friction',
    representation_kind: 'MEDIUM',
    state: 'PUBLISHED',
    external_url: 'https://medium.com/@systemfriction-fake/post',
    content_hash: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    observed_at: '2026-09-09T12:00:00.000Z',
    created_at: '2026-09-09T12:00:00.000Z',
  }], 'concept:system-friction');
  const medium = collision.find((target) => target.key === 'medium-profile');
  assert.ok(medium);
  assert.equal(medium.state, 'GOVERNED_EXTERNAL_ACTION_REQUIRED');
  assert.equal(medium.observedAt, null);
});

test('search discovery permission is distinct from model training/data reuse and API access is deny-by-default', () => {
  assert.equal(SFI_DISCOVERY_CRAWLER_POLICY.contract, 'SFI-DISCOVERY-CRAWLER-POLICY-1.1');
  assert.ok(SFI_DISCOVERY_CRAWLER_POLICY.searchDiscovery.bots.includes('OAI-SearchBot'));
  assert.ok(SFI_DISCOVERY_CRAWLER_POLICY.searchDiscovery.bots.includes('PerplexityBot'));
  assert.ok(SFI_DISCOVERY_CRAWLER_POLICY.searchDiscovery.disallow.includes('/api/'));
  assert.deepEqual(SFI_DISCOVERY_CRAWLER_POLICY.searchDiscovery.publicApiAllowlist, [
    '/api/external/v1/manifest',
    '/api/public/history',
  ]);
  assert.ok(SFI_DISCOVERY_CRAWLER_POLICY.modelTrainingDataReuse.bots.includes('GPTBot'));
  assert.ok(SFI_DISCOVERY_CRAWLER_POLICY.modelTrainingDataReuse.bots.includes('ClaudeBot'));
  assert.equal(SFI_DISCOVERY_CRAWLER_POLICY.modelTrainingDataReuse.state, 'DISALLOWED_BY_POLICY');
  assert.equal(SFI_DISCOVERY_CRAWLER_POLICY.authorityBoundary.crawlerAccessIsNotTrainingConsent, true);
  assert.equal(SFI_DISCOVERY_CRAWLER_POLICY.authorityBoundary.apiDiscoveryIsAllowlistedOnly, true);
  const searchBotRule = sfiRobotsRules().find((rule) => Array.isArray(rule.userAgent)
    && (rule.userAgent as readonly string[]).includes('OAI-SearchBot'));
  assert.ok(searchBotRule);
  assert.ok(searchBotRule.disallow?.includes('/api/'));
});
