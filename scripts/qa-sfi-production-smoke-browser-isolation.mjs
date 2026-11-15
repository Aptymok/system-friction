import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const code = readFileSync('scripts/qa-sfi-production-observatory-smoke.mjs', 'utf8');
assert.ok(code.includes("'--remote-debugging-port=0'"), 'CDP port must be assigned by Chromium');
assert.ok(code.includes("readFile(path.join(dir, 'DevToolsActivePort'), 'utf8')"), 'selected port must come from this browser profile');
assert.ok(code.includes("Number.isInteger(port)"), 'CDP port must be checked');
assert.ok(code.includes("cdp_profile_port_invalid"), 'invalid CDP identity must fail closed');
assert.ok(code.includes("browserTarget(port, devToolsActiveLines)"), 'browser must connect only to profile-selected endpoint');
assert.ok(!code.includes('remote-debugging-port=9222'), 'fixed CDP port risks inspecting another browser');
assert.ok(!code.includes('const port = 9222'), 'fixed CDP port risks inspecting another browser');
assert.ok(code.includes('sample.metrics.length === 4'), 'hydration must require all four metric projections');
assert.ok(code.includes('sample.interpretive === null || VALID.has(sample.interpretive)'), 'optional interpretive panel must not block observation');
assert.ok(code.includes('sample.metrics.every((metric) => VALID.has(metric.availability))'), 'metrics must have recognized availability states');

console.log(JSON.stringify({ok:true,contract:'SFI-PRODUCTION-CDP-ISOLATION-1.0'}));
