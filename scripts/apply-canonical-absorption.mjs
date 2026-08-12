import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT=process.cwd();
const run=(...args)=>execFileSync('git',args,{cwd:ROOT,stdio:'inherit'});
const exists=p=>fs.existsSync(path.join(ROOT,p));
const mv=(from,to)=>{if(!exists(from))return;fs.mkdirSync(path.dirname(path.join(ROOT,to)),{recursive:true});run('mv',from,to)};
const rm=p=>{if(exists(p))run('rm','-r',p)};

mv('src/lib/cognitive-twin','src/core/cognitive-twin');
mv('src/lib/memory/institutionalMemoryWriter.ts','src/core/memory/InstitutionalMemoryWriter.ts');
rm('src/components/observatory/quarantine');

const extensions=new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs','.md','.json']);
const replacements=new Map([
  ['@/lib/cognitive-twin/','@/core/cognitive-twin/'],
  ['@/lib/cognitive-twin','@/core/cognitive-twin'],
  ['@/lib/memory/institutionalMemoryWriter','@/core/memory/InstitutionalMemoryWriter'],
  ['/root/predictions/new','/root/predictions#new-prediction'],
  ['/root/prospect-radar','/root/commercial#prospect-radar'],
  ['/root/development','/root/readiness'],
  ['/root/continuity','/root/readiness'],
  ['/root/contracts','/root/readiness'],
  ['/root/total-proof','/root/readiness'],
  ['/root/cognitive-twin/system','/root/cognitive-twin'],
  ['/root/cognitive-twin/lineage','/root/cognitive-twin'],
  ['/root/cognitive-twin/journal','/root/cognitive-twin'],
  ['/root/agents/passports','/root/agents'],
  ['/root/overview','/root'],
  ['/root/operate','/pipeline'],
  ['/root/pipeline','/pipeline'],
  ['/operator/field','/field'],
]);
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.name==='.git'||entry.name==='node_modules')continue;const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(extensions.has(path.extname(entry.name))){let s=fs.readFileSync(p,'utf8');const before=s;for(const [a,b] of replacements)s=s.split(a).join(b);if(s!==before)fs.writeFileSync(p,s)}}}
walk(ROOT);

const surfacePath=path.join(ROOT,'config/sfi-surfaces.json');
if(fs.existsSync(surfacePath)){
  const config=JSON.parse(fs.readFileSync(surfacePath,'utf8'));
  delete config.absorbedRoutes;
  fs.writeFileSync(surfacePath,JSON.stringify(config,null,2)+'\n');
}

// Contract-only Python CT shim: no runtime consumer beyond the AMV barrel.
rm('src/lib/amv/agents/cognitiveTwinBridgeAgent.ts');
const agentIndex=path.join(ROOT,'src/lib/amv/agents/index.ts');
if(fs.existsSync(agentIndex)){
  const s=fs.readFileSync(agentIndex,'utf8').split('\n').filter(line=>!line.includes('cognitiveTwinBridgeAgent')).join('\n');
  fs.writeFileSync(agentIndex,s);
}

console.log('Canonical absorption applied.');
