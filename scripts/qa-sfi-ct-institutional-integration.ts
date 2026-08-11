import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path: string) {
  return fs.readFileSync(path, 'utf8');
}

const integration = read('src/lib/cognitive-twin/institutionalIntegration.ts');
const experience = read('src/lib/cognitive-twin/experienceBridge.ts');
const evidenceIngestion = read('src/lib/cognitive-twin/evidenceIngestion.ts');
const studioContext = read('src/lib/cognitive-twin/studioContext.ts');
const crl = read('src/lib/cognitive-lab/service.ts');
const field = read('src/lib/field/governedReturn.ts');
const methodLab = read('src/lib/method-lab/simulationRun.ts');
const deliberate = read('src/app/api/root/cognitive-twin/deliberate/route.ts');
const continuity = read('src/app/api/cron/continuity-report/route.ts');
const scheduledCycle = read('src/app/api/cron/sfi-institutional-cycle/route.ts');
const manualCycle = read('src/app/api/root/institutional-cycle/route.ts');
const state = read('src/lib/cognitive-twin/readState.ts');
const page = read('src/app/root/cognitive-twin/page.tsx');
const panel = read('src/components/root/cognitive-twin/CognitiveTwinIntegrationPanel.tsx');
const workflow = read('.github/workflows/sfi-ct-institutional-integration.yml');

for (const organ of ['ROOT_EVIDENCE','OBSERVATORY','STUDIO','METHOD_LAB','FIELD','GOVERNANCE','COGNITIVE_TWIN']) {
  assert.ok(integration.includes(`organ:'${organ}'`), `missing organ integration: ${organ}`);
}

assert.ok(integration.includes("case 'simulated': return 'SIMULATED'"), 'SIMULATED Method Lab mapping missing');
assert.ok(integration.includes("case 'real_input': return 'DERIVED_FROM_OBSERVED_INPUT'"), 'real_input must remain derived');
assert.ok(integration.includes("case 'provider_enriched': return 'DERIVED_FROM_PROVIDER_ENRICHED_INPUT'"), 'provider_enriched must remain derived');
assert.ok(integration.includes("case 'no_input': return 'MISSING_INPUT'"), 'no_input must never become observed');
assert.ok(integration.includes("default: return 'UNCLASSIFIED_NON_OBSERVED'"), 'unknown Method Lab modes must remain non-observed');
assert.equal(integration.includes("dataMode === 'SIMULATED' ? 'SIMULATED' : 'OBSERVED_RECORD'"), false, 'Method Lab must not promote every non-simulated mode to observed');
assert.ok(integration.includes(".order('created_at', { ascending: false })"), 'Method Lab sync must ingest newest rows first');

assert.ok(integration.includes("epistemicClass:'OBSERVED_RETURN'"), 'Field historical return ingestion missing');
assert.ok(integration.includes("import { persistCognitiveTwinExperience } from './experienceBridge'"), 'historical integration bypasses canonical experience bridge');
assert.equal(integration.includes("from('sfi_cognitive_twin_memory').upsert"), false, 'institutional integration must not create a second memory persistence path');
assert.ok(experience.includes("status: 'CANDIDATE'"), 'experience bridge must persist candidates only');
assert.ok(experience.includes('never expands authority automatically'), 'experience authority boundary missing');

for (const [name, source] of [
  ['ROOT Evidence', evidenceIngestion],
  ['Studio', studioContext],
  ['CRL', crl],
] as const) {
  assert.ok(source.includes('persistCognitiveTwinExperience'), `${name} must use the canonical experience bridge`);
  assert.equal(source.includes("from('sfi_cognitive_twin_memory').upsert"), false, `${name} must not directly upsert Twin memory`);
}

assert.ok(field.includes('persistCognitiveTwinExperience'), 'Field live return is not wired to Twin experience');
assert.ok(field.includes("epistemicClass:'OBSERVED_RETURN'"), 'Field return epistemic class missing');
assert.ok(field.includes('returnContrast:contrast'), 'Field contrast must travel into Twin experience');
assert.ok(methodLab.includes('persistCognitiveTwinExperience'), 'Method Lab live run is not wired to Twin experience');
assert.ok(methodLab.includes("epistemicClass:'SIMULATED'"), 'Method Lab simulation must remain SIMULATED in Twin');

assert.ok(deliberate.includes('syncSfiInstitutionalStateToCognitiveTwin'), 'Twin deliberation must refresh SFI state');
assert.ok(deliberate.includes('sfiIntegration: institutionalSync.integration'), 'Twin deliberation must receive organ map');
assert.ok(deliberate.includes('organ_unexercised:'), 'Twin deliberation must expose unexercised organs as missing evidence');

const syncIndex = continuity.indexOf('syncSfiInstitutionalStateToCognitiveTwin()');
const heartbeatIndex = continuity.indexOf('runCognitiveTwinDevelopmentalHeartbeat()');
assert.ok(syncIndex >= 0 && heartbeatIndex > syncIndex, 'institutional state must sync before CT-A01 heartbeat');
assert.ok(scheduledCycle.includes('runIntegratedInstitutionalCycle'), 'scheduled institutional cycle bypasses Twin integration');
assert.ok(manualCycle.includes('runIntegratedInstitutionalCycle'), 'manual institutional cycle bypasses Twin integration');

assert.ok(state.includes('readCognitiveTwinSfiIntegration'), 'ROOT Twin state does not expose organ integration');
assert.ok(state.includes('sfiOrgansConnected'), 'ROOT Twin state lacks connected truth field');
assert.ok(state.includes('sfiOrgansExercised'), 'ROOT Twin state lacks exercised truth field');
assert.ok(page.includes('CognitiveTwinIntegrationPanel'), 'ROOT Twin page does not show integration panel');
assert.ok(panel.includes('CONNECTED') && panel.includes('EXERCISED'), 'integration panel lacks truth labels');

assert.ok(workflow.includes('permissions:\n  contents: read'), 'CT integration workflow must explicitly minimize GITHUB_TOKEN permissions');

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-CT-INSTITUTIONAL-INTEGRATION-1.0',
  organs:7,
  canonicalExperienceBridge:true,
  canonicalIngress:['ROOT_EVIDENCE','STUDIO','CRL','METHOD_LAB','FIELD','OBSERVATORY_SYNC'],
  methodLabEpistemicBoundary:true,
  newestFirstSync:true,
  authority:['GOVERNANCE'],
  longitudinalSubject:'CT-A01',
}, null, 2));
