import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function text(path: string) { return readFile(path, 'utf8'); }

async function main() {
  const mesh = await text('src/lib/discovery/discoveryMesh.ts');
  const repository = await text('src/lib/discovery/discoveryRepository.ts');
  const route = await text('src/app/api/discovery/observe/route.ts');
  const migration = await text('supabase/migrations/20260908004000_create_sfi_discovery_observation_plane.sql');
  const canonical = await text('src/lib/discovery/canonicalObjectRegistry.ts');
  const identity = await text('src/lib/public/institutionProfile.ts');
  const contractLock = await text('docs/program/SFI-CONTRACT-LOCK.md');
  const worldCaseContract = await text('docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md');
  const worldSignalObserver = await text('src/lib/world-observatory/worldSignalObserverAgent.ts');
  const worldSignalRunner = await text('scripts/run-world-signal-observer-agent.ts');
  const worldSignalWorkflow = await text('.github/workflows/sfi-world-signal-observer.yml');
  const worldCycle = await text('src/lib/world-observatory/worldCycle.ts');
  const worldCron = await text('src/app/api/cron/world-observatory/route.ts');
  const worldReobserve = await text('src/app/api/field/map/world/reobserve/route.ts');
  const cognitiveRegistry = await text('src/lib/sfi/cognitive-runtime/convergedRegistry.ts');

  assert(mesh.includes("SFI-DISCOVERY-MESH-1.0"));
  assert(mesh.includes("SFI-DISCOVERY-OBSERVATION-1.0"));
  for (const mode of ['query','distinct_intent','open_source']) assert(mesh.includes(`'${mode}'`), `missing discovery mode ${mode}`);
  for (const state of ['AVAILABLE','DEGRADED','UNAVAILABLE','MISSING','NOT_OBSERVED']) assert(mesh.includes(`'${state}'`), `missing availability ${state}`);
  for (const metric of ['UDR','EIC','IRD','ACR','ECR','MPD','ERR']) assert(mesh.includes(metric), `missing metric emitter ${metric}`);
  for (const submetric of ['NAME','DOMAIN','METHOD','ENTITY']) assert(mesh.includes(`${submetric}: collisionMetric('${submetric}')`), `missing ECR-${submetric}`);
  assert(mesh.includes("candidateClass: 'SOURCE_CANDIDATE'"), 'candidate epistemic class missing');
  assert(mesh.includes('candidatesAreCanonical: false'), 'candidate must never imply canon');
  assert(mesh.includes('automaticCanon: false'), 'automatic canon boundary missing');
  assert(mesh.includes('automaticPublication: false'), 'automatic publication boundary missing');
  assert(mesh.includes('automaticExecution: false'), 'automatic execution boundary missing');
  assert(mesh.includes('Numeric zero is emitted only when an eligible observed denominator exists'), 'false-zero contract missing');
  assert(mesh.includes('publicSemanticProjectionsForCanonicalObjects'), 'Discovery Mesh must project existing canonical objects');
  assert(mesh.includes('SFI_CANONICAL_IDENTITY_FINGERPRINT'), 'Discovery Mesh must reuse canonical institution identity');

  assert(route.includes('requireAuthenticatedUser'), 'discovery observation writer must require verified session auth');
  assert(route.includes('persistDiscoveryObservation'), 'discovery route must use repository owner');
  assert(route.includes('candidatePromotion: false'), 'route must deny candidate promotion authority');
  assert(route.includes('automaticCanon: false'), 'route must deny automatic canon');
  assert(repository.includes("from('sfi_discovery_queries')"), 'query persistence owner missing');
  assert(repository.includes("from('sfi_discovery_query_runs')"), 'run persistence owner missing');
  assert(repository.includes("from('sfi_entity_collisions')"), 'collision persistence owner missing');
  assert(repository.includes("run_id: result.observationId"), 'deterministic replay identity missing');
  assert(repository.includes("code === '23505'"), 'idempotent replay handling missing');

  for (const table of ['sfi_discovery_queries','sfi_discovery_query_runs','sfi_entity_collisions','sfi_external_representations']) {
    assert(migration.includes(`public.${table}`), `migration missing ${table}`);
    assert(migration.includes(`alter table public.${table} enable row level security`), `RLS missing ${table}`);
    assert(migration.includes(`alter table public.${table} force row level security`), `FORCE RLS missing ${table}`);
    assert(migration.includes(`revoke all on public.${table} from anon, authenticated`), `Data API revoke missing ${table}`);
  }
  assert(!migration.includes('create table if not exists public.sfi_canonical_objects'), 'must not create a second canonical object owner');
  assert(!migration.includes('create table if not exists public.sfi_external_nodes'), 'must not duplicate verified identity owner');
  assert(canonical.includes('export const SFI_CANONICAL_OBJECT_REGISTRY'), 'existing canonical object owner missing');
  assert(identity.includes('export const SFI_EXTERNAL_IDENTITY_NODES'), 'existing external identity owner missing');
  assert(contractLock.includes('UDR — Unbranded Discovery Rate'), 'frozen UDR meaning missing');
  assert(contractLock.includes('EIC — External Identity Coherence'), 'frozen EIC meaning missing');
  assert(contractLock.includes('IRD — Independent Reference Density'), 'frozen IRD meaning missing');
  assert(contractLock.includes('MPD — Multi-Platform Propagation Depth'), 'frozen MPD meaning missing');
  assert(contractLock.includes('ERR — Entity Reconstruction Rate'), 'frozen ERR meaning missing');

  // #154: WorldSignalObserverAgent is a governed World/Discovery domain agent, not a second
  // cognitive agent and not a second persistence owner. It must reuse the longitudinal World writer.
  assert(worldCaseContract.includes('### WorldSignalObserverAgent'), 'canonical WorldSignalObserverAgent requirement missing');
  for (const token of [
    "SFI-WORLD-SIGNAL-OBSERVER-1.0",
    "WORLD_SIGNAL_OBSERVER_AGENT_ID = 'world_signal_observer'",
    "name: 'WorldSignalObserverAgent'",
    "authority: 'OBSERVE'",
    "canonicalWriter: 'runWorldObservationCycle'",
    "persistedSource: 'world_source_observations'",
    "derivedDescriptorSource: 'world_friction_readings'",
    'executeWorldSignalObserverAgent',
    'runWorldObservationCycle()',
    'sourceUrlPreserved: true',
    'actorLineagePreservedWhenObserved: true',
    'rawHashPreserved: true',
    'automaticHypothesisPromotion: false',
    'automaticCaseQualification: false',
    'automaticCanonPromotion: false',
    'automaticPublication: false',
  ]) assert(worldSignalObserver.includes(token), `world_signal_observer_contract_missing:${token}`);
  assert(!worldSignalObserver.includes("from('world_source_observations')"), 'WorldSignalObserverAgent must not create a second World writer');
  assert(!worldSignalObserver.includes('runWorldHypothesisCycle'), 'WorldSignalObserverAgent must not promote/generate hypotheses');
  assert(!worldSignalObserver.includes('runWorldCalibrationCycle'), 'WorldSignalObserverAgent must not own hypothesis calibration');
  assert(!cognitiveRegistry.includes("id: 'world_signal_observer'"), 'WorldSignalObserverAgent must not mutate the 21-agent cognitive registry');

  for (const token of [
    "from('world_source_observations').upsert",
    'actors: observation.actors',
    'source_url: observation.sourceUrl',
    'raw_hash: rawHash',
    'collector_version: WORLD_COLLECTOR_VERSION',
    'governed AI creates a traceable hypothesis',
  ]) assert(worldCycle.includes(token), `canonical_world_writer_lineage_missing:${token}`);

  for (const entrypoint of [worldCron, worldReobserve]) {
    assert(entrypoint.includes('executeWorldSignalObserverAgent'), 'World observation entrypoint must invoke WorldSignalObserverAgent');
    assert(entrypoint.includes('worldSignalObserver.observation'), 'World observation entrypoint must consume agent receipt');
    assert(!entrypoint.includes('runWorldObservationCycle'), 'entrypoint must not bypass WorldSignalObserverAgent');
  }
  assert(worldCron.includes('runWorldHypothesisCycle'), 'scheduled hypothesis owner must remain explicit and separate');
  assert(worldCron.includes('runWorldCalibrationCycle'), 'scheduled calibration owner must remain explicit and separate');
  assert(worldReobserve.includes('runWorldHypothesisCycle'), 'human reobserve hypothesis owner must remain explicit and separate');
  assert(worldReobserve.includes('runWorldCalibrationCycle'), 'human reobserve calibration owner must remain explicit and separate');

  // Controlled executable proof: main-only explicit observation smoke, no hypothesis/case/canon writer.
  for (const token of [
    'executeWorldSignalObserverAgent',
    "SFI-WORLD-SIGNAL-OBSERVER-EXECUTION-1.0",
    "result.state === 'OBSERVED_WORLD'",
    'observation.observed > 0',
    'observation.persisted > 0',
    'observation.activeSourceCount > 0',
    'receipt.json',
    'returnCondition',
  ]) assert(worldSignalRunner.includes(token), `world_signal_observer_runner_missing:${token}`);
  assert(!worldSignalRunner.includes('runWorldHypothesisCycle'), 'execution proof must not generate hypotheses');
  assert(!worldSignalRunner.includes('runWorldCalibrationCycle'), 'execution proof must not calibrate hypotheses');

  for (const token of [
    'name: SFI World Signal Observer',
    'workflow_dispatch:',
    ".github/sfi-world-signal-observer-trigger",
    'SFI_WORLD_SIGNAL_OBSERVER_REQUEST=ISSUE_154',
    'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',
    'npx tsx scripts/run-world-signal-observer-agent.ts',
    'actions/upload-artifact@v4',
    'Authority: `OBSERVE`',
    'Hypothesis promotion: **NOT PERFORMED BY THIS AGENT**',
  ]) assert(worldSignalWorkflow.includes(token), `world_signal_observer_workflow_missing:${token}`);
  assert(!worldSignalWorkflow.includes('schedule:'), 'WorldSignalObserverAgent proof must not introduce a new autonomous timer');
  assert(!worldSignalWorkflow.includes('pull_request:'), 'WorldSignalObserverAgent proof must not write live World data from PRs');
  assert(!worldSignalWorkflow.includes('runWorldHypothesisCycle'), 'WorldSignalObserverAgent proof workflow must not own hypothesis generation');

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-DISCOVERY-INTEGRITY-1.2',
    modes: 3,
    metricFamilies: 7,
    falseZero: true,
    candidatePromotion: false,
    canonicalOwnerReused: true,
    externalIdentityOwnerReused: true,
    duplicateCanonicalOwner: false,
    duplicateIdentityOwner: false,
    rlsForced: true,
    directBrowserDataApi: false,
    durableQueryRuns: true,
    worldSignalObserver: {
      implemented: true,
      wired: true,
      canonicalWriterReused: true,
      cognitiveRegistryUnchanged: true,
      controlledExecutionReceipt: true,
      automaticHypothesisPromotion: false,
      automaticCaseQualification: false,
      automaticPublication: false,
    },
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });