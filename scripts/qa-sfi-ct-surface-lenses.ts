import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path: string) { return readFileSync(path, 'utf8'); }

const scenes = read('src/components/sfi/scenes.ts');
const overlay = read('src/components/sfi/SceneFieldOverlay.tsx');
const overlayCss = read('src/components/sfi/SceneFieldOverlay.css');
const page = read('src/app/[scene]/page.tsx');
const connection = read('src/core/cognitive-twin/reentry/connectionStatus.ts');
const connectionRoute = read('src/app/api/root/cognitive-twin/connection/route.ts');
const activation = read('src/core/cognitive-twin/reentry/governedActivation.ts');
const adapters = read('src/lib/execution/executionAdapterRegistry.ts');
const router = read('src/lib/execution/governedExecutionRouter.ts');
const continuity = read('src/app/api/cron/continuity-report/route.ts');
const evaluateRoute = read('src/app/api/root/method-lab/decision-transfer/route.ts');
const blindRoute = read('src/app/api/root/method-lab/decision-transfer/blind/route.ts');
const revealRoute = read('src/app/api/root/method-lab/decision-transfer/reveal/route.ts');

for (const scene of ['field','systems','archive','falsification','optionality','governance','authority','agents','identity','models','genai','root']) {
  assert.ok(scenes.includes(`'${scene}'`), `scene missing: ${scene}`);
}
assert.match(scenes, /identity:[\s\S]*liveSource:'\/api\/root\/cognitive-twin\/connection'/, 'IDENTITY must read CT connection truth');
assert.match(scenes, /genai:[\s\S]*liveSource:'\/api\/external\/v1\/manifest'/, 'GENAI must read external gateway manifest');
assert.match(scenes, /governance:[\s\S]*Propuesta → autorización → ejecución → RETURN → calibración → aprendizaje → canon\/cierre/, 'governance scene must expose the full cycle');

assert.match(page, /<SceneFieldOverlay scene=\{key\}\/>/, 'scene page must mount live field overlay');
for (const label of ['OBSERVED EXECUTION','WAITING EVIDENCE','CANON AUTHORITY','CONNECTION','VALIDATION','EXTERNAL ACTION']) {
  assert.ok(overlay.includes(label), `overlay signal missing: ${label}`);
}
assert.match(overlay, /fetch\(SCENES\[scene\]\.liveSource/, 'overlay must read the scene-specific live source');
assert.match(overlayCss, /position:fixed/, 'overlay must remain a field layer rather than reflowing the scene into dashboard cards');
assert.doesNotMatch(overlayCss, /grid-template-columns/, 'scene field overlay must not become a card grid');

assert.match(connection, /connectionState: connected \? 'CONNECTED'/, 'CT must expose CONNECTED separately');
assert.match(connection, /functionState: functional \? 'FUNCTIONAL'/, 'CT must expose FUNCTIONAL separately');
assert.match(connection, /validationState: validationObserved \? 'OBSERVED' : 'GATED'/, 'CT validation must remain distinct from connectivity');
assert.match(connection, /ROOT_ONLY/, 'CT connection status must preserve ROOT canon boundary');
for (const route of ['/api/root/method-lab/decision-transfer','/api/root/method-lab/decision-transfer/blind','/api/root/method-lab/decision-transfer/reveal']) {
  assert.ok(connection.includes(route), `CT adapter route missing from connection truth: ${route}`);
}
assert.match(connectionRoute, /requireRootActor\('root\.cognitive-twin\.connection\.read'\)/, 'CT connection read must remain ROOT governed');
assert.match(evaluateRoute, /executeDecisionTransferEvaluation/, 'CT direct evaluation executor must remain connected');
assert.match(blindRoute, /executeBlindDecisionReconstruction/, 'CT blind executor must remain connected');
assert.match(revealRoute, /executeBlindDecisionReveal/, 'CT reveal executor must remain connected');

assert.match(activation, /proposal_type: PROPOSAL_TYPE/, 'CT diagnosis must materialize as a governed action proposal');
assert.match(activation, /status: 'proposed'/, 'CT diagnosis must ask before executing');
assert.match(activation, /decision_authority: 'root_only'/, 'CT reentry activation request must reach ROOT');
assert.match(activation, /do not fabricate a target or evidence/, 'CT validation must not self-heal by inventing evidence');
assert.match(activation, /open_request_already_exists/, 'CT diagnostic must deduplicate open requests');

for (const adapter of ['ct_reentry_decision_transfer','method_lab_sociotechnical','method_lab_economic','internal_site_development_executor']) {
  assert.ok(adapters.includes(`id: '${adapter}'`), `execution adapter missing: ${adapter}`);
}
assert.match(adapters, /internal_site_development_executor[\s\S]*runtimeBinding: 'EXTERNAL_PULL'/, 'site development must not pretend the web runtime can mutate GitHub itself');
assert.match(router, /87cc094a-e9df-40e8-9a35-92c679c60ef2/, 'router must be governed by the accepted AI Execution Router proposal');
assert.match(router, /5e4803b2-0b23-4047-9ba3-38a588c78f82/, 'self-healing must be governed by the accepted bootstrap proposal');
assert.match(router, /routerAuthorized = routerGate\.data\?\.status === 'queued' \|\| routerGate\.data\?\.status === 'accepted'/, 'router must fail closed until governance authorization exists');
assert.match(router, /state: 'BLOCKED_EXECUTOR_CAPABILITY'/, 'missing capability must become an explicit routing state');
assert.match(router, /execution_capability_remediation/, 'missing capability must raise a child remediation request');
assert.match(router, /decision_authority: 'root_only'/, 'capability-building remediation must ask ROOT');
assert.match(router, /returnContract: \{ required: true, proposalScoped: true, evidenceRefsRequired: true, canonicalPromotionAllowed: false \}/, 'router completion must require scoped RETURN and forbid canon');
assert.doesNotMatch(router, /executed_at|status:\s*'accepted'/, 'router must never fake execution/acceptance');
assert.match(continuity, /runGovernedExecutionRouterCycle/, 'authorized routing must run automatically from the existing continuity cycle');
assert.match(continuity, /ensureCognitiveTwinReentryGovernanceRequest/, 'CT diagnostic must automatically surface a governed request');
assert.doesNotMatch(continuity, /new cron|additional cron/, 'implementation must reuse the existing continuity cycle');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-CT-SURFACE-LENSES-EXECUTION-1.0',
  ctStates: ['CONNECTED','FUNCTIONAL','OBSERVED_OPERATIONAL','VALIDATION_GATED_OR_OBSERVED'],
  routing: ['AUTHORIZED','ASSIGNED','BLOCKED_EXECUTOR_CAPABILITY','ESCALATED','RETURN_REQUIRED'],
  surfaceRule: 'one visual language; distinct operational lens per door; data annotates the field instead of replacing it with dashboards',
  authorityRule: 'diagnosis and routing may be automatic after governed authorization; capability repair asks ROOT; material completion requires proposal-scoped observed RETURN; canon remains ROOT-only',
}, null, 2));
