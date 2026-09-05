import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  SFI_CANONICAL_OBJECT_TYPES,
  canonicalUrlFor,
  validateCanonicalObjectRegistry,
  SFI_CANONICAL_OBJECT_REGISTRY,
} from '../src/lib/discovery/canonicalObjectRegistry';
import {
  SFI_EVIDENCE_CAPSULE_CONTRACT,
  SFI_PUBLIC_SEMANTIC_OBJECT_TYPES,
  SFI_PUBLIC_SEMANTIC_PROJECTION_CONTRACT,
  publicSemanticProjectionsForCanonicalObjects,
} from '../src/lib/discovery/publicSemanticProjection';
import {
  SFI_CANONICAL_IDENTITY_FINGERPRINT,
  SFI_DISAMBIGUATION_RISKS,
  SFI_EXTERNAL_IDENTITY_NODES,
  SFI_PUBLIC_PROFILE,
  institutionalSameAsDisposition,
  verifiedInstitutionSameAs,
} from '../src/lib/public/institutionProfile';

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
const semanticProjectionOwner = read('src/lib/discovery/publicSemanticProjection.ts');
const canonicalTests = read('src/lib/discovery/canonicalObjectRegistry.test.ts');
const profile = read('src/lib/public/institutionProfile.ts');
const sitemap = read('src/app/sitemap.ts');
const robots = read('src/app/robots.ts');
const layout = read('src/app/layout.tsx');
const temporalQa = read('scripts/qa-sfi-temporal-surfaces.ts');
const observatoryPublication = read('src/lib/observatory/publicationGate.ts');
const systemContracts = read('src/lib/system/contracts/index.ts');
const aiIndex = JSON.parse(read('public/ai-index.json')) as {
  name?: string;
  abbreviation?: string;
  canonical_url?: string;
};
const llms = read('public/llms.txt');
const llmsFull = read('public/llms-full.txt');

assert.deepEqual(SFI_CANONICAL_OBJECT_TYPES, [
  'CONCEPT', 'METHOD', 'INSTRUMENT', 'OBSERVATION', 'DATASET', 'REPORT',
  'PAPER', 'SOFTWARE', 'RELEASE', 'RETURN', 'PUBLICATION',
], 'frozen_canonical_object_taxonomy_drift');
assert.deepEqual(validateCanonicalObjectRegistry(SFI_CANONICAL_OBJECT_REGISTRY), [], 'canonical_registry_invalid');
assert.equal(canonicalUrlFor('METHOD', 'mihm'), 'https://systemfriction.org/methods/mihm', 'canonical_url_semantics_drift');
assert.deepEqual(SFI_PUBLIC_SEMANTIC_OBJECT_TYPES, [
  'CONCEPT', 'METHOD', 'INSTRUMENT', 'REPORT', 'PAPER', 'SOFTWARE', 'RELEASE', 'RETURN',
], 'r3_public_semantic_object_taxonomy_drift');
assert.deepEqual(publicSemanticProjectionsForCanonicalObjects(SFI_CANONICAL_OBJECT_REGISTRY), [], 'empty_registry_must_not_emit_semantic_objects');
assert.equal(SFI_PUBLIC_SEMANTIC_PROJECTION_CONTRACT, 'SFI-PUBLIC-SEMANTIC-PROJECTION-1.0', 'semantic_projection_contract_drift');
assert.equal(SFI_EVIDENCE_CAPSULE_CONTRACT, 'SFI-EVIDENCE-CAPSULE-1.0', 'evidence_capsule_contract_drift');

// One semantic owner. Tests/consumers import it; they do not redeclare the contract or URL resolver.
assert.equal(occurrencesAcrossSource("'SFI-CANONICAL-OBJECT-1.0'"), 1, 'duplicate_canonical_object_contract_owner');
assert.equal(occurrencesAcrossSource("'SFI-PUBLIC-SEMANTIC-PROJECTION-1.0'"), 1, 'duplicate_public_semantic_projection_contract_owner');
assert.equal(occurrencesAcrossSource("'SFI-EVIDENCE-CAPSULE-1.0'"), 1, 'duplicate_evidence_capsule_contract_owner');
assert.equal(occurrencesAcrossSource('export function canonicalUrlFor('), 1, 'duplicate_canonical_url_resolver');
assert.equal(occurrencesAcrossSource('export const SFI_CANONICAL_OBJECT_REGISTRY'), 1, 'duplicate_canonical_object_registry');
assert.ok(canonicalOwner.includes("import type { PublicationStatus } from '../system/contracts'"), 'canonical_owner_must_reuse_publication_status_owner');
assert.ok(!canonicalOwner.includes('export type PublicationStatus'), 'canonical_owner_must_not_fork_publication_state');
assert.ok(systemContracts.includes('export type PublicationStatus'), 'existing_publication_status_owner_missing');
assert.ok(observatoryPublication.includes('OBSERVATORY_PUBLICATION_CONTRACT'), 'existing_observatory_publication_gate_missing');

