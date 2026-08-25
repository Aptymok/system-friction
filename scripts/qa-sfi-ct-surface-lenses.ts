import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path: string) { return readFileSync(path, 'utf8'); }

const scenes = read('src/components/sfi/scenes.ts');
const overlay = read('src/components/sfi/SceneFieldOverlay.tsx');
const overlayCss = read('src/components/sfi/SceneFieldOverlay.css');
const page = read('src/app/[scene]/page.tsx');
const connection = read('src/core/cognitive-twin/reentry/connectionStatus.ts');
const connectionRoute = read('src/app/api/root/cognitive-twin/connection/route.ts');
const evaluateRoute = read('src/app/api/root/method-lab/decision-transfer/route.ts');
const blindRoute = read('src/app/api/root/method-lab/decision-transfer/blind/route.ts');
const revealRoute = read('src/app/api/root/method-lab/decision-transfer/reveal/route.ts');

for (const scene of ['field','systems','archive','falsification','optionality','governance','authority','agents','identity','models','genai','root']) {
  assert.ok(scenes.includes(`'${scene}'`), `scene missing: ${scene}`);
}
assert.match(scenes, /identity:[\s\S]*liveSource:'\/api\/root\/cognitive-twin\/connection'/, 'IDENTITY must read CT connection truth');
assert.match(scenes, /genai:[\s\S]*liveSource:'\/api\/external\/v1\/manifest'/, 'GENAI must read external gateway manifest');
assert.match(scenes, /governance:[\s\S]*Propuesta → autorización → ejecución → RETURN → calibración → aprendizaje → canon\/cierre/, 'governance scene must expose the full cycle');

assert.match(page, /<SceneFieldOverlay scene=\{key\}\/>/, 'scene page must mount live field overlay');
for (const label of ['OBSERVED EXECUTION','WAITING EVIDENCE','CANON AUTHORITY','CONNECTION','VALIDATION','EXTERNAL ACTION']) {
  assert.ok(overlay.includes(label), `overlay signal missing: ${label}`);
}
assert.match(overlay, /fetch\(SCENES\[scene\]\.liveSource/, 'overlay must read the scene-specific live source');
assert.match(overlayCss, /position:fixed/, 'overlay must remain a field layer rather than reflowing the scene into dashboard cards');
assert.doesNotMatch(overlayCss, /grid-template-columns/, 'scene field overlay must not become a card grid');

assert.match(connection, /connectionState: connected \? 'CONNECTED'/, 'CT must expose CONNECTED separately');
assert.match(connection, /functionState: functional \? 'FUNCTIONAL'/, 'CT must expose FUNCTIONAL separately');
assert.match(connection, /validationState: validationObserved \? 'OBSERVED' : 'GATED'/, 'CT validation must remain distinct from connectivity');
assert.match(connection, /ROOT_ONLY/, 'CT connection status must preserve ROOT canon boundary');
for (const route of ['/api/root/method-lab/decision-transfer','/api/root/method-lab/decision-transfer/blind','/api/root/method-lab/decision-transfer/reveal']) {
  assert.ok(connection.includes(route), `CT adapter route missing from connection truth: ${route}`);
}
assert.match(connectionRoute, /requireRootActor\('root\.cognitive-twin\.connection\.read'\)/, 'CT connection read must remain ROOT governed');
assert.match(evaluateRoute, /executeDecisionTransferEvaluation/, 'CT direct evaluation executor must remain connected');
assert.match(blindRoute, /executeBlindDecisionReconstruction/, 'CT blind executor must remain connected');
assert.match(revealRoute, /revealBlindDecisionReconstruction|executeBlindDecision/, 'CT reveal executor must remain connected');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-CT-SURFACE-LENSES-1.0',
  ctStates: ['CONNECTED','FUNCTIONAL','OBSERVED_OPERATIONAL','VALIDATION_GATED_OR_OBSERVED'],
  surfaceRule: 'one visual language; distinct operational lens per door; data annotates the field instead of replacing it with dashboards',
}, null, 2));
