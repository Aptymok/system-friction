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
function text(file: string) { return readFileSync(file, 'utf8'); }
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
const studioPage = text(path.join(root, 'src/app/studio/page.tsx'));

for (const required of ['StudioWorkspace.tsx', 'StudioDirectIngestion.tsx', 'studio-workspace.css']) {
  assert.ok(workspaceFiles.some((file) => file.endsWith(required)), `missing_workspace_component:${required}`);
}
for (const removed of ['StudioObjectReport.tsx', 'StudioCapabilityDrawer.tsx', 'StudioTraceDrawer.tsx']) {
  assert.ok(!workspaceFiles.some((file) => file.endsWith(removed)), `replaced_component_still_present:${removed}`);
}

for (const token of [
  'ATTRACTOR',
  'PROJECT',
  'NODE',
  'OBJECT',
  'MANIFESTATION',
  'SYSTEM',
  'EVIDENCE',
  'MIHM',
  'FRICTION',
  'TRAJECTORY',
  'LAB',
  'IDENTITY',
  'MOPS EVIDENCE',
  'PUBLIC CERTIFICATE',
  'NOT ISSUED',
  'COGNITIVE INSTRUMENT',
  'TIME / RETURN / CONTINUITY',
  'METHOD LAB',
]) assert.ok(workspace.includes(token), `native_studio_surface_missing:${token}`);

assert.ok(studioPage.includes('StudioWorkspace'), 'native_studio_entry_missing');
assert.equal(studioPage.includes('StudioSessionReconstruction'), false, 'legacy_session_reconstruction_must_not_own_entry');
assert.equal(studioPage.includes('StudioProductionConsole'), false, 'legacy_production_console_must_not_own_entry');
assert.ok(workspace.includes('/api/studio/field'), 'field_persistence_route_missing');
assert.ok(workspace.includes('/cognitive'), 'cognitive_runtime_route_missing');
assert.ok(workspace.includes('create_attractor'), 'attractor_creation_missing');
assert.ok(workspace.includes('create_node'), 'node_creation_missing');
assert.ok(workspace.includes('StudioDirectIngestion'), 'direct_ingestion_instrument_missing');
assert.ok(workspace.includes('REQUIRES_DECLARATION'), 'fail_closed_attractor_state_missing');
assert.ok(workspace.includes('NO_VALUE'), 'fail_closed_missing_value_state_missing');
assert.ok(workspace.includes('Simulation returns must remain SIMULATED'), 'studio_method_lab_epistemic_boundary_missing');
assert.ok(workspace.includes('Studio will not fabricate a certificate from a UUID alone.'), 'mops_identity_fail_closed_boundary_missing');
assert.ok(ingestion.includes('.zip'), 'zip_intake_missing');
assert.ok(ingestion.includes('session_package'), 'session_package_modality_missing');
assert.ok(ingestion.includes('se descarta'), 'transient_package_copy_missing');
assert.ok(!/StudioObjectReport|StudioCapabilityDrawer|StudioTraceDrawer/.test(workspace), 'deleted_dashboard_reference_present');
assert.ok(!/coming soon|pr[oó]ximamente/i.test(workspaceSource), 'coming_soon_copy_present');
assert.ok(!/href=["']#["']/.test(workspaceSource), 'dead_hash_link_present');
assert.ok(!/demo data|datos demo/i.test(workspaceSource), 'demo_surface_present');
assert.ok(/onClick=|onSubmit=|type="submit"/.test(workspaceSource), 'operational_handlers_missing');

for (const token of [
  '.studio-native',
  '.studio-native__scope',
  '.studio-native__field',
  '.studio-native__intelligence',
  '.studio-native__timeline',
  '.studio-native__certificate',
  '.studio-native__mihm',
  '.studio-native__friction',
  '.studio-native__trajectory',
  '@media(max-width:900px)',
]) assert.ok(css.includes(token), `native_studio_css_missing:${token}`);

console.log(JSON.stringify({
  ok: true,
  nativeContinuousStudio: true,
  legacyEntryCompositionRemoved: true,
  directSupabaseAccess: false,
  multiscaleScope: ['ATTRACTOR','PROJECT','NODE','OBJECT','MANIFESTATION'],
  lenses: ['SYSTEM','EVIDENCE','MIHM','FRICTION','TRAJECTORY','LAB','IDENTITY'],
  zipSessionIntake: true,
  transientPackageRetentionPolicyVisible: true,
  cognitiveInstrument: true,
  methodLabBoundary: true,
  mopsCertificateFailClosed: true,
  timelineContinuity: true,
}, null, 2));
