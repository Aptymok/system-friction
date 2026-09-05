import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  SFI_CANONICAL_OBJECT_REGISTRY,
  validateCanonicalObjectRegistry,
} from '../src/lib/discovery/canonicalObjectRegistry';
import {
  SFI_RESEARCH_CANONICAL_LINEAGE_CONTRACT,
  SFI_RESEARCH_GRAPH_INTEGRITY_CONTRACT,
  SFI_RESEARCH_METADATA_CONTRACT,
  SFI_RESEARCH_NO_FABRICATED_IDENTIFIERS_CONTRACT,
  SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES,
  SFI_RESEARCH_RELATIONSHIP_TYPES,
  projectResearchGraph,
  validateResearchGraphProjection,
} from '../src/lib/research/researchGraphProjection';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

function walk(relative: string): string[] {
  const absolute = path.join(root, relative);
  if (!existsSync(absolute)) return [];
  const output: string[] = [];
  for (const entry of readdirSync(absolute)) {
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

const owner = read('src/lib/research/researchGraphProjection.ts');
const tests = read('src/lib/research/researchGraphProjection.test.ts');
const canonicalOwner = read('src/lib/discovery/canonicalObjectRegistry.ts');
const metadataQa = read('scripts/qa-sfi-research-metadata.mjs');
const citationRaw = read('CITATION.cff');
const workflow = read('.github/workflows/sfi-verify.yml');

assert.equal(SFI_RESEARCH_GRAPH_INTEGRITY_CONTRACT, 'SFI-RESEARCH-GRAPH-INTEGRITY-1.0');
assert.equal(SFI_RESEARCH_METADATA_CONTRACT, 'SFI-RESEARCH-METADATA-1.0');
assert.equal(SFI_RESEARCH_NO_FABRICATED_IDENTIFIERS_CONTRACT, 'SFI-RESEARCH-NO-FABRICATED-IDENTIFIERS-1.0');
assert.equal(SFI_RESEARCH_CANONICAL_LINEAGE_CONTRACT, 'SFI-RESEARCH-CANONICAL-LINEAGE-1.0');
assert.deepEqual(SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES, [
  'METHOD', 'INSTRUMENT', 'DATASET', 'REPORT', 'PAPER', 'SOFTWARE', 'RELEASE', 'RETURN', 'PUBLICATION',
]);
assert.deepEqual(SFI_RESEARCH_RELATIONSHIP_TYPES, ['REFERENCES', 'IMPLEMENTS']);
assert.equal(SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES.includes('CONCEPT' as never), false, 'concept_not_yet_research_projectable');
assert.equal(SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES.includes('OBSERVATION' as never), false, 'observation_not_yet_research_projectable');

assert.deepEqual(validateCanonicalObjectRegistry(SFI_CANONICAL_OBJECT_REGISTRY), [], 'canonical_registry_invalid_before_research_projection');
const graph = projectResearchGraph();
assert.deepEqual(validateResearchGraphProjection(graph), [], 'research_graph_projection_invalid');
assert.equal(graph.sourceOwner, 'SFI_CANONICAL_OBJECT_REGISTRY', 'research_graph_must_consume_canonical_owner');

// Research Graph is a view over the Canonical Object Plane, never a second canon/publication/identity/persistence owner.
assert.ok(owner.includes("from '../discovery/canonicalObjectRegistry'"), 'canonical_owner_import_missing');
assert.ok(owner.includes('canonicalPublicationDisposition'), 'canonical_publication_gate_must_be_reused');
assert.ok(owner.includes('publicProjectionForCanonicalObject'), 'canonical_public_projection_must_be_reused');
assert.ok(owner.includes('validateCanonicalObjectRegistry'), 'canonical_registry_validation_must_be_reused');
assert.equal(occurrencesAcrossSource('export const SFI_CANONICAL_OBJECT_REGISTRY'), 1, 'second_canonical_registry_detected');
assert.equal(occurrencesAcrossSource("'SFI-CANONICAL-OBJECT-1.0'"), 1, 'second_canonical_contract_owner_detected');
assert.equal(owner.includes('SFI_RESEARCH_GRAPH_REGISTRY'), false, 'research_graph_must_not_become_parallel_registry');
assert.equal(owner.includes('SFI_PUBLIC_PROFILE'), false, 'research_graph_must_not_own_identity');
assert.equal(owner.includes('PublicationStatus'), false, 'research_graph_must_not_own_publication_state');
assert.equal(owner.includes('CITATION.cff'), false, 'research_graph_must_not_own_repository_citation_metadata');

for (const forbidden of [
  'createServiceSupabaseClient',
  'supabase',
  'appendEpistemicEvent',
  "from('epistemic_events')",
  'setInterval(',
  'fetch(',
  'DOI_MINT',
  'ORCID_WRITE',
  'ROR_REGISTER',
  'ZENODO_PUBLISH',
]) assert.equal(owner.includes(forbidden), false, `research_projection_must_remain_derived:${forbidden}`);

assert.equal(walk('supabase/migrations').some((file) => /research[-_]?graph/i.test(file)), false, 'research_graph_migration_not_allowed_in_r2b');

// Canonical publication/publicability remains fail-closed and external representation remains downstream.
for (const token of [
  'canonicalPublicationDisposition',
  "record.publicState !== 'PUBLIC'",
  "record.publication.state !== 'PUBLISHED'",
  'PUBLIC_RIGHTS_NOT_ELIGIBLE',
  'PUBLIC_LINEAGE_REQUIRED',
]) assert.ok(canonicalOwner.includes(token), `canonical_publication_boundary_missing:${token}`);

// Relation semantics stay narrower than generic canonical association fields.
assert.ok(owner.includes("for (const ref of record.sourceRefs) add('REFERENCES', 'sourceRefs', ref)"), 'source_reference_relation_missing');
assert.ok(owner.includes("if (record.objectType === 'SOFTWARE')"), 'implements_relation_must_be_software_scoped');
assert.equal(owner.includes("add('REFERENCES', 'relatedObjects'"), false, 'generic_related_objects_must_not_be_promoted_to_references');
assert.equal(owner.includes("add('DERIVED_FROM'"), false, 'source_reference_must_not_be_promoted_to_derivation');

// Metadata/citation owner remains Slice A CFF + its fail-closed QA. R2-B does not mutate or enrich it.
let citation: Record<string, unknown>;
try {
  citation = JSON.parse(citationRaw) as Record<string, unknown>;
} catch (error) {
  throw new Error(`CITATION.cff parse failed: ${error instanceof Error ? error.message : String(error)}`);
}
assert.deepEqual(citation.authors, [{ alias: 'Aptymok', website: 'https://github.com/Aptymok' }], 'citation_identity_boundary_drift');
for (const field of ['doi', 'orcid', 'ror', 'affiliation', 'date-released', 'license']) {
  assert.equal(Object.prototype.hasOwnProperty.call(citation, field), false, `unverified_citation_field_emitted:${field}`);
}
assert.ok(metadataQa.includes('verified_doi_count=0'), 'doi_fail_closed_regression_missing');
assert.ok(metadataQa.includes('verified_orcid_count=0'), 'orcid_fail_closed_regression_missing');
assert.ok(metadataQa.includes('verified_ror_count=0'), 'ror_fail_closed_regression_missing');
assert.ok(metadataQa.includes("!exists('.zenodo.json')"), 'zenodo_override_fail_closed_regression_missing');

for (const token of [
  'private, review-required and publication-gate failures never project',
  'canonical ID, URL, type, version, publication, epistemic state, lineage, rights, limitations and MISSING survive projection',
  'typed relationships are emitted only when canonical fields prove the narrower semantics',
  'generic relatedObjects and non-software method associations remain lineage without typed semantic promotion',
  'invalid or fabricated relationships are rejected by projection validation',
  'citation export is derived from the research node and never invents DOI, ORCID, ROR, affiliation or dates',
]) assert.ok(tests.includes(token), `research_projection_regression_missing:${token}`);

assert.ok(workflow.includes('Verify research graph projection integrity'), 'research_graph_exact_head_ci_gate_missing');

console.log(JSON.stringify({
  contract: SFI_RESEARCH_GRAPH_INTEGRITY_CONTRACT,
  metadata: SFI_RESEARCH_METADATA_CONTRACT,
  identifiers: SFI_RESEARCH_NO_FABRICATED_IDENTIFIERS_CONTRACT,
  lineage: SFI_RESEARCH_CANONICAL_LINEAGE_CONTRACT,
  sourceOwner: graph.sourceOwner,
  canonicalRegistryEntries: SFI_CANONICAL_OBJECT_REGISTRY.length,
  projectedNodes: graph.nodes.length,
  relationshipTypes: SFI_RESEARCH_RELATIONSHIP_TYPES,
  projectableObjectTypes: SFI_RESEARCH_PROJECTABLE_OBJECT_TYPES,
  persistence: 'NONE',
  status: 'PASS',
}, null, 2));
