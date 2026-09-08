import assert from 'node:assert/strict';
import fs from 'node:fs';

const workspace = fs.readFileSync('src/components/sfi/SfiRootWorkspace.tsx', 'utf8');
const css = fs.readFileSync('src/components/sfi/SfiRootWorkspace.css', 'utf8');
const scenePage = fs.readFileSync('src/app/[scene]/page.tsx', 'utf8');
const consoleSource = fs.readFileSync('src/components/sfi/SfiConsole.tsx', 'utf8');

assert.match(scenePage, /SfiConsole/, 'root must remain on canonical scene surface');
assert.match(consoleSource, /current==='root'\?<SfiRootWorkspace enabled\/>/, 'canonical root scene must mount existing root workspace');
assert.match(workspace, /SFI-ROOT-VISUAL-2\.0/, 'final root visual contract missing');
assert.match(workspace, /data-root-module-count=\{OBSERVE_LINKS\.length\}/, 'module count must be derived from canonical links');

const hrefs = [...workspace.matchAll(/\{ href: '([^']+)', label:/g)].map((match) => match[1]);
assert.equal(hrefs.length, 10, 'root elected composition must expose exactly ten canonical module lenses');
assert.equal(new Set(hrefs).size, 10, 'root module lenses must not be duplicates');
for (const href of ['/observatory','/cases','/method-lab','/twin','/studio','/library','/governance','/root/evidence-review','/history/mutations']) {
  assert.ok(hrefs.includes(href), `root canonical module missing:${href}`);
}

assert.match(workspace, /MISSING y DEGRADED permanecen visibles/, 'root must state missing/degraded boundary');
assert.match(workspace, /OBSERVACIÓN ≠ INFERENCIA/, 'root epistemic distinction missing');
assert.match(workspace, /SIMULACIÓN ≠ OBSERVACIÓN/, 'root simulation boundary missing');
assert.match(workspace, /rootActionRequired === true/, 'root sovereign work queue semantics must remain data-driven');
assert.match(workspace, /jsonFetch\('\/api\/root\/interactive\?surface=root'\)/, 'root must retain canonical live read contract');
assert.match(workspace, /jsonFetch\('\/api\/root\/decisions'/, 'root decision writes must retain canonical writer');
assert.match(workspace, /const readState = base \? \(error \? 'DEGRADED' : 'OBSERVED'\) : \(error \? 'DEGRADED' : 'MISSING'\)/, 'root must derive epistemic read state from actual read outcome');
assert.match(workspace, /data-epistemic-state=\{readState\}/, 'pulse cards must carry observed read state');
assert.match(workspace, /const pulseValue = \(value: number\) => base \? value : 'MISSING'/, 'absent reads must not project numeric zero');
assert.match(css, /content:attr\(data-epistemic-state\)/, 'pulse label must render runtime epistemic state');
assert.doesNotMatch(css, /content:"OBSERVED"/, 'CSS must not stamp unavailable pulse data as observed');
assert.doesNotMatch(workspace, /Math\.random|mock|simulated|hardcodedHealthy/i, 'production root must not invent display state');

for (const token of ['--root-gold:#c9a84b','--root-red:#b94a4a','SFI / ROOT / AUTHORITY FIELD','counter-reset:rootModule']) {
  assert.ok(css.includes(token), `root elected visual token missing:${token}`);
}
assert.match(css, /\.rootState\.attention\{[^}]*--root-red|\.rootState\.attention\{[^}]*rgba\(185,74,74/i, 'red must be reserved for attention/critical state');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-ROOT-VISUAL-2.0',
  canonicalSurface: '/root -> SfiConsole -> SfiRootWorkspace',
  moduleCount: hrefs.length,
  topology: ['OBSERVATION','AUTHORITY','RETURN'],
  unavailableState: 'MISSING_OR_DEGRADED_NOT_ZERO',
  simulatedMetrics: false,
  newWriter: false,
}));
