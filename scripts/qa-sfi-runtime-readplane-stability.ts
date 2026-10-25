import assert from 'node:assert/strict';
import fs from 'node:fs';
import './qa-sfi-zero-interactive-duplication';
import './qa-sfi-actionable-human-inbox';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const observed=read('src/lib/sfi/cognitive-runtime/observedRuntime.ts');
const primaryRpc=read('src/lib/persistence/dataPlaneRpc.ts');
const integration=read('src/core/cognitive-twin/institutionalIntegration.ts');
const state=read('src/core/cognitive-twin/readState.ts');
const canonicalMemory=read('src/core/cognitive-twin/canonicalMemoryView.ts');
const auth=read('src/components/auth/AuthProvider.tsx');
const cases=read('src/app/api/cases/route.ts');
const rootState=read('src/app/api/root/state/route.ts');

// Interactive cognition may read the evidence/event stream it actually renders,
// but it must never turn a page view into a database-wide health scan.
assert.equal(observed.includes('SFI_CONVERGED_RUNTIME_SOURCE_TABLES'),false,'runtime must not fan out over every declared source table');
assert.equal(observed.includes('readTableAvailability'),false,'runtime must not probe table availability on interactive reads');
assert.equal(observed.includes("head: true"),false,'runtime must not use HEAD health probes');
assert.ok(observed.includes('SNAPSHOT_TTL_MS')&&observed.includes('snapshotInFlight'),'runtime snapshot must coalesce repeated reads');

// C07 is persisted in the Supabase primary; Neon continuity is not replicated.
// A 24-hour runtime count must never silently substitute an older Neon snapshot.
assert.ok(primaryRpc.includes('readPrimaryCognitiveExecutionEvents'),'existing direct primary read contract must expose C07 receipt observation');
assert.ok(primaryRpc.includes("event_name: 'eq.SFI_AGENT_EXECUTED'")&&primaryRpc.includes("limit: '168'"),'primary receipt read must be narrow and bounded');
const primaryReadStart=primaryRpc.indexOf('export async function readPrimaryCognitiveExecutionEvents');
const primaryReadEnd=primaryRpc.indexOf('/**',primaryReadStart+12);
const primaryRead=primaryRpc.slice(primaryReadStart,primaryReadEnd);
assert.ok(primaryRead.includes("method: 'GET'")&&primaryRead.includes("cache: 'no-store'"),'primary execution read must be read-only and uncached');
assert.ok(!primaryRead.includes('createSfiDataPlaneFetch')&&!primaryRead.includes('postNeonDataPlaneRpc'),'primary receipt read must not follow the continuity redirect');
assert.ok(observed.includes('readPrimaryCognitiveExecutionEvents()'),'observed runtime must use authoritative primary event receipts');
assert.ok(observed.includes('PRIMARY_EXECUTION_RECEIPTS_UNAVAILABLE: CONTINUITY_ONLY_NOT_COMPLETE'),'unavailable primary must not be interpreted as zero executions');
assert.ok(observed.includes('executionReadDegraded')&&observed.includes("status = 'degraded'"),'primary failure must make agent execution observation degraded');
assert.ok(observed.includes('PRIMARY_EXECUTIONS+ROUTED_RECENT'),'runtime must preserve provenance of mixed read-planes');
assert.ok(observed.includes('uniqueEvents')&&observed.includes('uniqueEvents.has(id)'),'passports must not double-count the same event across planes');
assert.ok(!observed.includes('await probePrimaryDataPlane'),'interactive read must not grow into broad infrastructure probing');

// Cognitive Twin integration health is a contract by default; live probing is an
// explicit diagnostic/sync act and is bounded rather than COUNT(*).
assert.ok(integration.includes('options: { liveProbe?: boolean } = {}'),'integration live probes must be opt-in');
assert.ok(integration.includes("DECLARED_CONTRACT_NO_INTERACTIVE_PROBE"),'interactive integration read must declare no live probe');
assert.equal(integration.includes("count:'exact'"),false,'integration must not exact-count tables');
assert.equal(integration.includes('count: \'exact\''),false,'integration must not exact-count tables');
assert.ok(integration.includes("select('id').limit(1)"),'explicit integration diagnostic must be bounded');

assert.equal(state.includes("count:'exact'"),false,'Twin state must not exact-count required tables');
assert.equal(state.includes('count: \'exact\''),false,'Twin state must not exact-count required tables');
assert.ok(state.includes('STATE_TTL_MS')&&state.includes('stateInFlight'),'Twin state must coalesce repeated reads');
assert.equal(canonicalMemory.includes("count:'exact'"),false,'canonical memory interactive view must not COUNT(*)');
assert.equal(canonicalMemory.includes('count: \'exact\''),false,'canonical memory interactive view must not COUNT(*)');

// Navigation and token refresh must not restart account hydration repeatedly.
assert.equal(auth.includes('usePathname'),false,'auth provider must not re-subscribe on navigation');
assert.equal(auth.includes('useRouter'),false,'auth provider must not couple session hydration to router navigation');
assert.ok(auth.includes("event==='TOKEN_REFRESHED'")&&auth.includes('identityCache'),'token refresh must reuse already-resolved identity');

// Pool pressure is not fixed by retrying the same reads faster.
assert.equal(cases.includes('withTransientReadRetry'),false,'cases read must not amplify pool pressure with internal retries');
assert.ok(cases.includes('SFI_DATA_PLANE_TEMPORARILY_UNAVAILABLE')&&cases.includes("'Retry-After':'3'"),'pool pressure must fail explicitly with backoff guidance');

// Exhaustive table diagnostics remain possible, but never on the ordinary ROOT state request path.
assert.ok(rootState.includes("searchParams.get('diagnostic')==='1'"),'ROOT table-health fanout must require explicit diagnostic mode');
assert.ok(rootState.includes('REQUEST_PATH_NOT_PROBED'),'ordinary ROOT state must expose that infrastructure was not probed');

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-RUNTIME-READPLANE-STABILITY-1.2',
  invariants:[
    'NO_INTERACTIVE_DATABASE_WIDE_HEALTH_FANOUT',
    'NO_INTERACTIVE_EXACT_COUNT_PROBES',
    'SINGLE_FLIGHT_RUNTIME_SNAPSHOTS',
    'AUTH_SUBSCRIBE_ONCE_PER_MOUNT',
    'POOL_PRESSURE_FAILS_WITHOUT_RETRY_AMPLIFICATION',
    'EXHAUSTIVE_HEALTH_IS_EXPLICIT_DIAGNOSTIC_ONLY',
    'ZERO_DUPLICATE_INTERACTIVE_READS',
    'ACTIONABLE_SOVEREIGN_HUMAN_QUEUE',
    'C07_PRIMARY_RECEIPTS_NEVER_MASKED_BY_CONTINUITY',
    'MISSING_PRIMARY_EVENT_PLANE_IS_DEGRADED_NOT_ZERO',
  ],
},null,2));