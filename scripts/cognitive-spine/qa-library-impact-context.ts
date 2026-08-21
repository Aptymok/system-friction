import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const publicPage = read('src/app/library/page.tsx');
const scenes = read('src/components/sfi/scenes.ts');
const consoleUi = read('src/components/sfi/SfiConsole.tsx');
const inspector = read('src/lib/sfi/library/cognitiveSpineImpactContext.ts');
const route = read('src/app/api/root/library/cognitive-spine/route.ts');

// The legacy Library frontend has been retired. /library is now a compatibility
// alias into the live ARCHIVE scene. The alias must remain presentation-only and
// must not read private Cognitive Spine state itself.
assert.ok(publicPage.includes("redirect('/archive')"), 'library_alias_must_resolve_to_archive_scene');
assert.ok(scenes.includes("archive:{key:'archive'"), 'archive_scene_missing');
assert.ok(scenes.includes("title:'Archivo, fuente y contexto'"), 'archive_scene_semantics_missing');
assert.ok(consoleUi.includes('SfiConsole'), 'live_scene_runtime_missing');
for (const forbiddenPrivateRead of [
  "@/runtime/supabase",
  'createServiceSupabaseClient',
  'materializeInstitutionalCognitiveSpineProfile',
  'cognitiveSpineImpactContext',
]) {
  assert.equal(publicPage.includes(forbiddenPrivateRead), false, `library_alias_reads_private_state:${forbiddenPrivateRead}`);
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
  profile: 'LIBRARY_IMPACT_CONTEXT_V1',
  publicLibrarySurface: 'ARCHIVE_LIVE_SCENE',
  legacyLibraryAliasReadsPrivateCt: false,
  ordinaryArchiveReadConsumesCt: false,
  impactStatus: 'UNDEMONSTRATED',
  fabricatedImpactLinks: false,
  artifactContentHashIdentityReady: false,
  storageCreatesEvidence: false,
  associationImpliesCausality: false,
}, null, 2));
