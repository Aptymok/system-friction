import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
const materializer = read('scripts/materialize-spatial-assets.mjs');
const method = read('src/components/sfi/MethodLabEnvironment.tsx');
const methodCss = read('src/components/sfi/MethodLabEnvironment.css');
const spine = read('src/components/sfi/CognitiveSpinePark.tsx');
const spineCss = read('src/components/sfi/CognitiveSpinePark.css');

assert.equal(pkg.scripts?.postinstall, 'node scripts/materialize-spatial-assets.mjs');
assert.equal(pkg.scripts?.prebuild, 'node scripts/materialize-spatial-assets.mjs');
assert.ok(materializer.includes("public/method-lab/lab-desktop.avif"));
assert.ok(materializer.includes("public/method-lab/lab-ambient.mp4"));
assert.ok(materializer.includes("public/cognitive-spine/park-desktop.avif"));
assert.ok(materializer.includes("public/cognitive-spine/park-ambient.mp4"));
assert.ok(materializer.includes('spatial_asset_size_mismatch'));
assert.ok(materializer.includes('spatial_asset_sha_mismatch'));

assert.ok(method.includes('/method-lab/lab-desktop.avif'));
assert.ok(method.includes('/method-lab/lab-ambient.mp4'));
assert.ok(method.includes('mlenv-board'));
assert.ok(method.includes('MOTION ≠ ACTIVITY'));
assert.ok(method.includes('SIMULATED ≠ OBSERVED'));
assert.ok(methodCss.includes('.mlenv-video'));
assert.ok(methodCss.includes('.mlenv-board'));

assert.ok(spine.includes('/cognitive-spine/park-desktop.avif'));
assert.ok(spine.includes('/cognitive-spine/park-ambient.mp4'));
assert.ok(spine.includes('sfiParkBoard'));
assert.ok(spine.includes('AMBIENT MOTION ≠ ACTIVITY'));
assert.ok(spine.includes('LIVE = OBSERVED EVENT ONLY'));
assert.ok(spineCss.includes('.sfiParkVideo'));
assert.ok(spineCss.includes('.sfiParkBoard'));

for (const [path, minBytes, signature] of [
  ['public/method-lab/lab-desktop.avif', 20000, 'ftypavif'],
  ['public/cognitive-spine/park-desktop.avif', 15000, 'ftypavif'],
  ['public/method-lab/lab-ambient.mp4', 5000, 'ftyp'],
  ['public/cognitive-spine/park-ambient.mp4', 5000, 'ftyp'],
] as const) {
  const buffer = readFileSync(path);
  assert.ok(statSync(path).size >= minBytes, `spatial_asset_too_small:${path}`);
  assert.ok(buffer.subarray(0, 40).toString('ascii').includes(signature), `spatial_asset_signature_invalid:${path}`);
}

console.log(JSON.stringify({ ok: true, contract: 'SFI-SPATIAL-SURFACES-1.0' }));