// Existing institution/sitemap/robots/AI-index/LLM owners remain singular.
assert.equal(occurrencesAcrossSource('export const SFI_PUBLIC_PROFILE ='), 1, 'duplicate_institution_profile_owner');
assert.equal(sourceFiles.filter((file) => file.endsWith('/institutionProfile.ts')).length, 1, 'duplicate_institution_profile_file');
assert.equal(occurrencesAcrossSource('export const SFI_CANONICAL_IDENTITY_FINGERPRINT'), 1, 'duplicate_canonical_identity_fingerprint');
assert.equal(occurrencesAcrossSource('export const SFI_EXTERNAL_IDENTITY_NODES'), 1, 'duplicate_external_identity_projection');
assert.equal(occurrencesAcrossSource('export default function sitemap()'), 1, 'duplicate_sitemap_owner');
assert.equal(occurrencesAcrossSource('export default function robots()'), 1, 'duplicate_robots_owner');
assert.ok(existsSync(path.join(root, 'public/ai-index.json')), 'canonical_ai_index_missing');
assert.equal(walk('src/app').filter((file) => file.endsWith('/ai-index.json')).length, 0, 'second_ai_index_owner_detected');
assert.ok(existsSync(path.join(root, 'public/llms.txt')), 'canonical_llms_owner_missing');
assert.ok(existsSync(path.join(root, 'public/llms-full.txt')), 'canonical_llms_full_owner_missing');

// Canonical institution identity remains singular and every public metadata surface consumes the same fingerprint.
assert.equal(SFI_CANONICAL_IDENTITY_FINGERPRINT.name, 'System Friction Institute', 'canonical_name_drift');
assert.equal(SFI_CANONICAL_IDENTITY_FINGERPRINT.abbreviation, 'SFI', 'canonical_abbreviation_drift');
assert.equal(SFI_CANONICAL_IDENTITY_FINGERPRINT.canonicalUrl, 'https://systemfriction.org', 'canonical_domain_drift');
assert.equal(SFI_CANONICAL_IDENTITY_FINGERPRINT.entityId, 'https://systemfriction.org/#sfi', 'canonical_entity_id_drift');
assert.equal(SFI_PUBLIC_PROFILE.institution.name, SFI_CANONICAL_IDENTITY_FINGERPRINT.name, 'profile_name_not_canonical');
assert.equal(SFI_PUBLIC_PROFILE.institution.canonicalUrl, SFI_CANONICAL_IDENTITY_FINGERPRINT.canonicalUrl, 'profile_domain_not_canonical');
assert.equal(SFI_PUBLIC_PROFILE.institution.entityId, SFI_CANONICAL_IDENTITY_FINGERPRINT.entityId, 'profile_entity_id_not_canonical');
assert.ok(profile.includes('name: SFI_CANONICAL_IDENTITY_FINGERPRINT.name'), 'profile_name_must_project_fingerprint');
assert.ok(profile.includes('canonicalUrl: SFI_CANONICAL_IDENTITY_FINGERPRINT.canonicalUrl'), 'profile_domain_must_project_fingerprint');
assert.ok(profile.includes('entityId: SFI_CANONICAL_IDENTITY_FINGERPRINT.entityId'), 'profile_entity_id_must_project_fingerprint');
assert.ok(layout.includes('const INSTITUTION_NAME = SFI_PUBLIC_PROFILE.institution.name'), 'metadata_name_must_project_profile');
assert.ok(layout.includes("'@id': SFI_PUBLIC_PROFILE.institution.entityId"), 'jsonld_must_project_canonical_entity_id');
assert.ok(layout.includes('name: SFI_PUBLIC_PROFILE.institution.name'), 'jsonld_name_must_project_canonical_name');
assert.ok(layout.includes('verifiedSameAs.length ? { sameAs: verifiedSameAs } : {}'), 'jsonld_sameas_must_be_verified_only');
assert.equal(layout.includes("sameAs: ['https://github.com/Aptymok/system-friction']"), false, 'controlled_repository_must_not_be_institutional_sameas');

