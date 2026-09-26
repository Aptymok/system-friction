import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const publicPage = read('src/app/library/page.tsx');
const documentaryCatalog = read('src/lib/sfi/library/documentaryCatalog.ts');
const dynamicScenePage = read('src/app/[scene]/page.tsx');
const scenes = read('src/components/sfi/scenes.ts');
const consoleUi = read('src/components/sfi/SfiConsole.tsx');
const inspector = read('src/lib/sfi/library/cognitiveSpineImpactContext.ts');
const route = read('src/app/api/root/library/cognitive-spine/route.ts');

// The public /library surface is retired into /publications.
// The canonical documentary corpus remains an internal read-only capability and
// must not infer private Cognitive Spine state or pretend compact metadata contains full bodies.
assert.ok(publicPage.includes("redirect('/publications')"), 'library_public_surface_must_redirect_to_publications');
assert.ok(documentaryCatalog.includes('sf_docs_frontmatter.json'), 'library_canonical_catalog_source_missing');
assert.ok(documentaryCatalog.includes('LIBRARY · DOCUMENTARY CORPUS'), 'library_documentary_surface_contract_missing');
assert.ok(documentaryCatalog.includes('CANONICAL DOCUMENTARY CATALOG'), 'library_canonical_catalog_contract_missing');
assert.ok(documentaryCatalog.includes('full bodies are not assumed to be materialized'), 'library_compact_body_boundary_missing');
assert.ok(documentaryCatalog.includes('FULL DOCUMENT BODY READER = NOT MATERIALIZED'), 'library_full_body_reader_boundary_missing');
assert.equal(publicPage.includes("redirect('/archive')"), false, 'library_must_not_remain_archive_redirect_alias');
assert.ok(scenes.includes("LEGACY_INTERNAL_SCENES=['systems','archive'"), 'archive_legacy_lens_registry_missing');
assert.equal(scenes.includes("archive:{key:'archive'"), false, 'archive_must_not_reappear_as_independent_live_scene');
assert.ok(dynamicScenePage.includes('LEGACY_INTERNAL_SCENES'), 'shared_scene_router_legacy_registry_missing');
assert.ok(dynamicScenePage.includes("redirect('/root')"), 'legacy_archive_lens_must_resolve_to_canonical_root_surface');
assert.equal(consoleUi.includes("href:'/library'") || consoleUi.includes("href: '/library'"), false, 'retired_library_surface_must_not_reappear_in_operating_shell');
for (const forbiddenPrivateRead of ["@/runtime/supabase", 'createServiceSupabaseClient', 'materializeInstitutionalCognitiveSpineProfile', 'cognitiveSpineImpactContext']) {
  assert.equal(documentaryCatalog.includes(forbiddenPrivateRead), false, `library_catalog_reads_private_state:${forbiddenPrivateRead}`);
}

assert.ok(inspector.includes('LIBRARY_IMPACT_CONTEXT_PROFILE'), 'library_projection_profile_missing');
assert.ok(inspector.includes('consume: false'), 'library_ordinary_read_must_not_consume_ct');
assert.ok(inspector.includes("status: 'UNDEMONSTRATED'"), 'library_impact_overclaimed');
assert.ok(inspector.includes('impactLinks: []'), 'library_impact_links_fabricated');
assert.ok(inspector.includes("artifactContentHashRegistryAvailable: false"), 'library_artifact_identity_gap_not_declared');
assert.ok(inspector.includes('No canonical artifact-to-Cognitive-Spine-transition relationship is currently registered'), 'library_missing_impact_provenance_not_declared');
assert.ok(inspector.includes('storageCreatesEvidence: false'), 'library_storage_evidence_boundary_missing');
assert.ok(inspector.includes('artifactAssociationImpliesCausality: false'), 'library_noncausal_boundary_missing');
assert.ok(inspector.includes('unavailableCtBlocksLibrary: false'), 'library_became_ct_middleware');
assert.ok(inspector.includes('ctContextConsumedByLibraryRead: false'), 'library_read_consumes_ct');
assert.equal(inspector.includes('recordCognitiveTwinExperience'), false, 'library_inspection_promotes_state');
assert.equal(inspector.includes(".insert("), false, 'library_impact_inspection_writes_state');
assert.equal(inspector.includes(".update("), false, 'library_impact_inspection_mutates_state');

assert.ok(route.includes("requireRootViewer('root.library.cognitive-spine.read')"), 'library_impact_inspection_not_root_gated');
assert.ok(route.includes('Cache-Control'), 'library_root_inspection_cache_boundary_missing');

console.log(JSON.stringify({
  ok: true,
  profile: 'LIBRARY_IMPACT_CONTEXT_V1.1',
  publicLibrarySurface: 'REDIRECT_TO_PUBLICATIONS',
  canonicalDocumentaryCatalog: 'INTERNAL_READ_ONLY_CAPABILITY',
  archiveIndependentSurface: false,
  libraryCatalogReadsPrivateCt: false,
  ordinaryLibraryReadConsumesCt: false,
  impactStatus: 'UNDEMONSTRATED',
  fabricatedImpactLinks: false,
  artifactContentHashIdentityReady: false,
  storageCreatesEvidence: false,
  associationImpliesCausality: false,
}, null, 2));
