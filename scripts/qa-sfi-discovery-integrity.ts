import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  SFI_CANONICAL_OBJECT_TYPES,
  canonicalUrlFor,
  validateCanonicalObjectRegistry,
  SFI_CANONICAL_OBJECT_REGISTRY,
} from '../src/lib/discovery/canonicalObjectRegistry';
import { SFI_PUBLIC_PROFILE } from '../src/lib/public/institutionProfile';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

function walk(relative: string): string[] {
  const absolute = path.join(root, relative);
  if (!existsSync(absolute)) return [];
  const entries = readdirSync(absolute);
  const output: string[] = [];
  for (const entry of entries) {
    const childRelative = path.join(relative, entry);
    const childAbsolute = path.join(root, childRelative);
    if (statSync(childAbsolute).isDirectory()) output.push(...walk(childRelative));
    else output.push(childRelative.replaceAll('\\', '/'));
  }
  return output;
}

const sourceFiles = walk('src').filter((file) => /\.(ts|tsx)$/.test(file));
const source = sourceFiles.map((file) => ({ file, content: read(file) }));
const occurrencesAcrossSource = (token: string) => source.reduce((sum, item) => sum + item.content.split(token).length - 1, 0);

const canonicalOwner = read('src/lib/discovery/canonicalObjectRegistry.ts');
const canonicalTests = read('src/lib/discovery/canonicalObjectRegistry.test.ts');
const profile = read('src/lib/public/institutionProfile.ts');
const sitemap = read('src/app/sitemap.ts');
const robots = read('src/app/robots.ts');
const layout = read('src/app/layout.tsx');
const temporalQa = read('scripts/qa-sfi-temporal-surfaces.ts');
const observatoryPublication = read('src/lib/observatory/publicationGate.ts');
const systemContracts = read('src/lib/system/contracts/index.ts');

assert.deepEqual(SFI_CANONICAL_OBJECT_TYPES, [
  'CONCEPT', 'METHOD', 'INSTRUMENT', 'OBSERVATION', 'DATASET', 'REPORT',
  'PAPER', 'SOFTWARE', 'RELEASE', 'RETURN', 'PUBLICATION',
], 'frozen_canonical_object_taxonomy_drift');
assert.deepEqual(validateCanonicalObjectRegistry(SFI_CANONICAL_OBJECT_REGISTRY), [], 'canonical_registry_invalid');
assert.equal(canonicalUrlFor('METHOD', 'mihm'), 'https://systemfriction.org/methods/mihm', 'canonical_url_semantics_drift');

// One semantic owner. Tests/consumers import it; they do not redeclare the contract or URL resolver.
assert.equal(occurrencesAcrossSource("'SFI-CANONICAL-OBJECT-1.0'"), 1, 'duplicate_canonical_object_contract_owner');
assert.equal(occurrencesAcrossSource('export function canonicalUrlFor('), 1, 'duplicate_canonical_url_resolver');
assert.equal(occurrencesAcrossSource('export const SFI_CANONICAL_OBJECT_REGISTRY'), 1, 'duplicate_canonical_object_registry');
assert.ok(canonicalOwner.includes("import type { PublicationStatus } from '../system/contracts'"), 'canonical_owner_must_reuse_publication_status_owner');
assert.ok(!canonicalOwner.includes('export type PublicationStatus'), 'canonical_owner_must_not_fork_publication_state');
assert.ok(systemContracts.includes('export type PublicationStatus'), 'existing_publication_status_owner_missing');
assert.ok(observatoryPublication.includes('OBSERVATORY_PUBLICATION_CONTRACT'), 'existing_observatory_publication_gate_missing');

// Existing institution/sitemap/robots/AI-index/LLM owners remain singular.
assert.equal(occurrencesAcrossSource('export const SFI_PUBLIC_PROFILE ='), 1, 'duplicate_institution_profile_owner');
assert.equal(sourceFiles.filter((file) => file.endsWith('/institutionProfile.ts')).length, 1, 'duplicate_institution_profile_file');
assert.equal(occurrencesAcrossSource('export default function sitemap()'), 1, 'duplicate_sitemap_owner');
assert.equal(occurrencesAcrossSource('export default function robots()'), 1, 'duplicate_robots_owner');
assert.ok(existsSync(path.join(root, 'public/ai-index.json')), 'canonical_ai_index_missing');
assert.equal(walk('src/app').filter((file) => file.endsWith('/ai-index.json')).length, 0, 'second_ai_index_owner_detected');
assert.ok(existsSync(path.join(root, 'public/llms.txt')), 'canonical_llms_owner_missing');
assert.ok(existsSync(path.join(root, 'public/llms-full.txt')), 'canonical_llms_full_owner_missing');

