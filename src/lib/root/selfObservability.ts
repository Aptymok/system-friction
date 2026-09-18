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

export async function runRootSelfObservability() {
  const requiredOwners = [
    ['public-surface-profile', 'src/lib/public/institutionProfile.ts'],
    ['surface-registry', 'config/sfi-surfaces.json'],
    ['observatory', 'src/app/observatory/page.tsx'],
    ['observatory-world-api', 'src/app/api/observatory/world/route.ts'],
    ['case-platform', 'src/app/api/cases/route.ts'],
    ['cognitive-runtime', 'src/lib/sfi/cognitive-runtime/registry.ts'],
    ['continuity-runtime', 'src/lib/continuity/runtime.ts'],
    ['institutional-evolution', 'src/lib/institution/institutionalEvolution.ts'],
    ['self-development-workflow', '.github/workflows/sfi-self-development.yml'],
    ['consolidation-audit', 'scripts/system-consolidation-audit.py'],
  ] as const;

  const observed = await Promise.all(
    requiredOwners.map(async ([id, file]) => ({ id, file, present: await exists(file) })),
  );

  const missing_parts = observed.filter((item) => !item.present).map((item) => item.file);
  const system_health = missing_parts.length === 0 ? 'online' : missing_parts.length > 2 ? 'critical' : 'degraded';

  return {
    ok: missing_parts.length === 0,
    system_health,
    missing_parts,
    broken_routes: [],
    dead_dashboards: [],
    mock_surfaces: [],
    disconnected_modules: [],
    fallback_events: [],
    observed_owners: observed,
    reconstruction_proposals: missing_parts.map((part) => ({
      part,
      proposal: `Restaurar o reconciliar el owner canonico faltante ${part} y ejecutar QA de ciclo cerrado.`,
      risk: 'medium',
    })),
    qa_required: ['npm run typecheck', 'npm run build', 'manual /observatory /root smoke'],
    last_self_check_at: new Date().toISOString(),
  };
}
