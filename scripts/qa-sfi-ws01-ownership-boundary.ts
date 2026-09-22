#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path: string) => fs.readFileSync(path, 'utf8');
const ws01 = read('docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md');
const ws03 = read('docs/program/workstreams/WS-03-DISCOVERY-MESH.md');
const ws08 = read('docs/program/workstreams/WS-08-ASSURANCE-RELEASE.md');

assert.match(
  ws01,
  /baseline issue `#366` remains outside WS-01 ownership and under WS-03\/WS-08 sequencing;/,
  'WS-01 must preserve the #366 ownership exclusion and WS-03/WS-08 sequencing',
);
assert.match(ws03, /## 12\. Active corrective slice — #366 Observatory availability/, 'WS-03 must retain #366 as its corrective slice');
assert.match(ws08, /\*\*Implementation owner:\*\* WS-03 · DISCOVERY MESH/, 'WS-08 assurance must identify WS-03 as #366 implementation owner');
assert.match(ws08, /\*\*Independent verifier:\*\* WS-08 · ASSURANCE \+ RELEASE/, 'WS-08 must remain the independent #366 verifier');
assert.match(ws08, /# #366 PRODUCTION ASSURANCE: PASS/, '#366 independent production assurance receipt must remain recorded');
assert.match(ws08, /# OBSERVED_IN_PRODUCTION: YES/, '#366 assurance must preserve observed-in-production disposition');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-WS01-OWNERSHIP-BOUNDARY-1.0',
  requirement: 'WS-01-040',
  issue: 366,
  implementationOwner: 'WS-03',
  independentVerifier: 'WS-08',
  ws01Ownership: false,
}));
