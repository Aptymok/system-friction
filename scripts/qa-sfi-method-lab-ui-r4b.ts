import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path: string) {
  return readFileSync(path, 'utf8');
}

const page = read('src/app/method-lab/page.tsx');
const ui = read('src/components/sfi/MethodLabExperimentWorkbench.tsx');
const route = read('src/app/api/interface/method-lab/route.ts');
const projection = read('src/lib/method-lab/uiProjection.ts');
const execution = read('src/lib/method-lab/uiExecution.ts');
const experimentPersistence = read('src/lib/method-lab/experimentPersistence.ts');
const experimentContract = read('src/lib/method-lab/experimentContract.ts');
const reentry = read('src/lib/method-lab/reentryEngine.ts');
const personalWorkspace = read('src/lib/sfi/personal/cognitiveWorkspace.ts');
const twinContract = read('src/core/cognitive-twin/contract.ts');
const twinStateContract = read('src/core/cognitive-twin/stateContract.ts');
const twinStatePersistence = read('src/core/cognitive-twin/statePersistence.ts');

// Route authorization + canonical surface absorption.
assert.match(page, /requireUserProfile\(\)/, 'Method Lab page must require an authenticated user profile.');
assert.match(page, /requireRootObserverPage\('\/method-lab'\)/, 'Institutional Method Lab must retain the existing ROOT observer gate.');
assert.match(page, /MethodLabExperimentWorkbench/, 'Slice E must mount on the existing canonical /method-lab route.');
assert.doesNotMatch(page, /createServiceSupabaseClient|\.from\(/, 'Page rendering must not bypass server-owned persistence boundaries.');
assert.match(route, /requireUserProfile\(\)/, 'Method Lab UI API must authenticate every read/write.');
assert.match(route, /allowed: \['preregister', 'execute_simulation'\]/, 'UI API operation surface must stay explicitly bounded.');
assert.doesNotMatch(route, /requireRootActor|auditRootAction/, 'Owner-scoped UI API must not acquire ROOT mutation authority.');
assert.match(route, /canonicalPromotion: false/, 'UI route must expose the no-canonical-promotion boundary.');

// Owner/private scope. Every private case/evidence/Twin/experiment read is constrained by owner_id.
for (const table of ['field_cases', 'field_case_evidence', 'sfi_cognitive_twin_runs', 'sfi_lab_analyses']) {
  assert.ok(projection.includes(`.from('${table}')`), `Method Lab UI projection must consume existing owner ${table}.`);
}
const ownerFilters = projection.match(/\.eq\('owner_id', ownerId\)/g) ?? [];
assert.ok(ownerFilters.length >= 7, 'Method Lab UI projection must owner-scope all private reads and validation lookups.');
assert.match(projection, /PRIVATE_TWIN_CASE_STATE_REQUIRES_OWNER_ID_MATCH/);
assert.match(personalWorkspace, /\.eq\('owner_id', ownerId\)/, 'Existing personal runtime owner scope must remain authoritative.');
assert.match(personalWorkspace, /externalExecutionAllowed: false/);
assert.match(personalWorkspace, /authorityEscalationAllowed: false/);

// Experiment configuration + frozen T0.
for (const type of [
  'SIMULATION', 'REPLAY', 'REENTRY', 'COUNTERFACTUAL', 'MODEL_COMPARISON',
  'PASSPORT_COMPARISON', 'TWIN_COMPARISON', 'INTERVENTION_DESIGN', 'OBSERVATIONAL',
]) assert.ok(ui.includes(`'${type}'`), `Slice E UI missing experiment type ${type}.`);
for (const token of ['Hypothesis', 'T0 cutoff', 'Stopping rule', 'RETURN opens', 'RETURN closes', 'Variants', 'Expected signal']) {
  assert.ok(ui.includes(token), `Slice E UI missing configuration surface ${token}.`);
}
assert.match(projection, /METHOD_LAB_UI_T0_FUTURE_EVIDENCE_FORBIDDEN/);
assert.match(projection, /METHOD_LAB_UI_T0_FUTURE_TWIN_STATE_FORBIDDEN/);
assert.match(projection, /frozenInputRefs/);
assert.match(projection, /persistMethodLabExperimentPreregistration/);
assert.match(experimentPersistence, /insert-only|INSERT/i, 'Existing experiment persistence must preserve immutable preregistration semantics.');
assert.doesNotMatch(experimentPersistence, /\.update\(|\.upsert\(|\.delete\(/, 'Experiment persistence must not rewrite frozen preregistration history.');

// Real execution only through an existing owner. Slice E does not introduce an experiment engine.
assert.match(execution, /runPersonalLab\(/, 'Allowed UI simulation must delegate to the existing Method Lab simulation owner.');
assert.match(execution, /persistMethodLabExperimentRun\(/, 'Execution receipts must reuse existing experimentPersistence.');
assert.match(execution, /experimentType !== 'SIMULATION'/, 'No unsupported experiment type may be executed by this UI adapter.');
assert.match(execution, /METHOD_LAB_UI_STOPPING_RULE_REACHED/, 'Declared max execution stopping rule must be enforced before execution.');
assert.match(execution, /epistemicClass: 'SIMULATED'/);
assert.match(execution, /canonicalMutation: false/);
assert.match(execution, /SIMULATION_NEVER_INHERITS_OBSERVED/);
assert.doesNotMatch(execution, /executeMethodLabReentryVariant/, 'Slice E must not create a second Reentry executor path.');
assert.doesNotMatch(execution, /emitEpistemicEvent|appendEpistemicEvent|auditRootAction/, 'UI execution adapter must not create observation/ROOT event writers.');

// Reentry integration: render the exact canonical dimensions and persisted comparison/receipts.
for (const label of [
  'Δattention', 'Δevidence_selection', 'Δhypothesis_generation', 'Δcontradiction_detection',
  'Δuncertainty', 'Δdecision', 'Δintervention', 'Δprediction', 'Δoutcome',
]) {
  assert.ok(reentry.includes(`label: '${label}'`), `Canonical Reentry engine missing dimension ${label}.`);
  assert.ok(ui.includes(`'${label}'`), `Method Lab UI must render canonical Reentry dimension ${label}.`);
}
assert.match(ui, /payload\.comparison/);
assert.match(ui, /reentryExecution/);
assert.match(ui, /REPRODUCIBILITY_RECEIPT/);
assert.match(ui, /runtimeReceipt/);
assert.match(ui, /lineageRefs/);
assert.match(reentry, /REENTRY_NEVER_INHERITS_OBSERVED/);
assert.match(reentry, /authorityCeiling: 'RECOMMEND'/);

// Slice F metadata is visible but no external preregistration claim is fabricated.
assert.match(ui, /SLICE F PREREGISTRATION METADATA PREVIEW/);
assert.match(ui, /externalRegistrationClaim: false/);
assert.match(projection, /externalRegistrationClaim: false/);
assert.doesNotMatch(projection, /osf\.io|OSF registration exists|externalRegistrationClaim: true/i);

// No OBSERVED inheritance, CANON promotion, or Twin authority expansion.
assert.match(experimentContract, /METHOD_LAB_EXPERIMENT_SIMULATION_CANNOT_BECOME_OBSERVED/);
assert.match(experimentContract, /SIMULATION_NEVER_INHERITS_OBSERVED/);
assert.match(twinStateContract, /MODEL_CONTEXT_IS_NOT_TWIN_MEMORY/);
assert.match(twinStatePersistence, /canonicalMutation: false/);
assert.ok(twinContract.includes('authority') || twinContract.includes('Authority'), 'Canonical Cognitive Twin authority contract must remain present.');
assert.match(twinContract, /founderReservedActions/);
assert.match(twinContract, /'mutate_canon'/);
for (const source of [route, projection, execution, ui]) {
  assert.doesNotMatch(source, /canonicalMutation:\s*true|promotionAllowed:\s*true|EXECUTE_EXTERNAL|IRREVERSIBLE|\bCANON\b\s*:/, 'Slice E cannot expand canonical/external authority.');
}

// Persistence owner remains converged; no schema/migration ownership is introduced by Slice E.
assert.match(experimentPersistence, /\.from\('sfi_lab_analyses'\)/);
assert.match(execution, /\.from\('sfi_lab_analyses'\)/);
assert.match(projection, /\.from\('sfi_lab_analyses'\)/);
assert.doesNotMatch(projection, /create table|alter table|migration/i);
assert.doesNotMatch(execution, /create table|alter table|migration/i);

console.log('SFI-METHOD-LAB-UI-R4B PASS');