// Canonical public identity is projected from the existing institution profile and sameAs stays fail-closed.
assert.equal(SFI_PUBLIC_PROFILE.institution.entityId, 'https://systemfriction.org/#sfi', 'canonical_entity_id_drift');
assert.deepEqual(SFI_PUBLIC_PROFILE.institution.verifiedSameAs, [], 'unverified_sameas_promoted');
assert.ok(profile.includes("entityId: 'https://systemfriction.org/#sfi'"), 'institution_profile_entity_id_missing');
assert.ok(profile.includes('verifiedSameAs: []'), 'institution_profile_sameas_must_start_empty');
assert.ok(layout.includes("'@id': SFI_PUBLIC_PROFILE.institution.entityId"), 'jsonld_must_project_canonical_entity_id');
assert.ok(layout.includes('verifiedSameAs.length ? { sameAs: verifiedSameAs } : {}'), 'jsonld_sameas_must_be_verified_only');
assert.equal(layout.includes("sameAs: ['https://github.com/Aptymok/system-friction']"), false, 'controlled_repository_must_not_be_institutional_sameas');

// Sitemap remains the single owner and consumes only explicitly public canonical-object URLs.
assert.ok(sitemap.includes("import { publicCanonicalObjectUrls } from '@/lib/discovery/canonicalObjectRegistry'"), 'sitemap_must_consume_canonical_object_owner');
assert.ok(sitemap.includes('const canonicalObjects = publicCanonicalObjectUrls().map'), 'sitemap_canonical_projection_missing');
assert.ok(sitemap.includes('return [...scenes, ...machine, ...canonicalObjects]'), 'sitemap_canonical_projection_not_emitted');
assert.ok(robots.includes("sitemap: `${BASE}/sitemap.xml`"), 'robots_must_keep_existing_sitemap_owner');

// Publicability is explicit/fail-closed; no event listener or persistence side effect creates public objects.
for (const token of [
  "publicState: SfiCanonicalPublicState",
  "publication: {",
  "explicit: true",
  "if (record.publicState === 'PUBLIC')",
  "PUBLIC_REQUIRES_PUBLISHED_STATE",
  "PUBLIC_REQUIRES_PUBLIC_PRIVACY",
  "PUBLIC_ELIGIBILITY_REQUIRED",
  "PUBLIC_SECURITY_ELIGIBILITY_REQUIRED",
  "PUBLIC_LINEAGE_REQUIRED",
  "PUBLIC_CANNOT_DERIVE_ONLY_FROM_INTERNAL_EVENT",
  "PUBLIC_RIGHTS_NOT_ELIGIBLE",
  "PUBLISHED_REQUIRES_PUBLIC_STATE",
  "PRIVATE_CANNOT_BE_PUBLIC_ELIGIBLE",
  "MISSING_STATE_REQUIRES_LINEAGE",
  "MISSING_SOURCE_NOT_IN_LINEAGE",
  "DUPLICATE_CANONICAL_URL",
]) assert.ok(canonicalOwner.includes(token), `canonical_public_boundary_missing:${token}`);

for (const forbidden of [
  "from('epistemic_events')",
  'SFI_CANONICAL_OBJECT_PUBLISHED',
  'setInterval(',
  'fetch(',
  'supabase',
]) assert.equal(canonicalOwner.includes(forbidden), false, `canonical_owner_must_be_pure:${forbidden}`);

assert.ok(canonicalOwner.includes('Object.freeze([])'), 'canonical_registry_must_not_auto_publish_internal_state');
assert.ok(canonicalTests.includes('internal event lineage alone cannot create a public object'), 'internal_event_publication_regression_missing');
assert.ok(canonicalTests.includes('MISSING remains explicit and requires lineage instead of fabrication'), 'missing_regression_missing');
assert.ok(canonicalTests.includes('canonical URL is deterministic and competing canon is rejected'), 'duplicate_canon_regression_missing');
assert.ok(canonicalTests.includes('private state cannot become public by publication inheritance'), 'private_public_inheritance_regression_missing');

// Existing #366 public availability/read-plane regression remains present and owned by its original gate.
for (const token of [
  "observableMetricValue('UNAVAILABLE', 0)",
  "observableMetricValue('AVAILABLE', 0)",
  "observatory_duplicate_equivalent_read",
  "observatory_polling_topology_amplified",
  "interpretive_flow_must_not_fetch_world",
]) assert.ok(temporalQa.includes(token), `false_zero_read_plane_regression_missing:${token}`);

console.log(JSON.stringify({
  contract: 'SFI-DISCOVERY-INTEGRITY-1.0',
  entityCoherence: 'SFI-ENTITY-COHERENCE-1.0',
  publicEpistemicBoundary: 'SFI-PUBLIC-EPISTEMIC-BOUNDARY-1.0',
  noDuplicateCanon: 'SFI-DISCOVERY-NO-DUPLICATE-CANON-1.0',
  canonicalObjectContract: 'SFI-CANONICAL-OBJECT-1.0',
  objectTypes: SFI_CANONICAL_OBJECT_TYPES.length,
  canonicalRegistryEntries: SFI_CANONICAL_OBJECT_REGISTRY.length,
  verifiedSameAs: SFI_PUBLIC_PROFILE.institution.verifiedSameAs.length,
  duplicateCanonicalOwners: 0,
  duplicateInstitutionProfiles: 0,
  duplicateSitemapOwners: 0,
  duplicateAiIndexes: 0,
  status: 'PASS',
}, null, 2));
