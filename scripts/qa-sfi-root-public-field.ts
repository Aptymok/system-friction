import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const read=(p:string)=>fs.readFileSync(path.join(process.cwd(),p),'utf8');
const canon=read('src/lib/discovery/canonicalObjectRegistry.ts');
const repositoryUi=read('src/app/repository/RepositoryConsole.tsx');
const publicState=read('src/lib/observatory/publicState.ts');

assert.match(canon,/PUBLIC is a governed projection of canonical institutional state/);
assert.match(canon,/publication does not[\s\S]*manufacture observation, external recognition, interaction, PULL or RETURN/);
assert.match(canon,/canonicalPublicationDisposition\(record\)\.disposition !== 'PUBLISH'/);
assert.match(canon,/privacy: 'PUBLIC'/);
assert.match(canon,/rights: 'CLEARED'/);
assert.match(canon,/governance: 'PUBLICABLE'/);
assert.match(canon,/evidenceIdentity: 'VALID'/);
assert.match(canon,/SFI_RUNTIME_DERIVED_CANONICAL_OBJECTS:[^=]*= Object\.freeze\(\[\]\)/);
assert.match(repositoryUi,/PUBLICATIONS \/ OBJECTS/);
assert.match(repositoryUi,/PROVENANCE/);
assert.match(repositoryUi,/PUBLICATION = EXPOSURE/);
assert.doesNotMatch(repositoryUi,/INSTITUTIONAL ATTRACTOR/);
assert.match(publicState,/\.eq\('status', 'PUBLISHED'\)/);
assert.match(publicState,/\.not\('published_at', 'is', null\)/);

console.log('PASS · ROOT/REPOSITORY are surfaces over institutional state; publication remains governed projection, not a cognitive pipeline.');
