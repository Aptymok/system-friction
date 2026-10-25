import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const code=readFileSync('src/lib/method-lab/readModel.ts','utf8');
assert.match(code,/async function probeDependencies\(\)/);
assert.match(code,/\.select\('id', \{ head: true \}\)\.limit\(1\)/);
assert.doesNotMatch(code,/select\('\*', \{ count: 'exact', head: true \}\)/);
assert.match(code,/available: !probe\.error/);
assert.match(code,/probe\.error\?\.message \|\| probe\.error\?\.code/);
console.log('PASS METHOD_LAB_DEPENDENCY_READ: lightweight bounded probes, fail-closed errors.');
