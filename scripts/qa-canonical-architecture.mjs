import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT=process.cwd();
const sourceRoot=path.join(ROOT,'src');
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name))files.push(p)}}
walk(sourceRoot);
const rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
const text=p=>fs.readFileSync(p,'utf8');
const violations=[];
const report=(rule,file,detail)=>violations.push({rule,file:rel(file),detail});

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
  // Only flag copy markers that are characteristic of accidental filesystem duplicates.
  // Hyphenated names such as foundation-copy.ts can be intentional domain language.
  if(/(?:\s+copy(?:\s*(?:\(\d+\)|\d+))?|\s*\(copy(?:\s*\d+)?\))(?=\.[^./]+$)/i.test(name)) report('P16_NO_ACCIDENTAL_COPY_FILES',absolute,'tracked filename looks like an accidental copy');
}

const forbiddenActiveNames=/(^|\/)(legacy|quarantine)(\/|[^/]*\.(ts|tsx|js|jsx)$)|(^|\/).*bridge[^/]*\.(ts|tsx|js|jsx)$/i;
const obsoleteRouteStrings=[
  '/root/predictions/new','/root/prospect-radar','/root/development','/root/continuity','/root/contracts','/root/total-proof',
  '/root/cognitive-twin/system','/root/cognitive-twin/lineage','/root/cognitive-twin/journal','/root/agents/passports','/root/overview','/root/operate','/root/pipeline','/operator/field'
];
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

const nextConfig=path.join(ROOT,'next.config.js');
if(fs.existsSync(nextConfig)){
  const s=text(nextConfig);
  if(/async\s+redirects\s*\(\)/.test(s)&&obsoleteRouteStrings.some(route=>s.includes(route))) report('P16_NO_COMPATIBILITY_REDIRECTS',nextConfig,'absorbed routes still kept as runtime redirects');
  if(/source:\s*['"]\/['"]\s*,\s*destination:\s*['"]\/['"]/.test(s)) report('P16_NO_NOOP_REWRITE',nextConfig,'no-op / → / rewrite');
}

const summary={checkedFiles:files.length,trackedFiles:trackedFiles.length,violations:violations.length,byRule:Object.fromEntries([...new Set(violations.map(v=>v.rule))].sort().map(rule=>[rule,violations.filter(v=>v.rule===rule).length]))};
fs.mkdirSync(path.join(ROOT,'artifacts','canonical-architecture'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'artifacts','canonical-architecture','violations.json'),JSON.stringify({summary,violations},null,2));
console.log(JSON.stringify(summary,null,2));
for(const v of violations) console.log(`${v.rule}\t${v.file}\t${v.detail}`);
if(violations.length) process.exit(1);
