import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT=process.cwd();
const sourceRoot=path.join(ROOT,'src');
const files=[];
function walk(dir){if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name))files.push(p)}}
walk(sourceRoot);
const rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
const text=p=>fs.readFileSync(p,'utf8');
const violations=[];
const report=(rule,file,detail)=>violations.push({rule,file:rel(file),detail});
const repoFile=relative=>path.join(ROOT,relative);

const architecturePath=repoFile('docs/architecture/IA_CANONICAL_SURFACES_2026-08-12.md');
const agentEntrypoint=repoFile('AGENTS.md');
const misplacedAgentInstructions=repoFile('.github/workflows/copilot_instructions.md');

if(!fs.existsSync(architecturePath)) report('P00_CANONICAL_ARCHITECTURE_REQUIRED',architecturePath,'canonical information architecture is missing');
else {
  const architecture=text(architecturePath);
  const requiredClauses=[
    'Mandatory development preflight',
    'Reuse-before-build invariant',
    'Visual lenses are not surfaces',
    'Agentic operating model',
    'Agent development entrypoint',
    'One institutional object has one authoritative mutation path',
    'New files must belong to an existing declared owner',
  ];
  for(const clause of requiredClauses) if(!architecture.includes(clause)) report('P00_DEVELOPMENT_PREFLIGHT_CANON',architecturePath,`missing canonical clause: ${clause}`);
}
if(!fs.existsSync(agentEntrypoint)) report('P00_AGENT_ENTRYPOINT_REQUIRED',agentEntrypoint,'AGENTS.md must point every coding agent to the canonical preflight');
else {
  const agentText=text(agentEntrypoint);
  for(const marker of ['IA_CANONICAL_SURFACES_2026-08-12.md','Existing capability inspected:','Absorb vs create decision:','Authoritative writer:','Redundancy removed:']) {
    if(!agentText.includes(marker)) report('P00_AGENT_ENTRYPOINT_INCOMPLETE',agentEntrypoint,`missing preflight marker: ${marker}`);
  }
}
if(fs.existsSync(misplacedAgentInstructions)) report('P00_SINGLE_AGENT_POLICY_ENTRYPOINT',misplacedAgentInstructions,'duplicate/misplaced agent policy must be absorbed into AGENTS.md');

const trackedFiles=execFileSync('git',['ls-files','-z'],{cwd:ROOT,encoding:'utf8'})
  .split('\0')
  .filter(Boolean)
  .map(file=>file.replaceAll('\\','/'));

for(const trackedFile of trackedFiles){
  const absolute=path.join(ROOT,trackedFile);
  const segments=trackedFile.split('/');
  const name=segments.at(-1) ?? trackedFile;
  if(segments.some(segment=>segment.toLowerCase()==='quarantine')) report('P16_NO_TRACKED_QUARANTINE',absolute,'tracked path contains quarantine segment');
  if(/\.legacy(?:\.|$)/i.test(name)) report('P16_NO_TRACKED_LEGACY_FOSSILS',absolute,'tracked filename contains .legacy fossil marker');
  if(trackedFile.startsWith('src/lib/supabase/migrations/')) report('P16_NO_SHADOW_SUPABASE_MIGRATIONS',absolute,'canonical migration owner is supabase/migrations; src/lib/supabase/migrations is a forbidden shadow chain');
  if(/(?:\s+copy(?:\s*(?:\(\d+\)|\d+))?|\s*\(copy(?:\s*\d+)?\))(?=\.[^./]+$)/i.test(name)) report('P16_NO_ACCIDENTAL_COPY_FILES',absolute,'tracked filename looks like an accidental copy');
}

