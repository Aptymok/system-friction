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

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-DISCOVERY-INTEGRITY-1.0',
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
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });