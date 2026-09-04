import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const publicPage = read('src/app/library/page.tsx');
const dynamicScenePage = read('src/app/[scene]/page.tsx');
const scenes = read('src/components/sfi/scenes.ts');
const consoleUi = read('src/components/sfi/SfiConsole.tsx');
const inspector = read('src/lib/sfi/library/cognitiveSpineImpactContext.ts');
const route = read('src/app/api/root/library/cognitive-spine/route.ts');

// /library is again a documentary presentation surface. Its catalog comes from the
// canonical SFI document frontmatter; it must remain read-only and must not infer
// private Cognitive Spine state or pretend compact metadata contains full bodies.
assert.ok(publicPage.includes('sf_docs_frontmatter.json'), 'library_canonical_catalog_source_missing');
assert.ok(publicPage.includes('Biblioteca SFI'), 'library_documentary_surface_missing');
assert.ok(publicPage.includes('Catálogo durable'), 'library_durable_catalog_contract_missing');
assert.ok(publicPage.includes('cuerpos completos') || publicPage.includes('cuerpo completo'), 'library_compact_body_boundary_missing');
assert.equal(publicPage.includes("redirect('/archive')"), false, 'library_must_not_remain_archive_redirect_alias');
assert.ok(scenes.includes("LEGACY_INTERNAL_SCENES=['systems','archive'"), 'archive_legacy_lens_registry_missing');
assert.equal(scenes.includes("archive:{key:'archive'"), false, 'archive_must_not_reappear_as_independent_live_scene');
assert.ok(dynamicScenePage.includes('LEGACY_INTERNAL_SCENES'), 'shared_scene_router_legacy_registry_missing');
assert.ok(dynamicScenePage.includes("redirect('/root')"), 'legacy_archive_lens_must_resolve_to_canonical_root_surface');
assert.ok(consoleUi.includes("href:'/library'") || consoleUi.includes("href: '/library'"), 'library_must_be_navigable_from_operating_shell');
for (const forbiddenPrivateRead of [
  "@/runtime/supabase",
  'createServiceSupabaseClient',
  'materializeInstitutionalCognitiveSpineProfile',
  'cognitiveSpineImpactContext',
]) {
  assert.equal(publicPage.includes(forbiddenPrivateRead), false, `library_catalog_reads_private_state:${forbiddenPrivateRead}`);
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
  publicLibrarySurface: 'DOCUMENTARY_CATALOG',
  archiveIndependentSurface: false,
  libraryCatalogReadsPrivateCt: false,
  ordinaryLibraryReadConsumesCt: false,
  impactStatus: 'UNDEMONSTRATED',
  fabricatedImpactLinks: false,
  artifactContentHashIdentityReady: false,
  storageCreatesEvidence: false,
  associationImpliesCausality: false,
}, null, 2));