// sameAs is fail-closed: CLAIMED is not VERIFIED and controlled assets/person references are not institution-equivalent.
assert.deepEqual(verifiedInstitutionSameAs(), [], 'unverified_or_non_equivalent_sameas_promoted');
assert.deepEqual(SFI_PUBLIC_PROFILE.institution.verifiedSameAs, [], 'public_profile_sameas_must_remain_fail_closed');
const githubNode = SFI_EXTERNAL_IDENTITY_NODES.find((node) => node.key === 'github-repository');
const mediumNode = SFI_EXTERNAL_IDENTITY_NODES.find((node) => node.key === 'medium-profile');
const linkedInPersonNode = SFI_EXTERNAL_IDENTITY_NODES.find((node) => node.key === 'linkedin-person-reference');
assert.ok(githubNode, 'github_identity_evidence_missing');
assert.ok(mediumNode, 'medium_identity_evidence_missing');
assert.ok(linkedInPersonNode, 'linkedin_person_identity_evidence_missing');
assert.equal(githubNode.state, 'VERIFIED', 'github_asset_control_state_drift');
assert.equal(institutionalSameAsDisposition(githubNode).reason, 'NOT_ENTITY_EQUIVALENT', 'repository_control_must_not_imply_sameas');
assert.equal(mediumNode.state, 'CLAIMED', 'medium_claimed_state_drift');
assert.equal(institutionalSameAsDisposition(mediumNode).reason, 'STATE_NOT_VERIFIED', 'claimed_must_not_equal_verified');
assert.equal(institutionalSameAsDisposition(linkedInPersonNode).reason, 'STATE_NOT_VERIFIED', 'person_reference_must_not_be_sameas_ready');
assert.equal(SFI_PUBLIC_PROFILE.institution.verifiedSameAs.includes(githubNode.url), false, 'repository_url_promoted_to_sameas');
assert.equal(SFI_PUBLIC_PROFILE.institution.verifiedSameAs.includes(mediumNode.url), false, 'claimed_medium_promoted_to_sameas');

// Disambiguation risk is explicit but is not silently converted into an observed collision.
assert.equal(SFI_DISAMBIGUATION_RISKS.length, 1, 'disambiguation_risk_inventory_drift');
assert.equal(SFI_DISAMBIGUATION_RISKS[0].name, 'Systemic Friction Institute, Inc', 'disambiguation_entity_drift');
assert.equal(SFI_DISAMBIGUATION_RISKS[0].observedCollision, false, 'collision_candidate_must_not_be_observed_collision');
assert.ok(SFI_DISAMBIGUATION_RISKS[0].classification.includes('DISAMBIGUATION_RISK'), 'disambiguation_classification_missing');

// Existing machine-readable/public orientation surfaces must agree on canonical name and domain.
assert.equal(aiIndex.name, SFI_CANONICAL_IDENTITY_FINGERPRINT.name, 'ai_index_name_drift');
assert.equal(aiIndex.abbreviation, SFI_CANONICAL_IDENTITY_FINGERPRINT.abbreviation, 'ai_index_abbreviation_drift');
assert.equal(aiIndex.canonical_url, SFI_CANONICAL_IDENTITY_FINGERPRINT.canonicalUrl, 'ai_index_domain_drift');
assert.ok(llms.startsWith(`# ${SFI_CANONICAL_IDENTITY_FINGERPRINT.name}\n`), 'llms_name_drift');
assert.ok(llms.includes(`Canonical site: ${SFI_CANONICAL_IDENTITY_FINGERPRINT.canonicalUrl}`), 'llms_domain_drift');
assert.ok(llmsFull.includes(SFI_CANONICAL_IDENTITY_FINGERPRINT.name), 'llms_full_name_missing');
assert.ok(llmsFull.includes(SFI_CANONICAL_IDENTITY_FINGERPRINT.canonicalUrl), 'llms_full_domain_missing');

