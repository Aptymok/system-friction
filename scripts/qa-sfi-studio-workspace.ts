import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const studioPage = read('src/app/studio/page.tsx');
const fieldRoute = read('src/app/api/studio/field/route.ts');
const objectRoute = read('src/app/api/studio/objects/route.ts');
const analyzeRoute = read('src/app/api/studio/objects/[id]/analyze/route.ts');
const repository = read('src/lib/studio/production/studioProductionRepository.ts');
const access = read('src/lib/system/access/server.ts');

// /studio is an authenticated producer field. It must never be aliased to a ROOT-backed scene.
assert.equal(studioPage.includes("redirect('/models')"), false, 'studio_must_not_alias_to_models');
assert.equal(studioPage.includes('/api/root/cognitive-runtime'), false, 'studio_must_not_depend_on_root_runtime');
assert.ok(studioPage.includes("requireSfiMemberPage('/studio')"), 'studio_institutional_gate_missing');
assert.ok(studioPage.includes('moduleAccess.studio !== true'), 'studio_module_gate_missing');

// Studio reads only the authenticated actor's object scope and exposes native Studio operations.
assert.ok(studioPage.includes('listStudioObjects(user.id)'), 'studio_owner_scoped_object_list_missing');
assert.ok(studioPage.includes('getStudioObjectFeatures(activeId, user.id)'), 'studio_owner_scoped_features_missing');
for (const instrument of ['/analyze', '/content', '/features', '/evidence', '/cognitive']) {
  assert.ok(studioPage.includes(instrument), `studio_instrument_missing:${instrument}`);
}

// Machine routes preserve the same ownership boundary independently of the visual surface.
assert.ok(objectRoute.includes('requireAuthenticatedUser'), 'studio_objects_auth_gate_missing');
assert.ok(objectRoute.includes('listStudioObjects(user.id'), 'studio_objects_owner_scope_missing');
assert.ok(repository.includes(".eq('owner_id', ownerId)"), 'studio_repository_owner_predicate_missing');
assert.ok(access.includes('requireObjectOwner'), 'studio_object_owner_gate_missing');
assert.ok(analyzeRoute.includes('requireObjectOwner(objectId)'), 'studio_analysis_owner_gate_missing');

// Existing Studio field APIs remain callable; the repair changes access composition, not the persistence owner.
assert.ok(fieldRoute.length > 0, 'studio_field_api_missing');
assert.ok(/GET|POST/.test(fieldRoute), 'studio_field_api_has_no_handlers');
assert.equal(studioPage.includes('createServiceSupabaseClient'), false, 'studio_page_must_use_repository_not_service_client');
assert.equal(studioPage.includes('.from('), false, 'studio_page_reads_database_directly');

console.log(JSON.stringify({
  ok: true,
  canonicalSurface: '/studio',
  accessModel: 'AUTHENTICATED_MEMBER + STUDIO_MODULE + OBJECT_OWNER',
  rootRuntimeDependency: false,
  ownerScopedObjectList: true,
  studioBackendPreserved: true,
  instruments: ['analyze', 'content', 'features', 'evidence', 'cognitive'],
}, null, 2));
