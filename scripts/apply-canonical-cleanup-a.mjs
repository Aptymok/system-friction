import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, c) => { fs.mkdirSync(path.dirname(path.join(ROOT,p)), {recursive:true}); fs.writeFileSync(path.join(ROOT, p), c); };
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const gitRm = (p) => { if (exists(p)) execFileSync('git', ['rm', '-r', '--', p], { stdio: 'inherit' }); };

// A1. Preserve the pure longitudinal evaluator in Core; remove the old agent runtime that mixed UI, DB and memory.
write('src/core/analysis/longitudinalEngine.ts', `import type { Audit, Metrics, MemoryFact, OperationalAction } from '@/lib/types'\n\nexport type LongitudinalAction = OperationalAction\nexport type LongitudinalMemoryFact = MemoryFact\n\nexport interface LongitudinalEngineInput {\n  currentNarrative: string\n  currentMetrics: Metrics\n  audits: Audit[]\n  actions: LongitudinalAction[]\n  memoryFacts: MemoryFact[]\n}\n\nexport interface LongitudinalEngineResult {\n  nextQuestion: string\n  pattern: string\n  severity: number\n  risk: 'low' | 'medium' | 'high' | 'hard_stop'\n  minimumAction: string\n  verificationCriterion: string\n}\n\nexport const LongitudinalEngine = {\n  evaluate({ currentNarrative, currentMetrics, audits, actions, memoryFacts }: LongitudinalEngineInput): LongitudinalEngineResult {\n    const lastPattern = audits?.[0]?.pattern || memoryFacts?.[0]?.fact_type || 'estado neutro'\n    const severity = Math.min(1, Math.max(0, currentMetrics.divergence + (audits?.[0]?.loop_score ?? 0) * 0.15))\n    const risk = severity >= 0.8 ? 'hard_stop' : severity >= 0.55 ? 'high' : severity >= 0.3 ? 'medium' : 'low'\n    let nextQuestion = '¿Qué acción mínima concreta puedes ejecutar en los próximos 30 minutos?'\n    if (currentNarrative.includes('no puedo') || String(lastPattern).includes('contradiccion')) {\n      nextQuestion = '¿Qué evidencia externa valida la decisión más importante de este ciclo?'\n    }\n    return {\n      nextQuestion,\n      pattern: String(lastPattern),\n      severity,\n      risk,\n      minimumAction: actions?.[0]?.description || 'Definir un criterio observable para el siguiente ciclo.',\n      verificationCriterion: actions?.[0]?.verification_criterion || 'Debe existir un resultado observable antes de la próxima iteración.',\n    }\n  },\n}\n`);

for (const p of ['src/agents/amv.ts','src/lib/amv/scopes/root/rootContextBuilder.ts']) {
  let s=read(p);
  s=s.replace("from './longitudinal'", "from '@/core/analysis/longitudinalEngine'");
  s=s.replace("from '@/agents/longitudinal'", "from '@/core/analysis/longitudinalEngine'");
  write(p,s);
}
{
  const p='src/lib/amv/scopes/root/rootContextBuilder.ts';
  let s=read(p);
  s=s.replace("import { evaluatePatterns } from '@/agents/patternengine'\n",'');
  s=s.replace("  { id: 'longitudinal', label: 'Longitudinal Engine', source: 'src/agents/longitudinal.ts', status: 'adapter', trust: 'derived' },", "  { id: 'longitudinal', label: 'Longitudinal Engine', source: 'src/core/analysis/longitudinalEngine.ts', status: 'available', trust: 'derived' },");
  s=s.replace("  { id: 'patternengine', label: 'Pattern Engine', source: 'src/agents/patternengine.ts', status: 'deferred', trust: 'degraded' },\n",'');
  s=s.replace("          evaluatePatterns: typeof evaluatePatterns,\n", "          patterns: 'MISSING_NO_CANONICAL_PATTERN_SOURCE',\n");
  write(p,s);
}

for (const p of [
  'src/agents/GlobalLearningAgent.ts',
  'src/agents/longitudinal.ts',
  'src/agents/patternengine.ts',
  'src/app/api/admin/EWR/route.ts',
  'src/app/api/admin/EWR/reset/route.ts',
  'src/observatory/components/root/EWRControl.tsx',
]) gitRm(p);

