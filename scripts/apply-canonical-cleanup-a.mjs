import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, c) => fs.writeFileSync(path.join(ROOT, p), c);
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const gitRm = (p) => { if (exists(p)) execFileSync('git', ['rm', '-r', '--', p], { stdio: 'inherit' }); };

// 1. Remove obsolete learning generation and dead agents. Do not preserve invalid ERW semantics.
for (const p of [
  'src/agents/GlobalLearningAgent.ts',
  'src/agents/longitudinal.ts',
  'src/agents/patternengine.ts',
  'src/app/api/admin/EWR/route.ts',
  'src/app/api/admin/EWR/reset/route.ts',
  'src/observatory/components/root/EWRControl.tsx',
]) gitRm(p);

{
  const p = 'src/runtime/layers/Gate.ts';
  let s = read(p);
  s = s.replace("import { GlobalLearningAgent } from '@/agents/GlobalLearningAgent';\n", '');
  s = s.replace('  erwUsed: number;','  calibrationSignal: number | null;');
  s = s.replace(/  \/\/ Obtener el último ERW[\s\S]*?dynamicThreshold = Math\.min\(MAX_THRESHOLD, Math\.max\(MIN_THRESHOLD, dynamicThreshold\)\);/,
`  // No calibrated external-reality signal is currently canonical. Missing stays missing.\n  const calibrationSignal: number | null = null;\n  const dynamicThreshold = Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, BASE_THRESHOLD));`);
  s = s.replace(/ \(ERW=\$\{erw\.toFixed\(3\)\}\)/g, ' (sin señal de calibración canónica)');
  s = s.replace(/erwUsed: erw/g, 'calibrationSignal');
  s = s.replace(/umbral dinámico/g, 'umbral gobernado');
  write(p, s);
}

// 2. Collapse duplicate private FIELD namespace. Git history remains the archive.
gitRm('src/app/interface/page.tsx');
gitRm('src/app/interface/observatory/page.tsx');
const sourceFiles = [];
function walk(dir) {
  if (!exists(dir)) return;
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name).replaceAll('\\\\','/');
    if (e.isDirectory()) walk(rel);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name)) sourceFiles.push(rel);
  }
}
walk('src');
for (const p of sourceFiles) {
  let s = read(p);
  const before = s;
  s = s.replaceAll('/interface/observatory', '/field');
  s = s.replaceAll('/interface', '/field');
  if (s !== before) write(p, s);
}

// 3. Browser auth may use auth session, but never falls back to querying profiles directly.
{
  const p = 'src/components/auth/AuthProvider.tsx';
  let s = read(p);
  const pattern = /\n      const \{ data, error \} = await client\n        \.from\('profiles'\)[\s\S]*?\n      return \{\n        userId: session\.user\.id,\n        email: data\?\.email \|\| session\.user\.email \|\| null,\n        alias: data\?\.alias \|\| fallbackAlias\(session\),\n        role: data\?\.role \|\| fallbackRole\(error\?\.code\),\n      \}\n/;
  if (!pattern.test(s)) throw new Error('AuthProvider profile fallback block not found');
  s = s.replace(pattern, `\n      return {\n        userId: session.user.id,\n        email: session.user.email || null,\n        alias: fallbackAlias(session),\n        role: fallbackRole(),\n      }\n`);
  write(p, s);
}

// 4. Member page consumes a server access read model, not raw tables.
{
  const p = 'src/lib/system/access/server.ts';
  let s = read(p);
  const marker = "export async function requireSfiMemberPage(nextPath = '/member') {";
  if (!s.includes(marker)) throw new Error('requireSfiMemberPage marker missing');
  const helper = `async function readMemberWorkspaceCounts(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string) {\n  const [cases, objects, returns] = await Promise.all([\n    supabase.from('field_cases').select('id', { count: 'exact', head: true }).eq('owner_id', userId).is('deleted_at', null),\n    supabase.from('studio_objects').select('id', { count: 'exact', head: true }).eq('owner_id', userId),\n    supabase.from('field_returns').select('id', { count: 'exact', head: true }).eq('owner_id', userId).is('returned_at', null),\n  ]);\n  return {\n    caseCount: cases.count ?? 0,\n    objectCount: objects.count ?? 0,\n    pendingReturnCount: returns.count ?? 0,\n    warnings: [cases.error?.message, objects.error?.message, returns.error?.message].filter((v): v is string => Boolean(v)),\n  };\n}\n\n`;
  s = s.replace(marker, helper + marker);
  s = s.replace("    return await requireSfiMember();", "    const context = await requireSfiMember();\n    const workspace = await readMemberWorkspaceCounts(context.supabase, context.user.id);\n    return { ...context, workspace };");
  write(p, s);
}
{
  const p = 'src/app/member/page.tsx';
  let s = read(p);
  s = s.replace("  const { user, profile, member, supabase } = await requireSfiMemberPage('/member');\n\n  const [cases, objects, returns] = await Promise.all([\n    supabase.from('field_cases').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).is('deleted_at', null),\n    supabase.from('studio_objects').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),\n    supabase.from('field_returns').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).is('returned_at', null),\n  ]);", "  const { user, profile, member, workspace } = await requireSfiMemberPage('/member');");
  s = s.replace('{cases.count ?? 0}', '{workspace.caseCount}');
  s = s.replace('{objects.count ?? 0}', '{workspace.objectCount}');
  s = s.replace('{returns.count ?? 0}', '{workspace.pendingReturnCount}');
  write(p, s);
}

// 5. Institutional attractor owns its experiment read; page no longer reaches through to storage.
{
  const p = 'src/lib/institution/institutionalAttractor.ts';
  let s = read(p);
  s = s.replace("  const [attractor, latest, phenomena] = await Promise.all([", "  const [attractor, latest, phenomena, experiment] = await Promise.all([");
  s = s.replace("    db.from('sfi_phenomenon_trajectory_snapshots').select('*').eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY).order('observed_at', { ascending: false }).limit(40),\n  ]);", "    db.from('sfi_phenomenon_trajectory_snapshots').select('*').eq('attractor_key', SFI_INSTITUTIONAL_ATTRACTOR_KEY).order('observed_at', { ascending: false }).limit(40),\n    db.from('sfi_institutional_experiments').select('*').eq('experiment_key', 'SFI-INSTITUTIONAL-30D-001').maybeSingle(),\n  ]);");
  s = s.replace("    phenomenonTrajectory: phenomena.data ?? [],\n    warnings: [attractor.error?.message, latest.error?.message, phenomena.error?.message]", "    phenomenonTrajectory: phenomena.data ?? [],\n    experiment: experiment.data ?? null,\n    warnings: [attractor.error?.message, latest.error?.message, phenomena.error?.message, experiment.error?.message]");
  write(p, s);
}
{
  const p = 'src/app/root/attractor/page.tsx';
  let s = read(p);
  s = s.replace("  const [state, experiment] = await Promise.all([\n    readInstitutionalAttractor(),\n    ctx.service.from('sfi_institutional_experiments').select('*').eq('experiment_key', 'SFI-INSTITUTIONAL-30D-001').maybeSingle(),\n  ]);", "  const fullState = await readInstitutionalAttractor();\n  const { experiment, ...state } = fullState;");
  s = s.replace("      state={{ ...state, warnings: [...state.warnings, ...(experiment.error ? [experiment.error.message] : [])] }}\n      experiment={experiment.data ?? null}", "      state={state}\n      experiment={experiment}");
  write(p, s);
}

console.log('Canonical cleanup batch A applied.');