import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path: string) { return readFileSync(path, 'utf8'); }

const proxy = read('src/proxy.ts');
assert.match(proxy, /X-Frame-Options', permitsRootInternalFrame\(pathname\) \? 'SAMEORIGIN' : 'DENY'/, 'ROOT-owned framed surfaces must be SAMEORIGIN while all other paths remain DENY');
assert.match(proxy, /\/root\/reports/, 'Report surface must remain covered by ROOT internal frame policy');
assert.match(proxy, /\/root\/agents/, 'Agent surfaces must remain covered by ROOT internal frame policy');

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
const members = read('src/lib/system/access/institutionalMembers.ts');
const reviewer = read('src/lib/governance/proposalReviewer.ts');
const decisionAuthority = read('src/lib/governance/proposalDecisionAuthority.ts');
const proposalFeed = read('src/app/api/acp/proposals/route.ts');
const approve = read('src/app/api/acp/proposals/[id]/approve/route.ts');
const reject = read('src/app/api/acp/proposals/[id]/reject/route.ts');
const requestEvidence = read('src/app/api/sfi/proposals/[id]/request-evidence/route.ts');
const prepare = read('src/app/api/acp/proposals/[id]/prepare/route.ts');
const queue = read('src/lib/governance/proposalQueue.ts');
const realize = read('src/app/api/acp/proposals/[id]/realize/route.ts');
const freeze = read('src/app/api/acp/proposals/[id]/freeze/route.ts');
const promote = read('src/app/api/root/governance/promote/route.ts');

assert.ok(scenes.includes("root:{key:'root'"), 'ROOT live scene missing');
assert.ok(scenes.includes("agents:{key:'agents'"), 'AGENTS live scene missing');
assert.ok(liveUi.includes('FUENTE VIVA') && liveUi.includes('ESTADO'), 'live runtime telemetry missing');
assert.ok(liveUi.includes('/api/acp/proposals'), 'governed proposal feed missing');
assert.ok(liveUi.includes('GOVERNANCE QUEUE'), 'governance queue observability missing');
assert.ok(liveUi.includes('ACEPTAR · ENVIAR A EJECUCIÓN') && liveUi.includes('RECHAZAR'), 'plain-language decision controls missing');
assert.ok(liveUi.includes('PEDIR EVIDENCIA'), 'reviewers must be able to defer a decision for evidence');
assert.ok(liveUi.includes('ESPERANDO EJECUTOR / RETURN'), 'queued proposals must expose executor/return state');
assert.ok(liveUi.includes('TRAZA RECIENTE · DECISIONES Y CIERRES'), 'ROOT must expose decision trace');
assert.doesNotMatch(liveUi, /REGISTRAR REALIZACIÓN INTERNA/, 'ROOT UI must not offer a false manual realization button');
assert.ok(liveUi.includes('Decidir no es canonizar'), 'UI must separate governance decision from canon');
assert.ok(liveUi.includes('PROMOCIÓN CANÓNICA BLOQUEADA'), 'delegated controller must see the canonical boundary');
assert.ok(liveUi.includes('/api/logbook/visible'), 'ROOT must expose visible logbook access');
assert.ok(liveUi.includes('/api/root/decisions'), 'ROOT must expose decision/report queue access');

assert.match(members, /decisionAuthority\?: 'controller'/, 'institutional membership must model delegated decision authority separately');
assert.match(members, /email: 'edwin\.tzolkin@gmail\.com'[\s\S]*role: 'observer'[\s\S]*decisionAuthority: 'controller'/, 'Edwin must remain observer while receiving delegated controller authority');
assert.doesNotMatch(members, /email: 'edwin\.tzolkin@gmail\.com'[\s\S]{0,160}role: 'root'/, 'Edwin must never be promoted to ROOT by membership configuration');
assert.match(reviewer, /if \(ctx\.isRoot\) return 'root'/, 'ROOT reviewer authority must remain sovereign');
assert.match(reviewer, /member\?\.decisionAuthority === 'controller'/, 'controller authority must come from explicit institutional delegation');
assert.match(decisionAuthority, /ROOT_ONLY_TERMS/, 'delegated proposal classification must preserve a ROOT-only class');
for (const sensitive of ['canon', 'root', 'permission', 'credential', 'security', 'billing', 'ownership']) {
  assert.ok(decisionAuthority.includes(`'${sensitive}'`), `ROOT-only classification missing sensitive term: ${sensitive}`);
}
assert.match(proposalFeed, /authority==='root'\?sourceRows:sourceRows\.filter\(row=>controllerCanDecideProposal\(row\)\)/, 'ROOT must see all proposals while controllers see only delegable proposals');
for (const route of [approve, reject, requestEvidence]) {
  assert.match(route, /resolveProposalReviewerAuthority/, 'proposal decision routes must resolve ROOT/controller authority');
  assert.match(route, /authority === 'controller' && !controllerCanDecideProposal/, 'controller must be blocked on ROOT-only proposals');
  assert.match(route, /root_decision_required/, 'ROOT-only proposals must fail closed for controller');
}
assert.match(promote, /requireRootActor\('governance\.promotion\.accept'\)/, 'canonical promotion must remain ROOT-only');
assert.doesNotMatch(promote, /resolveProposalReviewerAuthority|controllerCanDecideProposal/, 'canonical promotion must not accept delegated controller authority');

assert.match(approve, /queueApprovedProposal/, 'ACCEPT must queue in the same human decision');
assert.match(approve, /next: 'executor_return_required'/, 'ACCEPT must hand off to executor/return without another human gate');
assert.match(prepare, /legacy_design_approved_queue_transition/, 'prepare route must exist only as legacy design_approved compatibility');
assert.match(queue, /requiresObservedReturn: true/, 'queued work must require observed return');
assert.match(queue, /canonicalPromotionAllowed: false/, 'queue authorization must never canonize');
assert.match(queue, /no_canonical_promotion_by_executor/, 'executor guardrail must block canonical promotion');
assert.match(queue, /return_required_before_claiming_realization/, 'queue must prohibit realization claims without return');
assert.match(realize, /approval\.explicit === true && approval\.scope === 'internal_record_only'/, 'legacy realization endpoint remains explicit and internal-only');
assert.match(realize, /external_action_allowed: false/, 'legacy realization must not imply external execution');
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
    'ROOT sees every proposal; controller sees only explicitly delegable work',
    'Edwin remains an observer with separate controller decision authority and never becomes ROOT',
    'sensitive and canonical decisions fail closed to ROOT',
    'canonical promotion remains a separate requireRootActor boundary',
    'ACCEPT is one human decision and queues work automatically',
    'queued proposals wait for a real executor/RETURN instead of a manual executed_at button',
    'legacy design_approved proposals retain one compatibility queue path',
    'ROOT exposes decision actor trace and controller/canon separation',
    'ROOT can freeze/cancel without erasing lineage',
    'legacy realization remains internal_record_only and hidden from the normal UI',
  ],
}, null, 2));
