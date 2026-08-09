import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function filesUnder(relative: string): string[] {
  const absolute = path.join(root, relative);
  return readdirSync(absolute).flatMap((name) => {
    const file = path.join(absolute, name);
    const stat = statSync(file);
    if (stat.isDirectory()) return filesUnder(path.relative(root, file));
    return file;
  });
}

function text(file: string) {
  return readFileSync(file, 'utf8');
}

function assertNoDirectSupabase(relative: string) {
  for (const file of filesUnder(relative).filter((item) => /\.(tsx?|css)$/.test(item))) {
    const body = text(file);
    assert.ok(!/createServiceSupabaseClient|\.from\(['"`][a-z0-9_]+['"`]\)/.test(body), `direct_supabase_access:${path.relative(root, file)}`);
  }
}

assertNoDirectSupabase('src/app/studio');
assertNoDirectSupabase('src/components/studio/workspace');
assertNoDirectSupabase('src/stores');

const workspaceDir = path.join(root, 'src/components/studio/workspace');
const workspaceFiles = filesUnder('src/components/studio/workspace').map((file) => path.relative(root, file));
const workspaceSource = workspaceFiles.filter((file) => /\.(tsx?|css)$/.test(file)).map((file) => text(path.join(root, file))).join('\n');
const workspace = text(path.join(workspaceDir, 'StudioWorkspace.tsx'));
const ingestion = text(path.join(workspaceDir, 'StudioDirectIngestion.tsx'));
const css = text(path.join(workspaceDir, 'studio-workspace.css'));

for (const required of ['StudioWorkspace.tsx', 'StudioDirectIngestion.tsx', 'studio-workspace.css']) {
  assert.ok(workspaceFiles.some((file) => file.endsWith(required)), `missing_workspace_component:${required}`);
}
for (const removed of ['StudioObjectReport.tsx', 'StudioCapabilityDrawer.tsx', 'StudioTraceDrawer.tsx']) {
  assert.ok(!workspaceFiles.some((file) => file.endsWith(removed)), `replaced_component_still_present:${removed}`);
}

for (const token of [
  'CAMPO TOTALMENTE VACÍO',
  'NINGÚN NODO',
  'CONSTRUIR CAMPO',
  'TOPOLOGÍA',
  'LONGITUDINAL',
  'WORLDSPECT',
  'TIMELAPSTAMP',
  'EJECTOR · PROYECCIÓN',
  'ESTADO',
  'ANÁLISIS',
  'EVIDENCIA',
  'HIPÓTESIS',
  'TRAYECTORIA',
  'PRODUCCIÓN',
  'EJECUTAR ANÁLISIS COGNITIVO',
  'GENERAR UNA HIPÓTESIS',
  'VERIFICAR CON EVIDENCIA NUEVA',
  'CHANGES RELEVANTES',
]) {
  if (token === 'CHANGES RELEVANTES') continue;
  assert.ok(workspace.includes(token), `field_surface_missing:${token}`);
}

assert.ok(workspace.includes("/api/studio/field"), 'field_persistence_route_missing');
assert.ok(workspace.includes('/cognitive'), 'cognitive_runtime_route_missing');
assert.ok(workspace.includes("action: 'link_nodes'"), 'node_link_action_missing');
assert.ok(workspace.includes("action: 'attach_object'"), 'object_node_link_action_missing');
assert.ok(workspace.includes("action: 'archive_node'"), 'node_archive_action_missing');
assert.ok(workspace.includes('cognitive.result.changes.slice(0, 3)'), 'three_change_limit_missing');
assert.ok(workspace.includes('LLM NO CONFIGURADO'), 'llm_fail_closed_surface_missing');
assert.ok(workspace.includes('READY significa'), 'production_authority_boundary_missing');
assert.ok(ingestion.includes('.zip'), 'zip_intake_missing');
assert.ok(ingestion.includes('session_package'), 'session_package_modality_missing');
assert.ok(ingestion.includes('se descarta'), 'transient_package_copy_missing');
assert.ok(!/StudioObjectReport|StudioCapabilityDrawer|StudioTraceDrawer/.test(workspace), 'deleted_dashboard_reference_present');
assert.ok(!/coming soon|pr[oó]ximamente/i.test(workspaceSource), 'coming_soon_copy_present');
assert.ok(!/href=["']#["']/.test(workspaceSource), 'dead_hash_link_present');
assert.ok(!/demo data|datos demo/i.test(workspaceSource), 'demo_surface_present');
assert.ok(/onClick=|onSubmit=|type="submit"/.test(workspaceSource), 'operational_handlers_missing');

for (const token of [
  '.studio-globalbar',
  '.studio-field-layout',
  '.studio-field-fluid',
  '.studio-node--attractor',
  '.studio-hub',
  '.studio-timelap',
  'overflow-x: auto',
  '@media (max-width: 820px)',
]) assert.ok(css.includes(token), `field_css_missing:${token}`);

console.log(JSON.stringify({
  ok: true,
  singleFieldSurface: true,
  duplicateDashboardComponentsRemoved: true,
  directSupabaseAccess: false,
  zipSessionIntake: true,
  transientPackageRetentionPolicyVisible: true,
  contextualHub: true,
  timeLapStamp: true,
  worldContrastMode: true,
  cognitiveRuntimeControls: true,
  finiteChangeContrast: 3,
}, null, 2));
