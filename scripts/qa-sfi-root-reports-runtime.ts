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
const workboardUi = read('src/components/sfi/RootOperationalWorkboard.tsx');
const workboardApi = read('src/app/api/root/workboard/route.ts');
const caseExecutionApi = read('src/app/api/root/case-execution/route.ts');
const workboard = read('src/lib/root/operationalWorkboard.ts');
const members = read('src/lib/system/access/institutionalMembers.ts');
const reviewer = read('src/lib/governance/proposalReviewer.ts');
const decisionAuthority = read('src/lib/governance/proposalDecisionAuthority.ts');
const proposalFeed = read('src/app/api/acp/proposals/route.ts');
const approve = read('src/app/api/acp/proposals/[id]/approve/route.ts');
const reject = read('src/app/api/acp/proposals/[id]/reject/route.ts');
const requestEvidence = read('src/app/api/sfi/proposals/[id]/request-evidence/route.ts');
const prepare = read('src/app/api/acp/proposals/[id]/prepare/route.ts');
const outcome = read('src/app/api/acp/proposals/[id]/outcome/route.ts');
const outcomeWriter = read('src/lib/governance/proposalOutcome.ts');
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
assert.match(liveUi, /RootOperationalWorkboard/, 'ROOT live scene must mount the actionable operational home');

assert.match(workboardApi, /requireRootViewer\('root\.workboard\.read'\)/, 'workboard must remain behind ROOT-observer authorization');
assert.match(workboardApi, /resolveProposalReviewerAuthority/, 'workboard must resolve ROOT/controller authority');
assert.match(workboardApi, /readRootOperationalWorkboard/, 'workboard API must use the canonical server aggregator');
for (const dependency of ['readRootReportInbox', 'readRootReportHealth', 'readObservedSfiCognitiveRuntime', 'readUniversalOpenCycles']) {
  assert.ok(workboard.includes(dependency), `workboard missing live dependency: ${dependency}`);
}
assert.match(workboard, /routingMode: 'GOVERNED_AUTO_AFTER_AUTHORIZATION'/, 'workboard must disclose governed auto-routing after authorization');
assert.match(workboard, /autoDispatch: true/, 'workboard must disclose authorized automatic dispatch');
assert.match(workboard, /selfHealing: true/, 'workboard must disclose authorized self-healing/remediation');
assert.match(workboard, /classifyGovernedProposalWork/, 'workboard readiness must use the same governed classification as the router');
assert.match(workboard, /MISSING_EXECUTION_ADAPTER/, 'workboard must still expose genuinely missing material adapters');
assert.match(workboard, /coordinator: 'project_execution_manager'/, 'existing project execution manager must be reused as coordinator rather than inventing a new service');
assert.match(workboard, /implementationPerformedByWorkboard: false/, 'workboard must never itself become the execution engine');
for (const reservedId of ['87cc094a-e9df-40e8-9a35-92c679c60ef2', '5e4803b2-0b23-4047-9ba3-38a588c78f82']) {
  assert.ok(workboard.includes(reservedId), `reserved governance proposal missing from workboard observability: ${reservedId}`);
}
for (const foundationId of ['fafd0dc4-0ade-4f5d-ac3c-1efebe4e8abd', '25061b67-9eb2-49e5-b192-bebe5aa796ce', '95f9c1d0-3626-4bac-82dd-cee6bb462b7c']) {
  assert.ok(workboard.includes(foundationId), `governed foundation proposal missing from status observability: ${foundationId}`);
}
for (const label of ['TRABAJO QUE REQUIERE ATENCIÓN', 'NECESITA DE MÍ / ROOT ACTION', 'SFI TRABAJANDO / AUTOMÁTICO', 'PULSO / CONTINUIDAD', 'DECISIONES QUE REQUIEREN ROOT', 'EJECUCIONES / ASIGNACIÓN', 'PROYECTOS / EJECUCIÓN DE CASOS', 'TWIN / PROPUESTAS', 'CICLOS UNIVERSALES', 'BLOQUEOS / ADVERTENCIAS', 'REPORTES / CARRILES DEGRADADOS', 'RIESGO / OPORTUNIDAD', 'RETURN / CALIBRACIÓN', 'CANON QUEUE · ROOT ONLY', 'CAPACIDADES RESERVADAS']) {
  assert.ok(workboardUi.includes(label), `operational home lane missing: ${label}`);
}
assert.match(workboardUi, /humano sólo cuando rootActionRequired=true/, 'ROOT UI must state the human-action boundary explicitly');
assert.match(workboardUi, /cognition interrumpida → continuidad durable/, 'ROOT UI must expose interrupted cognition as machine-owned continuity');
assert.match(workboardUi, /external actions fail closed without adapter/, 'ROOT UI must disclose the material external adapter boundary');
assert.match(workboardUi, /reportLanes/, 'report health must be readable from the home surface rather than hidden in raw JSON');
assert.match(workboardUi, /\/api\/root\/case-execution/, 'ROOT home must observe the existing Case Action execution lifecycle');