const forbiddenActiveNames=/(^|\/)(legacy|quarantine)(\/|[^/]*\.(ts|tsx|js|jsx)$)|(^|\/).*bridge[^/]*\.(ts|tsx|js|jsx)$/i;
const obsoleteRouteStrings=[
  '/root/predictions/new','/root/prospect-radar','/root/development','/root/continuity','/root/contracts','/root/total-proof',
  '/root/cognitive-twin/system','/root/cognitive-twin/lineage','/root/cognitive-twin/journal','/root/agents/passports','/root/overview','/root/operate','/root/pipeline','/operator/field'
];
const visualLensNames=['systems','archive','falsification','optionality','governance','authority','agents','identity','models','genai'];
function navigableRouteLiterals(source){
  const values=[];
  const patterns=[
    /(?:href|source|destination|redirect|router\.(?:push|replace)|requireRootObserverPage|requireRootViewer|requireRootActor|requireRootContributor)\s*(?:=|\()?\s*['"`]([^'"`]+)['"`]/g,
    /(?:fetch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
  ];
  for(const pattern of patterns){let m;while((m=pattern.exec(source)))values.push(m[1]);}
  return values;
}

for(const file of files){
  const r=rel(file);const s=text(file);
  if(forbiddenActiveNames.test(r)) report('P16_NO_ACTIVE_LEGACY_BRIDGE_QUARANTINE',file,'active source path contains legacy/bridge/quarantine');
  if(/(^|\/)tmp_[^/]+/i.test(r)||/(^|\/)app_[^/]+/i.test(r)) report('P16_NO_TMP_APP_SHADOWS',file,'active source path contains tmp_/app_ shadow');
  const routes=navigableRouteLiterals(s);
  for(const route of obsoleteRouteStrings) if(routes.some(value=>value===route||value.startsWith(`${route}/`)||value.startsWith(`${route}#`))) report('P16_NO_ABSORBED_ROUTE_REFERENCES',file,route);

  const interfaceFile=/^src\/(app\/(?!api\/).*\/page\.(ts|tsx)$|components\/)/.test(r)||r==='src/app/page.tsx';
  if(interfaceFile){
    if(/createServiceSupabaseClient|createClient\s*\([^)]*SUPABASE/i.test(s)) report('P12_INTERFACE_NO_SUPABASE',file,'interface imports/constructs Supabase client');
    if(/\.from\s*\(\s*['"][A-Za-z_][A-Za-z0-9_]*['"]\s*\)/.test(s)) report('P12_INTERFACE_NO_RAW_TABLE_ACCESS',file,'interface contains literal table .from() access');
  }
  if(/^src\/agents\//.test(r)){
    if(/supabase|createServiceSupabaseClient|\.from\s*\(\s*['"][A-Za-z_][A-Za-z0-9_]*['"]\s*\)/i.test(s)) report('P07_AGENTS_NO_SUPABASE',file,'agent references Supabase/raw table access');
  }
  if(/^src\/lib\/cognitive-twin\//.test(r)) report('CORE_COGNITIVE_TWIN_SINGLE_OWNER',file,'Cognitive Twin implementation remains under src/lib; canonical owner is src/core/cognitive-twin');
  if(/\.from\(\s*['"](?:sfi_amv_memory|sfi_cognitive_twin_memory)['"]\s*\)\s*\.(?:insert|upsert|update|delete)/s.test(s)){
    const allowed=r==='src/core/memory/InstitutionalMemoryWriter.ts';
    if(!allowed) report('P04_SINGLE_MEMORY_WRITE_PATH',file,'direct institutional/Twin memory mutation outside canonical writer');
  }
}

for(const lens of visualLensNames){
  for(const ext of ['ts','tsx','js','jsx']){
    const explicitPage=repoFile(`src/app/${lens}/page.${ext}`);
    if(fs.existsSync(explicitPage)) report('P17_LENS_NOT_BOUNDED_CONTEXT',explicitPage,`${lens} is a dynamic visual lens; do not create an independent application page owner`);
  }
  const apiNamespace=repoFile(`src/app/api/${lens}`);
  if(fs.existsSync(apiNamespace)) report('P17_LENS_NOT_BOUNDED_CONTEXT',apiNamespace,`${lens} is a lens and cannot own an API namespace; project data from its canonical owner instead`);
}

function eventPayload(){
  const eventPath=process.env.GITHUB_EVENT_PATH;
  if(!eventPath||!fs.existsSync(eventPath))return null;
  try{return JSON.parse(fs.readFileSync(eventPath,'utf8'))}catch{return null}
}
function changedBase(event){
  const candidate=event?.pull_request?.base?.sha ?? event?.before ?? null;
  return typeof candidate==='string'&&/^[0-9a-f]{40}$/i.test(candidate)&&!/^0+$/.test(candidate)?candidate:null;
}
function git(args){return execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim()}
function changedFilesSince(base){
  if(!base)return [];
  try{return git(['diff','--name-status',`${base}...HEAD`]).split('\n').filter(Boolean).map(line=>{const [status,...parts]=line.split('\t');return {status,path:parts.at(-1)?.replaceAll('\\','/')??''}})}catch{return []}
}
function diffSince(base){
  if(!base)return '';
  try{return git(['diff','--unified=0',`${base}...HEAD`,'--','src'])}catch{return ''}
}

const event=eventPayload();
const base=changedBase(event);
const changed=changedFilesSince(base);
const added=changed.filter(item=>item.status.startsWith('A')).map(item=>item.path);
const structuralAdded=added.filter(file=>/^src\/(?:app\/api\/|app\/.+\/page\.(?:ts|tsx|js|jsx)$|components\/|core\/|lib\/|agents\/)/.test(file));

for(const file of added){
  const lensPage=file.match(/^src\/app\/([^/]+)\/page\.(?:ts|tsx|js|jsx)$/)?.[1];
  if(lensPage&&visualLensNames.includes(lensPage)) report('P17_LENS_NOT_BOUNDED_CONTEXT',repoFile(file),`${lensPage} must remain in the shared dynamic scene/lens implementation`);
  const lensApi=file.match(/^src\/app\/api\/([^/]+)\//)?.[1];
  if(lensApi&&visualLensNames.includes(lensApi)) report('P17_LENS_NOT_BOUNDED_CONTEXT',repoFile(file),`${lensApi} cannot become an API owner`);
}

if(structuralAdded.length&&event?.pull_request){
  const body=String(event.pull_request.body??'');
  const requiredPreflightFields=[
    'SFI PRECHECK',
    'Owner:',
    'Existing capability inspected:',
    'Absorb vs create decision:',
    'Authoritative writer:',
    'Persistence/lineage impact:',
    'Front delta:',
    'Back delta:',
    'DB delta:',
    'Redundancy removed:',
    'Execution/ROOT boundary:',
    'Rollback:',
    'Verification:',
  ];
  for(const marker of requiredPreflightFields){
    if(!body.includes(marker)) report('P17_PR_PREFLIGHT_REQUIRED',architecturePath,`PR adds structural files but body is missing: ${marker}`);
  }
}

const diff=diffSince(base);
if(diff){
  const addedLines=diff.split('\n').filter(line=>line.startsWith('+')&&!line.startsWith('+++')).map(line=>line.slice(1)).join('\n');
  if(/\.from\(\s*['"]action_proposals['"]\s*\)[\s\S]{0,250}\.(?:insert|upsert|update|delete)\s*\(/i.test(addedLines)){
    report('P17_NO_NEW_PARALLEL_PROPOSAL_WRITER',architecturePath,'new direct action_proposals mutation detected; extend the canonical proposal writer/lifecycle instead of adding another writer');
  }
}

const sourceCandidates=trackedFiles.filter(file=>/^src\/.+\.(?:ts|tsx|js|jsx)$/.test(file)&&fs.existsSync(repoFile(file)));
const normalizedHashes=new Map();
for(const file of sourceCandidates){
  const normalized=text(repoFile(file)).replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'').replace(/\s+/g,' ').trim();
  if(normalized.length<160)continue;
  const hash=crypto.createHash('sha256').update(normalized).digest('hex');
  const list=normalizedHashes.get(hash)??[];list.push(file);normalizedHashes.set(hash,list);
}
for(const file of added.filter(file=>/^src\/.+\.(?:ts|tsx|js|jsx)$/.test(file))){
  for(const matches of normalizedHashes.values()){
    if(matches.includes(file)&&matches.length>1) report('P17_NO_DUPLICATE_SOURCE_FILE',repoFile(file),`new source is structurally identical to: ${matches.filter(x=>x!==file).join(', ')}`);
  }
}

const nextConfig=path.join(ROOT,'next.config.js');
if(fs.existsSync(nextConfig)){
  const s=text(nextConfig);
  if(/async\s+redirects\s*\(\)/.test(s)&&obsoleteRouteStrings.some(route=>s.includes(route))) report('P16_NO_COMPATIBILITY_REDIRECTS',nextConfig,'absorbed routes still kept as runtime redirects');
  if(/source:\s*['"]\/['"]\s*,\s*destination:\s*['"]\/['"]/.test(s)) report('P16_NO_NOOP_REWRITE',nextConfig,'no-op / → / rewrite');
}

const summary={checkedFiles:files.length,trackedFiles:trackedFiles.length,changedFiles:changed.length,addedStructuralFiles:structuralAdded.length,violations:violations.length,byRule:Object.fromEntries([...new Set(violations.map(v=>v.rule))].sort().map(rule=>[rule,violations.filter(v=>v.rule===rule).length]))};
fs.mkdirSync(path.join(ROOT,'artifacts','canonical-architecture'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'artifacts','canonical-architecture','violations.json'),JSON.stringify({summary,violations},null,2));
console.log(JSON.stringify(summary,null,2));
for(const v of violations) console.log(`${v.rule}\t${v.file}\t${v.detail}`);
if(violations.length) process.exit(1);
