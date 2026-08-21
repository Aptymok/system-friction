import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path: string) { return readFileSync(path, 'utf8'); }

const proxy = read('src/proxy.ts');
assert.match(proxy, /X-Frame-Options', permitsRootInternalFrame\(pathname\) \? 'SAMEORIGIN' : 'DENY'/, 'ROOT-owned framed surfaces must be SAMEORIGIN while all other paths remain DENY');
assert.match(proxy, /\/root\/reports/, 'Report surface must remain covered by ROOT internal frame policy');
assert.match(proxy, /\/root\/agents/, 'Agent surfaces must remain covered by ROOT internal frame policy');

// Report generation remains a backend/runtime contract after the old Report Center UI was removed.
const scheduled = read('src/lib/reports/scheduledAgentReports.ts');
for (const lane of ['world_daily', 'world_weekly', 'internal_daily', 'prospect_weekly', 'attractor_daily']) {
  assert.ok(scheduled.includes(`'${lane}'`), `scheduled lane missing: ${lane}`);
}
assert.match(scheduled, /continuity-report-cron/, 'Scheduled reports must reuse the existing continuity-report cron');
assert.match(scheduled, /status: input\.output\.ok && !input\.output\.provider\.startsWith\('degraded:'\)/, 'Degraded LLM fallback must not persist as READY');

const passports = read('src/lib/sfi/cognitive-runtime/agentPassports.ts');
for (const field of ['reads:', 'writes:', 'executes:', 'executionEvidence:']) {
  assert.ok(passports.includes(field), `agent passport truth field missing: ${field}`);
}

const scenes = read('src/components/sfi/scenes.ts');
const liveUi = read('src/components/sfi/SfiConsole.tsx');
assert.ok(scenes.includes("root:{key:'root'"), 'ROOT live scene missing');
assert.ok(scenes.includes("agents:{key:'agents'"), 'AGENTS live scene missing');
assert.ok(liveUi.includes('FUENTE VIVA') && liveUi.includes('ESTADO'), 'live runtime telemetry missing');
assert.ok(liveUi.includes('/api/acp/proposals'), 'ROOT governed proposal feed missing');
assert.ok(liveUi.includes('COGNITIVE TWIN'), 'Twin proposal observability missing');
assert.ok(liveUi.includes('ACEPTAR') && liveUi.includes('RECHAZAR'), 'ROOT plain-language decision controls missing');

const vercel = read('vercel.json');
const parsed = JSON.parse(vercel) as { crons?: Array<{ path?: string }> };
assert.equal(parsed.crons?.filter((item) => item.path === '/api/cron/continuity-report').length, 1, 'Must reuse exactly one existing continuity-report cron');

console.log(JSON.stringify({
  ok: true,
  invariants: [
    'owned ROOT frames SAMEORIGIN; other paths DENY',
    'report generation remains backend/runtime-owned',
    'five recurring report lanes reuse existing cron',
    'degraded provider output is not READY',
    'agent passports declare reads/writes/executes/evidence',
    'ROOT and AGENTS are observable through canonical live scenes',
  ],
}, null, 2));
