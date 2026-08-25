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
const prepare = read('src/app/api/acp/proposals/[id]/prepare/route.ts');
const realize = read('src/app/api/acp/proposals/[id]/realize/route.ts');
const freeze = read('src/app/api/acp/proposals/[id]/freeze/route.ts');
assert.ok(scenes.includes("root:{key:'root'"), 'ROOT live scene missing');
assert.ok(scenes.includes("agents:{key:'agents'"), 'AGENTS live scene missing');
assert.ok(liveUi.includes('FUENTE VIVA') && liveUi.includes('ESTADO'), 'live runtime telemetry missing');
assert.ok(liveUi.includes('/api/acp/proposals'), 'ROOT governed proposal feed missing');
assert.ok(liveUi.includes('COGNITIVE TWIN'), 'Twin proposal observability missing');
assert.ok(liveUi.includes('ACEPTAR') && liveUi.includes('RECHAZAR'), 'ROOT plain-language decision controls missing');
assert.ok(liveUi.includes('AUTORIZAR PASO A COLA INTERNA'), 'ROOT must expose design_approved queue authorization without implying execution');
assert.ok(liveUi.includes('no la manda a GitHub, Vercel ni ejecuta una acción externa'), 'ROOT must explain that preparation is internal only');
assert.ok(liveUi.includes('REGISTRAR REALIZACIÓN INTERNA'), 'ROOT must expose queued realization');
assert.ok(liveUi.includes('CANCELAR / CONGELAR'), 'ROOT must expose a real governed stop action');
assert.ok(liveUi.includes('/api/logbook/visible'), 'ROOT must expose visible logbook access');
assert.ok(liveUi.includes('/api/root/decisions'), 'ROOT must expose decision/report queue access');
assert.match(prepare, /eq\('status', 'design_approved'\)/, 'Preparation must start only from design_approved');
assert.match(prepare, /status: 'queued'/, 'Preparation must transition to queued');
assert.match(prepare, /function proposalTypeOf/, 'Preparation must derive the canonical proposal type from the row');
assert.match(prepare, /proposalType,\n\s*expectedStatuses: \['design_approved'\]/, 'Preparation must preserve the proposal type during transition');
assert.doesNotMatch(prepare, /proposalType:\s*'twin_proposal'/, 'Preparation must never coerce every approved proposal into twin_proposal');
assert.match(realize, /approval\.explicit === true && approval\.scope === 'internal_record_only'/, 'Realization must require explicit internal approval');
assert.match(realize, /external_action_allowed: false/, 'Realization must not imply external execution');
assert.match(freeze, /decision: 'freeze'/, 'Cancellation must use canonical frozen lifecycle transition');
assert.match(freeze, /requireGovernedActor\('acp\.proposals\.freeze'\)/, 'Freeze endpoint must remain governed');

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
    'ROOT distinguishes design approval, internal queue authorization and governed realization',
    'ROOT preparation preserves the real proposal type instead of coercing twin_proposal',
    'ROOT explains that queue preparation does not execute or dispatch externally',
    'ROOT can freeze/cancel without erasing lineage',
    'ROOT exposes its visible logbook and decision/report queue',
    'realization remains internal_record_only and does not imply external execution',
  ],
}, null, 2));