// Identity coherence is code-owned/read-only: no account action, persistence, or external mutation is introduced here.
for (const forbidden of ['fetch(', 'supabase', '.from(', 'insert(', 'update(', 'delete(']) {
  assert.equal(profile.includes(forbidden), false, `identity_profile_must_be_pure:${forbidden}`);
}

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
  "evidenceIdentity: {",
  "privacy: record.eligibility.privacyClass === 'PUBLIC' ? 'PUBLIC' : 'NOT_PUBLIC'",
  "rights: record.rights.state === 'OPEN' || record.rights.state === 'NOT_APPLICABLE' ? 'CLEARED' : 'NOT_CLEARED'",
  "? 'PUBLICABLE'",
  "evidenceIdentity: record.evidenceIdentity.state === 'VALID' && evidenceRefsValid ? 'VALID' : 'INVALID'",
  "if (record.publicState === 'PUBLIC')",
  "PUBLIC_REQUIRES_PUBLISHED_STATE",
  "PUBLIC_REQUIRES_PUBLIC_PRIVACY",
  "PUBLIC_ELIGIBILITY_REQUIRED",
  "PUBLIC_SECURITY_ELIGIBILITY_REQUIRED",
  "PUBLIC_LINEAGE_REQUIRED",
  "PUBLIC_CANNOT_DERIVE_ONLY_FROM_INTERNAL_EVENT",
  "PUBLIC_RIGHTS_NOT_ELIGIBLE",
  "PUBLIC_EVIDENCE_IDENTITY_REQUIRED",
  "PUBLIC_EVIDENCE_IDENTITY_REFS_REQUIRED",
  "EVIDENCE_IDENTITY_REF_NOT_IN_LINEAGE",
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

// R3 semantic projection remains a pure adapter over canonical state; it owns no routes, writes, network calls or second registry.
for (const token of [
  "representationClass: 'EXTERNAL_REPRESENTATION'",
  "SFI-PUBLIC-SEMANTIC-PROJECTION-1.0",
  "SFI-EVIDENCE-CAPSULE-1.0",
  "MISSING_REF_CANNOT_BE_EVIDENCE",
  "MISSING_STATE_CANNOT_BE_EVIDENCE_CAPSULE",
  "MODEL_OUTPUT_CANNOT_BE_OBSERVATION",
  "MODEL_OUTPUT_CANNOT_HAVE_OBSERVED_STATE",
  "RETURN_REQUIRES_REALITY_OBSERVATION",
]) assert.ok(semanticProjectionOwner.includes(token), `semantic_projection_boundary_missing:${token}`);

for (const forbidden of ['fetch(', 'supabase', '.from(', 'insert(', 'update(', 'delete(', 'sameAs:', 'doi:', 'orcid:', 'ror:']) {
  assert.equal(semanticProjectionOwner.includes(forbidden), false, `semantic_projection_must_be_pure:${forbidden}`);
}

assert.ok(canonicalOwner.includes('Object.freeze([])'), 'canonical_registry_must_not_auto_publish_internal_state');
assert.ok(canonicalTests.includes('internal event lineage alone cannot create a public object'), 'internal_event_publication_regression_missing');
assert.ok(canonicalTests.includes('MISSING remains explicit and requires lineage instead of fabrication'), 'missing_regression_missing');
assert.ok(canonicalTests.includes('canonical URL is deterministic and competing canon is rejected'), 'duplicate_canon_regression_missing');
assert.ok(canonicalTests.includes('private state cannot become public by publication inheritance'), 'private_public_inheritance_regression_missing');
assert.ok(canonicalTests.includes('rights privacy governance and evidence identity form a four-axis fail-closed gate'), 'four_axis_publicability_regression_missing');
assert.ok(canonicalTests.includes('MISSING is metadata, never promoted into capsule evidence'), 'missing_capsule_boundary_regression_missing');
assert.ok(canonicalTests.includes('MODEL OUTPUT != OBSERVATION and RETURN requires reality observation'), 'model_output_observation_boundary_regression_missing');
assert.ok(canonicalTests.includes('object-specific JSON-LD is bounded and contains no fabricated identity identifiers'), 'object_specific_jsonld_regression_missing');

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
  publicSemanticProjectionContract: SFI_PUBLIC_SEMANTIC_PROJECTION_CONTRACT,
  evidenceCapsuleContract: SFI_EVIDENCE_CAPSULE_CONTRACT,
  objectTypes: SFI_CANONICAL_OBJECT_TYPES.length,
  r3PublicSemanticObjectTypes: SFI_PUBLIC_SEMANTIC_OBJECT_TYPES.length,
  canonicalRegistryEntries: SFI_CANONICAL_OBJECT_REGISTRY.length,
  emittedSemanticObjects: publicSemanticProjectionsForCanonicalObjects(SFI_CANONICAL_OBJECT_REGISTRY).length,
  observedExternalIdentityNodes: SFI_EXTERNAL_IDENTITY_NODES.length,
  disambiguationRisks: SFI_DISAMBIGUATION_RISKS.length,
  verifiedSameAs: SFI_PUBLIC_PROFILE.institution.verifiedSameAs.length,
  duplicateCanonicalOwners: 0,
  duplicateInstitutionProfiles: 0,
  duplicateSitemapOwners: 0,
  duplicateAiIndexes: 0,
  status: 'PASS',
}, null, 2));
