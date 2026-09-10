import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function text(path: string) { return readFile(path, 'utf8'); }

async function main() {
  const exposure = await text('src/lib/discovery/exposureProjection.ts');
  const crawlers = await text('src/lib/discovery/crawlerPolicy.ts');
  const control = await text('src/lib/discovery/discoveryControlPlane.ts');
  const institutionalMesh = await text('src/lib/discovery/institutionalDiscoveryMesh.ts');
  const institutionalRead = await text('src/lib/discovery/institutionalDiscoveryReadModel.ts');
  const api = await text('src/app/api/root/discovery/route.ts');
  const page = await text('src/app/root/discovery/page.tsx');
  const robots = await text('src/app/robots.ts');
  const aiPolicy = await text('src/app/ai-policy/route.ts');
  const aiIndex = await text('src/app/ai-index.json/route.ts');
  const emitter = await text('src/lib/discovery/discoveryEmitter.ts');
  const identity = await text('src/lib/public/institutionProfile.ts');
  const migration = await text('supabase/migrations/20260908004000_create_sfi_discovery_observation_plane.sql');
  const graphMigration = await text('supabase/migrations/20260527083000_create_graph_nodes_edges.sql');
  const trajectoryMigration = await text('supabase/migrations/20260811214500_sfi_inference_and_artifact_trajectory.sql');
  const attractorOwner = await text('src/lib/institution/institutionalAttractor.ts');

  assert.match(exposure, /SFI-DISCOVERY-EXPOSURE-1\.2/);
  assert.match(exposure, /SFI-EXPOSURE-PACKET-1\.2/);
  assert.match(exposure, /discoveryEmissionEntries/);
  assert.match(exposure, /SFI_EXTERNAL_IDENTITY_NODES/);
  assert.match(exposure, /exposureIsNotCanon: true/);
  assert.match(exposure, /exposureIsNotPublicationReceipt: true/);
  assert.match(exposure, /publishedTargetsAreObjectScoped: true/);
  assert.match(exposure, /externalPublicationLineageObjectScoped: true/);
  assert.match(exposure, /externalIdentityUrlUsesOriginAndPathBoundary: true/);
  assert.match(exposure, /automaticExternalAction: false/);
  assert.match(exposure, /externalActionRequiresGovernedAdapterOrHuman: true/);
  assert.match(exposure, /row\.state === 'PUBLISHED'/);
  assert.match(exposure, /row\.canonical_object_key === canonicalObjectKey/);
  assert.match(exposure, /external\.origin !== node\.origin/);
  assert.match(exposure, /candidatePath === basePath \|\| candidatePath\.startsWith\(`\$\{basePath\}\/`\)/);
  assert.match(exposure, /published\?\.external_url && published\.observed_at/, 'OBSERVED_PUBLISHED must require both external URL and observed time from the selected persisted representation');
  assert.match(exposure, /canonicalObjectKey: published\.canonical_object_key/);
  assert.doesNotMatch(exposure, /\.insert\(|\.upsert\(|\.update\(/, 'Exposure projection must not become a persistence writer');

  assert.match(crawlers, /SFI-DISCOVERY-CRAWLER-POLICY-1\.1/);
  for (const bot of ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'PerplexityBot']) assert.match(crawlers, new RegExp(bot));
  for (const bot of ['GPTBot', 'CCBot', 'ClaudeBot', 'Google-Extended']) assert.match(crawlers, new RegExp(bot));
  assert.match(crawlers, /ALLOWED_PUBLIC_ONLY/);
  assert.match(crawlers, /DISALLOWED_BY_POLICY/);
  assert.match(crawlers, /publicApiAllowlist: SFI_PUBLIC_DISCOVERY_API_PATHS/);
  assert.match(crawlers, /'\/api\/'/);
  assert.match(crawlers, /apiDiscoveryIsAllowlistedOnly: true/);
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

  assert.match(institutionalMesh, /SFI-INSTITUTIONAL-DISCOVERY-MESH-1\.1/);
  assert.match(institutionalMesh, /SFI-EXTERNAL-REALITY-GRAPH-1\.0/);
  assert.match(institutionalMesh, /SFI-PROPAGATION-GRAPH-1\.1/);
  assert.match(institutionalMesh, /SFI-CONVERGENCE-GRAPH-1\.1/);
  for (const lens of ['KNOWLEDGE', 'REALITY', 'PROPAGATION', 'CONVERGENCE']) assert.match(institutionalMesh, new RegExp(`'${lens}'`));
  for (const stage of ['EXPOSURE', 'DISCOVERY', 'RECOGNITION', 'INTERACTION', 'RELATION', 'PROPAGATION', 'PULL', 'RETURN']) assert.match(institutionalMesh, new RegExp(`'${stage}'`));
  for (const relation of ['AFFILIATED_WITH', 'CONTROLS_ACCESS_TO', 'INTRODUCED_SFI_TO', 'REQUESTED', 'RETRIEVED', 'CITES']) assert.match(institutionalMesh, new RegExp(`'${relation}'`));
  assert.match(institutionalMesh, /MANHATTAN_OBJECTIVE/);
  assert.match(institutionalMesh, /independentNycRelationships: 3/);
  assert.match(institutionalMesh, /concreteSfiObjectRequests: 1/);
  assert.match(institutionalMesh, /thirdPartyIntroductions: 1/);
  assert.match(institutionalMesh, /realCasesWithObservedReturn: 1/);
  assert.match(institutionalMesh, /edge\.founderForced === false/);
  assert.match(institutionalMesh, /unknownIntroductionOriginCannotCountAsThirdParty: true/);
  assert.match(institutionalMesh, /stageEvidenceAdmissible = evidenceRefs\.length > 0 && observedEpistemic\(epistemicState\)/);
  assert.match(institutionalMesh, /semanticStageRequiresEvidenceAndObservedEpistemicState: true/);
  assert.match(institutionalMesh, /BOUNDED_SAMPLE_CANNOT_FALSIFY_MINIMUM_GATE/);
  assert.match(institutionalMesh, /saturatedSampleCannotProveInsufficiency: true/);
  assert.match(institutionalMesh, /boundedSamplesCannotCreateNegativeEvidence: true/);
  assert.match(institutionalMesh, /founderForcedOutreachCannotCountAsPull: true/);
  assert.match(institutionalMesh, /attractorIsLensNotOntology: true/);
  assert.match(institutionalMesh, /CANONICAL_NAMESPACE_ACTIVE/);
  assert.match(institutionalMesh, /SFI_CANONICAL_NAMESPACE_CONTRACT/);
  assert.match(institutionalMesh, /canonicalNamespaceFor\('PUBLICATION'\)/);
  assert.doesNotMatch(institutionalMesh, /CANONICAL_NAMESPACE_CHANGE_SEPARATE_GATE/);
  assert.doesNotMatch(institutionalMesh, /create table|\.from\(|\.insert\(|\.upsert\(|\.update\(/, 'Institutional mesh must remain a projection and not become another DB owner');

  assert.match(institutionalRead, /SFI-INSTITUTIONAL-DISCOVERY-READ-1\.1/);
  assert.match(institutionalRead, /from\('graph_nodes'\)/);
  assert.match(institutionalRead, /from\('graph_edges'\)/);
  assert.match(institutionalRead, /from\('sfi_artifact_trajectory_events'\)/);
  assert.match(institutionalRead, /sampleCompleteness/);
  assert.match(institutionalRead, /convergenceEvidenceSampleComplete/);
  assert.match(institutionalRead, /sampleSaturated/);
  assert.match(institutionalRead, /saturatedSamplesCannotProveInsufficiency: true/);
  assert.match(institutionalRead, /dbQueries: 3/);
  assert.match(institutionalRead, /exactCountProbes: 0/);
  assert.match(institutionalRead, /pollingLoops: 0/);
  assert.match(institutionalRead, /nPlusOneReads: 0/);
  assert.doesNotMatch(institutionalRead, /count\s*:\s*['"]exact['"]|head\s*:\s*true|setInterval|setTimeout\(|fetch\(/, 'Institutional Discovery read model must stay bounded');
  assert.match(graphMigration, /create table if not exists public\.graph_nodes/);
  assert.match(graphMigration, /create table if not exists public\.graph_edges/);
  assert.match(trajectoryMigration, /create table if not exists public\.sfi_artifact_trajectory_events/);
  assert.match(trajectoryMigration, /does not prove causality, semantic drift or propagation without supporting evidence/);
  assert.match(attractorOwner, /sfi_attractors/);
  assert.match(attractorOwner, /sfi_attractor_trajectory_snapshots/);

  assert.match(api, /requireRootViewer\('root\.discovery\.read'\)/);
  assert.match(api, /readDiscoveryControlPlane/);
  assert.match(api, /readInstitutionalDiscoveryMesh/);
  assert.match(api, /Promise\.all/);
  assert.match(api, /private, no-store/);
  assert.match(page, /requireRootObserverPage\('\/root\/discovery'\)/);
  assert.match(page, /Discovery \+ Exposure/);
  assert.match(page, /exact counts:/);
  assert.match(page, /CANONICAL_NAMESPACE_ACTIVE|canonicalNamespace/, 'ROOT Discovery must project the active publication namespace state');
  for (const section of ['Knowledge graph', 'AI discovery', 'Crawlers', 'Academic graph', 'EXTERNAL REALITY GRAPH', 'Propagation graph', 'Discovery lifecycle', 'Manhattan attractor', 'Minimum convergence gate', 'Propagation receipts', 'Collisions', 'Publication mesh']) assert.match(page, new RegExp(section));

  assert.match(aiIndex, /discoveryExposurePlan/);
  assert.match(aiIndex, /institutional_discovery_mesh:/);
  assert.match(aiIndex, /SFI_MANHATTAN_ATTRACTOR/);
  assert.match(aiIndex, /founderForcedMovementCannotBecomePull: true/);
  assert.match(aiIndex, /Exposure\/discovery does not imply publication, validation, authority or model-training permission/);

  assert.match(emitter, /SFI-DISCOVERY-EMITTER-1\.0/);
  assert.match(identity, /SFI_EXTERNAL_IDENTITY_NODES/);
  assert.match(migration, /public\.sfi_external_representations/);
  assert.doesNotMatch(exposure, /create table|sfi_canonical_objects|sfi_external_nodes/, 'Exposure must reuse existing owners and cannot create parallel canon/identity tables');

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-DISCOVERY-EXPOSURE-QA-1.6',
    canonicalOwnerReused: true,
    canonicalGraphReused: true,
    artifactTrajectoryOwnerReused: true,
    attractorOwnerReused: true,
    externalIdentityOwnerReused: true,
    externalRepresentationOwnerReused: true,
    rootControlPlane: true,
    interactiveDbQueries: 6,
    exactCountProbes: 0,
    pollingLoops: 0,
    trainingReuseSeparatedFromSearchDiscovery: true,
    publicApiCrawlerAccessAllowlistedOnly: true,
    externalPublicationLineageObjectScoped: true,
    externalIdentityUrlBoundaryStrict: true,
    semanticStagesEvidenceBound: true,
    unknownIntroductionOriginRejected: true,
    boundedSamplesCannotProveInsufficiency: true,
    realityGraphIsLens: true,
    propagationGraphIsLens: true,
    ManhattanIsAttractor: true,
    publicationNamespaceCanonicalGateActive: true,
    automaticPublication: false,
    automaticCanon: false,
    automaticExternalAction: false,
    falsePublicationReceipt: false,
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
