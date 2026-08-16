import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/sfi-verify.yml', 'utf8');

assert.match(workflow, /\npermissions:\n\s+contents: read\n/, 'SFI Verify must explicitly limit GITHUB_TOKEN to contents: read.');

const verifyStart = workflow.indexOf('\n  verify:\n');
const audioStart = workflow.indexOf('\n  audio:\n');
assert.ok(verifyStart >= 0, 'SFI Verify core job is missing.');
assert.ok(audioStart > verifyStart, 'SFI Verify audio job must exist independently after core job.');

const core = workflow.slice(verifyStart, audioStart);
const audio = workflow.slice(audioStart);

for (const command of [
  'npm run qa:studio-audio',
  'npm run qa:sfi-studio-loudness',
  'npm run qa:sfi-studio-rhythm',
  'npm run qa:sfi-studio-harmony',
]) {
  assert.ok(audio.includes(command), `Audio job lost required gate: ${command}`);
  assert.ok(!core.includes(command), `Audio gate must not remain serialized in core job: ${command}`);
}

assert.match(core, /npm run typecheck/, 'Core job must retain TypeScript validation.');
assert.match(core, /npm run build/, 'Core job must retain production build.');
assert.match(core, /qa-sfi-decision-transfer-target-timing\.ts/, 'Core job must retain latest Decision Transfer timing gate.');
assert.match(audio, /name: Verify Studio audio gates/, 'Audio job must remain visibly named, not hidden as an optimization helper.');
assert.match(core, /npm install --no-audit --no-fund/, 'Core job must install dependencies independently.');
assert.match(audio, /npm install --no-audit --no-fund/, 'Audio job must install dependencies independently.');
assert.doesNotMatch(core, /^\s+needs:/m, 'Core verification must not wait on audio.');
assert.doesNotMatch(audio, /^\s+needs:/m, 'Audio verification must not wait on core.');
assert.doesNotMatch(audio, /^\s+if:/m, 'Audio gates must run on every SFI Verify invocation; this optimization is parallelism, not skipping.');

console.log(JSON.stringify({
  ok: true,
  gate: 'SFI_VERIFY_PARALLEL_TOPOLOGY',
  coreAndAudioParallel: true,
  audioGateCount: 4,
  pathSkipping: false,
  tokenPermissions: 'contents:read',
  typecheckRetained: true,
  buildRetained: true,
}, null, 2));
