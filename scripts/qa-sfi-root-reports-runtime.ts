import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path: string) { return readFileSync(path, 'utf8'); }

const proxy = read('src/proxy.ts');
assert.match(proxy, /X-Frame-Options', permitsRootInternalFrame\(pathname\) \? 'SAMEORIGIN' : 'DENY'/, 'ROOT-owned framed surfaces must be SAMEORIGIN while all other paths remain DENY');
assert.match(proxy, /\/root\/reports/, 'Report surface must be explicitly allowed as an internal ROOT frame');
assert.match(proxy, /\/root\/agents/, 'Agent surfaces, including passports, must be covered by the internal ROOT frame prefix');

const reportsUi = read('src/components/root/reports/RootReportsConsole.tsx');
assert.match(reportsUi, /BUSCAR EN REPORTES YA GENERADOS/, 'Report Center must expose search over existing reports');
assert.doesNotMatch(reportsUi, /api\/root\/agentic\/report[^/]/, 'Report Center must not invoke manual report generation');
assert.doesNotMatch(reportsUi, /¿Qué quieres que SFI te explique\?/, 'Legacy prompt-first Report Center must not return');

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
const passportUi = read('src/components/root/agents/AgentPassportsConsole.tsx');
for (const label of ['LEE', 'ESCRIBE', 'EJECUTA', 'EVIDENCIA DE EJECUCIÓN']) {
  assert.ok(passportUi.includes(label), `agent passport visible section missing: ${label}`);
}

const vercel = read('vercel.json');
const parsed = JSON.parse(vercel) as { crons?: Array<{ path?: string }> };
assert.equal(parsed.crons?.filter((item) => item.path === '/api/cron/continuity-report').length, 1, 'Must reuse exactly one existing continuity-report cron');

console.log(JSON.stringify({
  ok: true,
  invariants: [
    'owned ROOT frames SAMEORIGIN; other paths DENY',
    'Report Center reads/searches existing reports only',
    'five recurring report lanes reuse existing cron',
    'degraded provider output is not READY',
    'agent passports visibly declare reads/writes/executes/evidence',
  ],
}, null, 2));
