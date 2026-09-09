import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function text(path: string) { return readFile(path, 'utf8'); }

async function main() {
  const exposure = await text('src/lib/discovery/exposureProjection.ts');
  const crawlers = await text('src/lib/discovery/crawlerPolicy.ts');
  const control = await text('src/lib/discovery/discoveryControlPlane.ts');
  const api = await text('src/app/api/root/discovery/route.ts');
  const page = await text('src/app/root/discovery/page.tsx');
  const robots = await text('src/app/robots.ts');
  const aiPolicy = await text('src/app/ai-policy/route.ts');
  const aiIndex = await text('src/app/ai-index.json/route.ts');
  const emitter = await text('src/lib/discovery/discoveryEmitter.ts');
  const identity = await text('src/lib/public/institutionProfile.ts');
  const migration = await text('supabase/migrations/20260908004000_create_sfi_discovery_observation_plane.sql');

  assert.match(exposure, /SFI-DISCOVERY-EXPOSURE-1\.0/);
  assert.match(exposure, /SFI-EXPOSURE-PACKET-1\.0/);
  assert.match(exposure, /discoveryEmissionEntries/);
  assert.match(exposure, /SFI_EXTERNAL_IDENTITY_NODES/);
  assert.match(exposure, /exposureIsNotCanon: true/);
  assert.match(exposure, /exposureIsNotPublicationReceipt: true/);
  assert.match(exposure, /automaticExternalAction: false/);
  assert.match(exposure, /externalActionRequiresGovernedAdapterOrHuman: true/);
  assert.match(exposure, /state === 'PUBLISHED'/);
  assert.match(exposure, /row\.external_url/);
  assert.match(exposure, /row\.observed_at/);
  assert.doesNotMatch(exposure, /\.insert\(|\.upsert\(|\.update\(/, 'Exposure projection must not become a persistence writer');

  for (const bot of ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'PerplexityBot']) assert.match(crawlers, new RegExp(bot));
  for (const bot of ['GPTBot', 'CCBot', 'ClaudeBot', 'Google-Extended']) assert.match(crawlers, new RegExp(bot));
  assert.match(crawlers, /ALLOWED_PUBLIC_ONLY/);
  assert.match(crawlers, /DISALLOWED_BY_POLICY/);
  assert.match(crawlers, /crawlerAccessIsNotTrainingConsent: true/);
  assert.match(crawlers, /privateMaterialNeverPromotedByCrawlerPolicy: true/);
  assert.match(robots, /sfiRobotsRules/);
  assert.doesNotMatch(robots, /GPTBot|ClaudeBot|PerplexityBot|Google-Extended/, 'robots.ts must consume the canonical crawler-policy owner instead of duplicating it');
  assert.match(aiPolicy, /DISCOVERY \/ EXPOSURE/);
  assert.match(aiPolicy, /Discovery permission is intentionally separate from permission for model training or bulk data reuse/);

  assert.match(control, /SFI-DISCOVERY-CONTROL-PLANE-1\.1/);
  assert.match(control, /from\('sfi_external_representations'\)/);
  assert.match(control, /from\('sfi_discovery_query_runs'\)/);
  assert.match(control, /from\('sfi_entity_collisions'\)/);
  assert.match(control, /dbQueries: 3/);
  assert.match(control, /exactCountProbes: 0/);
  assert.match(control, /pollingLoops: 0/);
  assert.match(control, /nPlusOneReads: 0/);
  assert.match(control, /totalCountUnknownOnInteractiveRead: true/);
  assert.match(control, /unavailableIsNotZero: true/);
  assert.doesNotMatch(control, /count\s*:\s*['"]exact['"]/, 'ROOT Discovery interactive read may not exact-count tables');
  assert.doesNotMatch(control, /head\s*:\s*true/, 'ROOT Discovery interactive read may not use HEAD health probes');
  assert.doesNotMatch(control, /setInterval|setTimeout\(|fetch\(/, 'ROOT Discovery read plane must not create polling/fanout HTTP owners');

  assert.match(api, /requireRootViewer\('root\.discovery\.read'\)/);
  assert.match(api, /readDiscoveryControlPlane/);
  assert.match(api, /private, no-store/);
  assert.match(page, /requireRootObserverPage\('\/root\/discovery'\)/);
  assert.match(page, /Discovery \+ Exposure/);
  assert.match(page, /exact counts:/);
  for (const section of ['Entity health', 'AI discovery', 'Crawlers', 'Academic graph', 'Propagation receipts', 'Collisions', 'Failed publications']) assert.match(page, new RegExp(section));

  assert.match(aiIndex, /discoveryExposurePlan/);
  assert.match(aiIndex, /exposure:/);
  assert.match(aiIndex, /Exposure\/discovery does not imply publication, validation, authority or model-training permission/);

  assert.match(emitter, /SFI-DISCOVERY-EMITTER-1\.0/);
  assert.match(identity, /SFI_EXTERNAL_IDENTITY_NODES/);
  assert.match(migration, /public\.sfi_external_representations/);
  assert.doesNotMatch(exposure, /create table|sfi_canonical_objects|sfi_external_nodes/, 'Exposure must reuse existing owners and cannot create parallel canon/identity tables');

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-DISCOVERY-EXPOSURE-QA-1.1',
    canonicalOwnerReused: true,
    externalIdentityOwnerReused: true,
    externalRepresentationOwnerReused: true,
    rootControlPlane: true,
    dbQueries: 3,
    exactCountProbes: 0,
    pollingLoops: 0,
    trainingReuseSeparatedFromSearchDiscovery: true,
    automaticPublication: false,
    automaticCanon: false,
    automaticExternalAction: false,
    falsePublicationReceipt: false,
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