// A2. Retire ERW as a hidden authority modifier. Missing calibration stays missing.
{
  const p='src/runtime/layers/Gate.ts';
  let s=read(p);
  s=s.replace("import { GlobalLearningAgent } from '@/agents/GlobalLearningAgent';\n",'');
  s=s.replace('  erwUsed: number;','  calibrationSignal: number | null;');
  s=s.replace(/  \/\/ Obtener el último ERW[\s\S]*?dynamicThreshold = Math\.min\(MAX_THRESHOLD, Math\.max\(MIN_THRESHOLD, dynamicThreshold\)\);/,`  // No calibrated external-reality signal is currently canonical. Missing stays missing.\n  const calibrationSignal: number | null = null;\n  const dynamicThreshold = Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, BASE_THRESHOLD));`);
  s=s.replace(/ \(ERW=\$\{erw\.toFixed\(3\)\}\)/g,' (sin señal de calibración canónica)');
  s=s.replace(/erwUsed: erw/g,'calibrationSignal');
  s=s.replace(/umbral dinámico/g,'umbral gobernado');
  write(p,s);
}

// A3. Collapse the duplicate private /interface namespace into canonical FIELD. Only route literals change.
gitRm('src/app/interface/page.tsx');
gitRm('src/app/interface/observatory/page.tsx');
const sourceFiles=[];
function walk(dir){ if(!exists(dir)) return; for(const e of fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true})){const rel=path.join(dir,e.name).replaceAll('\\\\','/'); if(e.isDirectory()) walk(rel); else if(/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name)) sourceFiles.push(rel);} }
walk('src');
for(const p of sourceFiles){let s=read(p),before=s; s=s.replace(/(['"`])\/interface\/observatory\1/g,"$1/field$1"); s=s.replace(/(['"`])\/interface\1/g,"$1/field$1"); if(s!==before) write(p,s);}

// A4. Browser auth may use auth state, never raw profile table access.
{
  const p='src/components/auth/AuthProvider.tsx'; let s=read(p);
  const pattern=/\n      const \{ data, error \} = await client\n        \.from\('profiles'\)[\s\S]*?\n      return \{\n        userId: session\.user\.id,\n        email: data\?\.email \|\| session\.user\.email \|\| null,\n        alias: data\?\.alias \|\| fallbackAlias\(session\),\n        role: data\?\.role \|\| fallbackRole\(error\?\.code\),\n      \}\n/;
  if(!pattern.test(s)) throw new Error('AuthProvider profile fallback block not found');
  s=s.replace(pattern,`\n      return {\n        userId: session.user.id,\n        email: session.user.email || null,\n        alias: fallbackAlias(session),\n        role: fallbackRole(),\n      }\n`); write(p,s);
}

// A5. Member page gets a server-side read model from the access boundary.
{
  const p='src/lib/system/access/server.ts'; let s=read(p); const marker="export async function requireSfiMemberPage(nextPath = '/member') {";
  if(!s.includes('readMemberWorkspaceCounts')){
    const helper=`async function readMemberWorkspaceCounts(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string) {\n  const [cases, objects, returns] = await Promise.all([\n    supabase.from('field_cases').select('id', { count: 'exact', head: true }).eq('owner_id', userId).is('deleted_at', null),\n    supabase.from('studio_objects').select('id', { count: 'exact', head: true }).eq('owner_id', userId),\n    supabase.from('field_returns').select('id', { count: 'exact', head: true }).eq('owner_id', userId).is('returned_at', null),\n  ]);\n  return { caseCount: cases.count ?? 0, objectCount: objects.count ?? 0, pendingReturnCount: returns.count ?? 0, warnings: [cases.error?.message, objects.error?.message, returns.error?.message].filter((v): v is string => Boolean(v)) };\n}\n\n`;
    s=s.replace(marker,helper+marker);
  }
  s=s.replace('    return await requireSfiMember();','    const context = await requireSfiMember();\n    const workspace = await readMemberWorkspaceCounts(context.supabase, context.user.id);\n    return { ...context, workspace };'); write(p,s);
}
{
  const p='src/app/member/page.tsx'; let s=read(p);
  s=s.replace("  const { user, profile, member, supabase } = await requireSfiMemberPage('/member');\n\n  const [cases, objects, returns] = await Promise.all([\n    supabase.from('field_cases').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).is('deleted_at', null),\n    supabase.from('studio_objects').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),\n    supabase.from('field_returns').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).is('returned_at', null),\n  ]);", "  const { user, profile, member, workspace } = await requireSfiMemberPage('/member');");
  s=s.replace('{cases.count ?? 0}','{workspace.caseCount}').replace('{objects.count ?? 0}','{workspace.objectCount}').replace('{returns.count ?? 0}','{workspace.pendingReturnCount}'); write(p,s);
}

// A6. Institutional attractor service owns the experiment read.
{
  const p='src/lib/institution/institutionalAttractor.ts'; let s=read(p);
  s=s.replace("  const [attractor, latest, phenomena] = await Promise.all([","  const [attractor, latest, phenomena, experiment] = await Promise.all([");
  s=s.replace("    db.from('sfi_phenomenon_trajectory_snapshots').select('*').eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY).order('observed_at', { ascending: false }).limit(40),\n  ]);","    db.from('sfi_phenomenon_trajectory_snapshots').select('*').eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY).order('observed_at', { ascending: false }).limit(40),\n    db.from('sfi_institutional_experiments').select('*').eq('experiment_key', 'SFI-INSTITUTIONAL-30D-001').maybeSingle(),\n  ]);");
  s=s.replace("    phenomenonTrajectory: phenomena.data ?? [],\n    warnings: [attractor.error?.message, latest.error?.message, phenomena.error?.message]","    phenomenonTrajectory: phenomena.data ?? [],\n    experiment: experiment.data ?? null,\n    warnings: [attractor.error?.message, latest.error?.message, phenomena.error?.message, experiment.error?.message]"); write(p,s);
}
{
  const p='src/app/root/attractor/page.tsx'; let s=read(p);
  s=s.replace("  const [state, experiment] = await Promise.all([\n    readInstitutionalAttractor(),\n    ctx.service.from('sfi_institutional_experiments').select('*').eq('experiment_key', 'SFI-INSTITUTIONAL-30D-001').maybeSingle(),\n  ]);","  const fullState = await readInstitutionalAttractor();\n  const { experiment, ...state } = fullState;");
  s=s.replace("      state={{ ...state, warnings: [...state.warnings, ...(experiment.error ? [experiment.error.message] : [])] }}\n      experiment={experiment.data ?? null}","      state={state}\n      experiment={experiment}"); write(p,s);
}

// A7. Repair imports damaged by the previous compatibility-route absorption. These are canonical owners, not redirects.
const repairs={
  'src/app/pipeline/page.tsx': [
    ["@/components/pipeline/RootOperatingField","@/components/root/operate/RootOperatingField"],
    ["@/components/pipeline/RootCycleAnalysisDockAuto","@/components/root/operate/RootCycleAnalysisDockAuto"],
  ],
  'src/app/root/commercial/page.tsx': [["@/components/root/commercial#prospect-radar/RootProspectRadar","@/components/root/prospect-radar/RootProspectRadar"]],
  'src/app/root/readiness/page.tsx': [
    ["@/components/root/readiness/RootDevelopmentResolvedView","@/components/root/development/RootDevelopmentResolvedView"],
    ["@/components/root/readiness/ContinuityConsole","@/components/root/continuity/ContinuityConsole"],
    ["@/components/root/readiness/InstitutionalContractsConsole","@/components/root/contracts/InstitutionalContractsConsole"],
  ],
};
for(const [p,pairs] of Object.entries(repairs)){let s=read(p); for(const [a,b] of pairs)s=s.replaceAll(a,b); write(p,s);}

// A8. QA follows the single CT owner.
function walkScripts(dir){if(!exists(dir))return;for(const e of fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true})){const rel=path.join(dir,e.name).replaceAll('\\\\','/');if(e.isDirectory())walkScripts(rel);else if(/\.(ts|tsx|js|mjs)$/.test(e.name)){let s=read(rel),b=s;s=s.replaceAll('../src/lib/cognitive-twin/','../src/core/cognitive-twin/').replaceAll("@/lib/cognitive-twin/","@/core/cognitive-twin/");if(s!==b)write(rel,s);}}}
walkScripts('scripts');

// A9. Preserve the useful Observatory hero as canonical UI, not quarantine.
if(!exists('src/components/observatory/SfiObservatoryHero.tsx')){
  const restored=execFileSync('git',['show','2d4af33d38c398eb1e037dab1dc6f594aa283673:src/components/observatory/quarantine/SfiObservatoryHero.tsx'],{encoding:'utf8'});
  write('src/components/observatory/SfiObservatoryHero.tsx',restored);
}
{
  const p='src/components/sfi/SfiObservatoryTopographicHero.tsx'; let s=read(p); s=s.replace("@/components/observatory/quarantine/SfiObservatoryHero","@/components/observatory/SfiObservatoryHero"); write(p,s);
}

console.log('Canonical cleanup batch A applied.');