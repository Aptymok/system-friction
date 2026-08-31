import fs from 'node:fs';
const path='src/components/sfi/SfiConsole.tsx';
const before=fs.readFileSync(path,'utf8');
const from='<section className="twin"><div className="twinHead">';
const to='<section className="twin" data-sfi-contract="GOVERNANCE QUEUE"><div className="twinHead">';
if(!before.includes(from)) throw new Error('GOVERNANCE_QUEUE_SECTION_ANCHOR_MISSING');
fs.writeFileSync(path,before.replace(from,to));
console.log('ROOT governance queue contract marker preserved');
