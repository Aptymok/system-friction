import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks: Array<{ name: string; ok: boolean }> = [];
const check = (name: string, ok: boolean) => checks.push({ name, ok });

const postgres = read('src/lib/sfi/continuityPostgres.ts');
const gate = read('src/lib/continuity/actionableWorkGate.ts');
const runtime = read('src/lib/continuity/runtime.ts');
const store = read('src/lib/continuity/neonHeartbeatStore.ts');
const guard = read('src/lib/continuity/scheduledEgressGuard.ts');
const heartbeat = read('src/app/api/cron/continuity-heartbeat/route.ts');
const primaryMirror = read('src/lib/persistence/primaryMirror.ts');
const hourlyContinuity = read('.github/workflows/sfi-continuity-hourly.yml');
const canonicalTwinMemory = read('src/core/cognitive-twin/canonicalMemoryView.ts');
const twinState = read('src/core/cognitive-twin/readState.ts');
const amvAgent = read('src/lib/agents/amvAgent.ts');

check('current-main access-critical Neon readers are preserved',
  postgres.includes('readContinuityInstitutionalAccountGrantByEmail')
  && postgres.includes('readContinuityMemberWorkspaceCounts')
  && postgres.includes('readContinuityFieldCaseOwner')
  && postgres.includes('readContinuityStudioObjectOwner'));

check('shared continuity SQL handle exists without second connector',
  postgres.includes('export function continuityDatabase()')
  && postgres.includes('return db()'));

check('actionable work gate reads Neon only after primary failure',
  gate.includes('readNeonActionableWorkSnapshot')
  && gate.includes("dataPlane: 'NEON'")
  && gate.indexOf('if (readError || missingContinuityState)') < gate.indexOf('const fallback = await readNeonActionableWorkSnapshot()'));

check('heartbeat persists run/check/incident/state to Neon fallback',
  store.includes('createNeonContinuityRun')
  && store.includes('insertNeonContinuityHealthChecks')
  && store.includes('insertNeonContinuityIncidents')
  && store.includes('finalizeNeonContinuityRun')
  && store.includes('updateNeonContinuityState')
  && runtime.includes("dataPlane = 'NEON'")
  && runtime.includes('readNeonContinuityHeartbeatState'));

check('continuity dashboard observes and resolves primary plus authorized Neon continuity plane',
  store.includes('readNeonContinuityObservation')
  && runtime.includes('readNeonContinuityObservation')
  && runtime.includes('planeComparison')
  && runtime.includes('divergenceObserved')
  && runtime.includes('PRIMARY_CANONICAL_CONTINUITY_STATE_SELECTED')
  && runtime.includes('AUTHORIZED_CONTINUITY_PLANE_SELECTED_BECAUSE_PRIMARY_IS_UNAVAILABLE_DEGRADED_OR_OLDER'));

check('Cognitive Twin canonical memory falls back to Neon only after primary read failure and restarts on one plane',
  postgres.includes('readContinuityCanonicalCognitiveTwinMemoryRows')
  && canonicalTwinMemory.includes('readContinuityCanonicalCognitiveTwinMemoryRows')
  && canonicalTwinMemory.includes("readPlane = 'NEON'")
  && canonicalTwinMemory.includes('latestByKey.clear()')
  && canonicalTwinMemory.includes('seenKeys.clear()'));

check('Cognitive Twin runtime state falls back to bounded Neon snapshot after primary read failure',
  postgres.includes('readContinuityCognitiveTwinStateSnapshot')
  && twinState.includes('readContinuityCognitiveTwinStateSnapshot')
  && twinState.includes("runtimeReadPlane = 'NEON'")
  && twinState.includes('primaryRuntimeErrors.length && isSfiContinuityConfigured()'));

check('AMV operational memory falls back to bounded Neon memory after primary read failure',
  postgres.includes('readContinuityAmvMemory')
  && amvAgent.includes('readContinuityAmvMemory')
  && amvAgent.includes("readPlane: 'NEON' as const")
  && amvAgent.includes('primary_diagnostic'));

check('scheduled egress guard requires explicit continuity opt-in',
  guard.includes('allowContinuityFallback?: boolean')
  && guard.includes('input.allowContinuityFallback && isSfiContinuityConfigured()'));


check('primary mirror maintenance is owned by the existing continuity heartbeat',
  primaryMirror.includes('export async function flushPrimaryMirror')
  && runtime.includes("import('@/lib/persistence/primaryMirror')")
  && runtime.includes('flushPrimaryMirror')
  && runtime.includes('primaryMirror'));

check('idle wakeup cannot suppress required data-plane mirror certification maintenance',
  gate.includes("import('@/lib/persistence/dataPlaneContinuityStore')")
  && gate.includes('mirrorMaintenanceRequired')
  && gate.includes('DATA_PLANE_MIRROR_MAINTENANCE_REQUIRED'));

check('existing half-hour continuity scheduler is sufficient for the two-hour mirror freshness gate',
  hourlyContinuity.includes("cron: '15 * * * *'")
  && hourlyContinuity.includes("cron: '45 * * * *'"));

check('continuity heartbeat is the explicit scheduled fallback caller',
  heartbeat.includes('scheduledEgressGuardResponse({ allowContinuityFallback: true })'));

for (const route of [
  'src/app/api/cron/notas-temporales/route.ts',
  'src/app/api/cron/predictive-engine/route.ts',
  'src/app/api/cron/sfi-indicators/route.ts',
  'src/app/api/cron/worldspect/route.ts',
  'src/app/api/cron/world-observatory/route.ts',
  'src/app/api/cron/continuity-report/route.ts',
  'src/app/api/cron/sfi-institutional-cycle/route.ts',
]) {
  const source = read(route);
  check(`${route} remains fail-closed while scheduled egress is restricted`,
    source.includes('scheduledEgressGuardResponse()')
    && !source.includes('allowContinuityFallback: true'));
}

check('restricted probe responses are not reported as operational',
  runtime.includes("payload?.status === 'EGRESS_RESTRICTED'")
  && runtime.includes("errorCode: 'scheduled_egress_restricted'"));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} · ${item.name}`);
if (failed.length) {
  console.error(`\nNeon continuity heartbeat QA failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nNeon continuity heartbeat QA passed: ${checks.length}/${checks.length}`);
