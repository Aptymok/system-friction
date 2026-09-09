import assert from 'node:assert/strict';
import test from 'node:test';
import { discoveryExposurePlan, discoveryExposureTargets } from './exposureProjection';
import { SFI_DISCOVERY_CRAWLER_POLICY } from './crawlerPolicy';

test('owned discovery surfaces are ready without claiming external publication', () => {
  const plan = discoveryExposurePlan();
  assert.equal(plan.contract, 'SFI-DISCOVERY-EXPOSURE-1.0');
  assert.equal(plan.boundary.automaticCanon, false);
  assert.equal(plan.boundary.automaticPublication, false);
  assert.equal(plan.boundary.automaticExternalAction, false);
  assert.ok(plan.targets.some((target) => target.key === 'ai-index' && target.state === 'READY_OWNED_SURFACE'));
  assert.ok(plan.targets.some((target) => target.key === 'public-mcp' && target.state === 'READY_OWNED_SURFACE'));
  assert.ok(plan.packets.every((packet) => packet.boundary.exposureIsNotCanon && packet.boundary.exposureIsNotPublicationReceipt));
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
  }]);
  assert.equal(withoutObservedTime.find((target) => target.key === 'medium-profile')?.state, 'GOVERNED_EXTERNAL_ACTION_REQUIRED');

  const observed = discoveryExposureTargets([{
    canonical_object_key: 'concept:system-friction',
    representation_kind: 'MEDIUM',
    state: 'PUBLISHED',
    external_url: 'https://medium.com/@systemfriction/example',
    content_hash: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    observed_at: '2026-09-09T12:00:00.000Z',
    created_at: '2026-09-09T12:00:00.000Z',
  }]);
  const medium = observed.find((target) => target.key === 'medium-profile');
  assert.equal(medium?.state, 'OBSERVED_PUBLISHED');
  assert.equal(medium?.url, 'https://medium.com/@systemfriction/example');
});

test('search discovery permission is distinct from model training/data reuse', () => {
  assert.ok(SFI_DISCOVERY_CRAWLER_POLICY.searchDiscovery.bots.includes('OAI-SearchBot'));
  assert.ok(SFI_DISCOVERY_CRAWLER_POLICY.searchDiscovery.bots.includes('PerplexityBot'));
  assert.ok(SFI_DISCOVERY_CRAWLER_POLICY.modelTrainingDataReuse.bots.includes('GPTBot'));
  assert.ok(SFI_DISCOVERY_CRAWLER_POLICY.modelTrainingDataReuse.bots.includes('ClaudeBot'));
  assert.equal(SFI_DISCOVERY_CRAWLER_POLICY.modelTrainingDataReuse.state, 'DISALLOWED_BY_POLICY');
  assert.equal(SFI_DISCOVERY_CRAWLER_POLICY.authorityBoundary.crawlerAccessIsNotTrainingConsent, true);
});
