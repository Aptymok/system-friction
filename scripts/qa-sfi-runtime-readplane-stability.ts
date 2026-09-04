import assert from 'node:assert/strict';
import fs from 'node:fs';
import './qa-sfi-zero-interactive-duplication';
import './qa-sfi-actionable-human-inbox';
import './qa-sfi-observatory-availability';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const observed=read('src/lib/sfi/cognitive-runtime/observedRuntime.ts');
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
    'PUBLIC_OBSERVATORY_AVAILABILITY_TRUTH',
  ],
},null,2));