assert.match(caseExecutionApi, /requireRootActor\('root\.case_execution\.read'\)/, 'cross-tenant Case Action execution overview must remain sovereign ROOT-only');
assert.match(caseExecutionApi, /sfi_case_action_proposals/, 'case execution surface must read the existing case action lifecycle');
assert.match(caseExecutionApi, /automaticExternalExecution: false/, 'case execution surface must not imply external execution authority');
assert.match(caseExecutionApi, /platformPerformedExternalAction: false/, 'case execution rows must preserve the existing non-execution boundary');

assert.match(outcome, /observed_return_and_evidence_required/, 'queued proposal outcome route must require return + evidence identifiers');
assert.match(outcome, /recordProposalOutcomeFromObservedReturn/, 'outcome route must delegate closure to the canonical outcome writer');
assert.match(outcomeWriter, /epistemicClass === 'observed'/, 'canonical outcome writer must verify the return epistemic class');
assert.match(outcomeWriter, /SFI_UNIVERSAL_RETURN_RECORDED/, 'canonical outcome writer must recognize the existing observed universal RETURN contract');
assert.match(outcomeWriter, /return_event_proposal_mismatch/, 'canonical outcome writer must bind RETURN to the same proposal UUID');
assert.match(outcomeWriter, /PENDING_REALITY_CALIBRATION/, 'outcome closure must not pretend calibration already happened');
assert.match(outcomeWriter, /CANDIDATE_UNTIL_CALIBRATED/, 'learning must remain candidate until calibration');
assert.match(outcomeWriter, /canonicalPromotionAllowed: false/, 'recording an outcome must not canonize it');

assert.match(members, /decisionAuthority\?: 'controller'/, 'institutional membership must model delegated decision authority separately');
assert.match(members, /email: 'edwin\.tzolkin@gmail\.com'[\s\S]*role: 'controller'[\s\S]*decisionAuthority: 'controller'/, 'Edwin must hold controller membership while preserving explicit delegated decision authority');
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
assert.match(approve, /dispatchQueuedProposal\(proposalId\)/, 'ACCEPT must immediately hand queued work to the governed router');
assert.match(approve, /return_recorded_calibration_or_canon_review_when_appropriate/, 'approval response must expose successful automatic execution handoff');
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
    'report generation remains backend/runtime-owned and five recurring report lanes remain observable',
    'agent passports declare reads/writes/executes/evidence',
    'ROOT operational home separates human-required actions, autonomous SFI work, continuity pulse, Twin proposals and universal cycles',
    'existing SFI-CASE-ACTION-1.0 execution/return state is observable to sovereign ROOT without fabricating external execution',
    'workboard remains a read model while governed auto-routing is owned by the router',
    'internal routable capability is distinct from missing material external adapter',
    'queued proposal outcome requires a proposal-scoped OBSERVED RETURN plus evidence; calibration and learning remain pending/candidate',
    'ROOT sees every proposal; controller sees only explicitly delegable work',
    'Edwin is a controller with explicit decision authority and never becomes ROOT',
    'sensitive and canonical decisions fail closed to ROOT',
    'canonical promotion remains a separate requireRootActor boundary',
    'ACCEPT is one human decision, queues work and immediately hands it to the governed router',
    'ROOT can freeze/cancel without erasing lineage',
    'legacy realization remains internal_record_only and hidden from the normal UI',
  ],
}, null, 2));
