import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const meter = read('src/lib/operations/sfiCostMeter.ts');
const route = read('src/app/api/root/cost-meter/route.ts');
const intake = read('src/lib/sfi/cognitive-runtime/queuedMissionIntake.ts');
const worker = read('src/lib/sfi/cognitive-runtime/queuedMissionWorker.ts');
const root = read('src/components/sfi/SfiRootWorkspace.tsx');
const workflow = read('.github/workflows/sfi-continuity-hourly.yml');
const retiredReplication = read('src/lib/persistence/replicationRetirementPolicy.ts');

assert.match(meter, /SFI-COST-METER-PRIMARY-ONLY-1\.0/);
assert.match(meter, /SFI_COST_MAX_C07_MISSIONS_PER_DAY', 6, 24/);
assert.match(meter, /SFI_COST_MAX_C07_MISSIONS_PER_MONTH', 60, 240/);
assert.match(meter, /if \(!Number\.isSafeInteger\(value\) \|\| value < 1 \|\| value > hardMaximum\) return 0/);
assert.match(meter, /\.limit\(241\)/);
assert.match(meter, /'C07_USAGE_TRUNCATED_BUDGET_CLOSED'/);
assert.match(meter, /'PRIMARY_C07_USAGE_UNAVAILABLE'/);
assert.match(meter, /jobs\.length === 241/);
assert.match(meter, /!quota\.ok/);
assert.match(meter, /unpricedModelCalls/);
assert.match(meter, /'INCOMPLETE'/);
assert.match(meter, /'NOT_CONNECTED'/);
assert.doesNotMatch(meter, /NeonDataPlane|SFI_CONTINUITY_DATABASE_URL|setInterval|setTimeout|createSfiDataPlaneFetch/);

assert.match(route, /requireRootActor\('root\.cognitive-runtime\.read'\)/);
assert.match(route, /readSfiCostMeter\(\)/);
assert.match(route, /'Cache-Control': 'private, no-store'/);
assert.doesNotMatch(route, /export async function POST/);
assert.match(intake, /readSfiMissionQuota\(\)/);
assert.match(intake, /sfi_cost_quota_reached/);
assert.ok(intake.indexOf('const quota=await readSfiMissionQuota()') < intake.indexOf("sfi_c07_enqueue_mission_v1"));
assert.match(worker, /readSfiMissionQuota\(\)/);
assert.match(worker, /DAILY_MISSION_BUDGET_REACHED/);
assert.ok(worker.indexOf('const quota=await readSfiMissionQuota()') < worker.indexOf("sfi_c07_claim_mission_v1"));
assert.match(root, /data-sfi-cost-meter="PRIMARY_ON_DEMAND_NO_SYNC"/);
assert.match(root, /onClick=\{\(\)=>void loadCostMeter\(\)\}/);
assert.doesNotMatch(root, /setInterval\([^)]*loadCostMeter/);
assert.match(workflow, /cron: '17 \* \* \* \*'/);
assert.doesNotMatch(workflow, /7,22,37,52 \* \* \* \*/);
assert.match(workflow, /Cross-provider replication is permanently excluded/);
assert.match(retiredReplication, /SFI_REPLICATION_RETIRED_BY_FOUNDER/);

console.log('PASS SFI cost meter: read-only on demand, fail-closed quotas, bounded C07 checks, no Neon refresh.');
