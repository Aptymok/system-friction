import fs from 'node:fs/promises';
import path from 'node:path';

async function exists(target: string) {
  try {
    await fs.access(path.join(/*turbopackIgnore: true*/ process.cwd(), target));
    return true;
  } catch {
    return false;
  }
}

async function fileIncludes(target: string, pattern: string) {
  try {
    const raw = await fs.readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), target), 'utf8');
    return raw.includes(pattern);
  } catch {
    return false;
  }
}

export async function runRootSelfObservability() {
  const checks = await Promise.all([
    exists('src/app/scorefriction-legacy/page.tsx'),
    exists('public/scorefriction-legacy.html'),
    fileIncludes('src/app/scorefriction/page.tsx', '<iframe'),
    fileIncludes('src/app/scorefriction/page.tsx', 'scorefriction-legacy.html'),
    exists('src/app/api/scorefriction/operational-cycle/route.ts'),
    exists('src/app/api/scorefriction/regime-watch/route.ts'),
    exists('src/app/api/root/neural-graph/live/route.ts'),
    exists('src/app/world-vector/page.tsx'),
  ]);
  const [
    scoreOperationalRoute,
    staticOperationalHtml,
    scoreUsesIframe,
    scoreUsesHtml,
    operationalCycle,
    regimeWatch,
    neuralGraph,
    worldVector,
  ] = checks;

  const broken_routes = [
    !operationalCycle ? '/api/scorefriction/operational-cycle' : null,
    !regimeWatch ? '/api/scorefriction/regime-watch' : null,
    !neuralGraph ? '/api/root/neural-graph/live' : null,
    !worldVector ? '/world-vector' : null,
  ].filter(Boolean);
  const dead_dashboards = [
    scoreOperationalRoute ? 'legacy ScoreFriction operational route' : null,
  ].filter(Boolean);
  const disconnected_modules = [
    scoreUsesIframe ? '/scorefriction iframe' : null,
    scoreUsesHtml ? 'legacy ScoreFriction static HTML dependency' : null,
  ].filter(Boolean);
  const mock_surfaces = [
    staticOperationalHtml ? 'static operational HTML present' : null,
  ].filter(Boolean);
  const missing_parts = [...broken_routes, ...dead_dashboards, ...disconnected_modules, ...mock_surfaces];
  const system_health = missing_parts.length === 0 ? 'online' : missing_parts.length > 4 ? 'critical' : 'degraded';

  return {
    ok: missing_parts.length === 0,
    system_health,
    missing_parts,
    broken_routes,
    dead_dashboards,
    mock_surfaces,
    disconnected_modules,
    fallback_events: [],
    reconstruction_proposals: missing_parts.map((part) => ({
      part,
      proposal: `Reconstruir o clausurar ${part} y correr QA de ciclo cerrado.`,
      risk: 'medium',
    })),
    qa_required: ['npm run typecheck', 'manual /scorefriction /world-vector /root smoke'],
    last_self_check_at: new Date().toISOString(),
  };
}

