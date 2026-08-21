import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const studioPage = read('src/app/studio/page.tsx');
const scenes = read('src/components/sfi/scenes.ts');
const liveUi = read('src/components/sfi/SfiConsole.tsx');
const fieldRoute = read('src/app/api/studio/field/route.ts');

// Studio's legacy workspace UI was intentionally removed with the old frontend.
// /studio remains a compatibility entry and resolves into the canonical MODELS scene.
assert.ok(studioPage.includes("redirect('/models')"), 'studio_alias_must_resolve_to_models_scene');
assert.ok(scenes.includes("models:{key:'models'"), 'models_live_scene_missing');
assert.ok(scenes.includes("genai:{key:'genai'"), 'genai_live_scene_missing');
assert.ok(scenes.includes("markers:['tokens','capas','atención','salida']"), 'models_observability_markers_missing');
assert.ok(liveUi.includes('FUENTE VIVA') && liveUi.includes('ESTADO'), 'studio_live_telemetry_missing');
assert.ok(liveUi.includes('COGNITIVE TWIN'), 'studio_cognitive_instrument_missing');

// The Studio backend survives the visual replacement and remains the persistence boundary.
assert.ok(fieldRoute.length > 0, 'studio_field_api_missing');
assert.ok(/GET|POST/.test(fieldRoute), 'studio_field_api_has_no_handlers');
assert.equal(studioPage.includes('createServiceSupabaseClient'), false, 'studio_alias_reads_supabase_directly');
assert.equal(studioPage.includes('.from('), false, 'studio_alias_reads_database_directly');
assert.equal(liveUi.includes('createServiceSupabaseClient'), false, 'live_scene_reads_supabase_directly');

console.log(JSON.stringify({
  ok: true,
  nativeContinuousStudio: true,
  legacyWorkspaceRemoved: true,
  canonicalSurface: 'MODELS_LIVE_SCENE',
  companionSurface: 'GENAI_LIVE_SCENE',
  directSupabaseAccess: false,
  studioBackendPreserved: true,
  cognitiveInstrument: true,
}, null, 2));
