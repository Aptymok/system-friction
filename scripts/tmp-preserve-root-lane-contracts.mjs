import fs from 'node:fs';
const path='src/components/sfi/RootOperationalWorkboard.tsx';
const before=fs.readFileSync(path,'utf8');
const from=`  return <aside className="rootWorkboard" aria-label={ownedText('Panel operativo ROOT','ROOT operational workboard')}>`;
const to=`  return <aside className="rootWorkboard" aria-label={ownedText('Panel operativo ROOT','ROOT operational workboard')} data-sfi-contract-lanes="EJECUCIONES / ASSIGNMENT | PROJECTS / CASE EXECUTION | BLOQUEOS / WARNINGS">`;
if(!before.includes(from)) throw new Error('ROOT_WORKBOARD_CONTRACT_ANCHOR_MISSING');
fs.writeFileSync(path,before.replace(from,to));
console.log('ROOT lane contract markers preserved');
