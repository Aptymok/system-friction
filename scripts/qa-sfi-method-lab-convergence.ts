import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path: string) { return readFileSync(path, 'utf8'); }

const contracts = read('src/lib/method-lab/contracts.ts');
assert.match(contracts, /SFI-METHOD-LAB-RUN-1\.0/, 'Shared Method Lab contract version must remain explicit.');
assert.match(contracts, /epistemicClass: 'SIMULATED'/, 'Method Lab run contract must remain SIMULATED.');
assert.match(contracts, /promotionAllowed: false/, 'Method Lab runs must not self-promote.');

const registry = read('src/lib/method-lab/registry.ts');
for (const protocol of ['chronos_olympics', 'cognitive_relational_lab', 'ct_reentry', 'sociotechnical_simulation', 'economic_simulation']) {
  assert.ok(registry.includes(`id: '${protocol}'`), `Missing Method Lab protocol: ${protocol}`);
}

const readModel = read('src/lib/method-lab/readModel.ts');
assert.match(readModel, /ct_reentry: \(\) => Boolean\(COGNITIVE_TWIN_REENTRY\.subjectId/, 'CT reentry implementation gate must bind to the reintroduced longitudinal runtime.');
assert.match(readModel, /GATED means no Method Lab evaluation row has yet validated it/, 'Implemented CT reentry must remain explicitly distinct from validated operation.');
assert.match(readModel, /it does not mean individuation is demonstrated/, 'Method Lab must not promote reentry implementation into an individuation claim.');
assert.match(readModel, /CRL protocol-specific migration remains experimental/, 'CRL persistence governance conflict must remain visible.');
assert.match(readModel, /missingDependencies/, 'Protocol dependency health must be observable.');

const olympicsManifest = read('scripts/cognitive-olympics/lib/manifest.mjs');
assert.match(olympicsManifest, /METHOD_LAB_CONTRACT_VERSION = 'SFI-METHOD-LAB-RUN-1\.0'/, 'CHRONOS must bind to the shared Method Lab contract.');
assert.match(olympicsManifest, /METHOD_LAB_PROTOCOL_ID = 'chronos_olympics'/, 'CHRONOS protocol ID mismatch.');
assert.match(olympicsManifest, /epistemicClass: 'SIMULATED'/, 'CHRONOS output must remain SIMULATED.');
assert.match(olympicsManifest, /promotionAllowed: false/, 'CHRONOS must not self-promote.');

const crlContrast = read('src/app/api/root/cognitive-lab/sessions/[id]/contrast/route.ts');
assert.match(crlContrast, /mode: 'cognitive_relational_lab'/, 'CRL contrast must write a shared Method Lab summary.');
assert.match(crlContrast, /data_mode: 'SIMULATED'/, 'CRL contrast must remain SIMULATED.');
assert.match(crlContrast, /METHOD_LAB_CONTRACT_VERSION/, 'CRL summary must carry the shared Method Lab contract.');

const scenes = read('src/components/sfi/scenes.ts');
const liveUi = read('src/components/sfi/SfiConsole.tsx');
const rootWorkboard = read('src/app/api/root/workboard/route.ts');
assert.ok(scenes.includes("root:{key:'root'"), 'ROOT live scene must remain canonical.');
assert.ok(scenes.includes("governance:{key:'governance'"), 'GOVERNANCE live scene must remain canonical.');
assert.match(scenes, /LEGACY_INTERNAL_SCENES=.*'models','genai'/, 'MODELS and GENAI must remain explicitly absorbed legacy surfaces, not disappear silently.');
assert.match(rootWorkboard, /getLlmProviderStatus/, 'Converged ROOT workboard must preserve model/provider observability.');
assert.match(rootWorkboard, /providerHealthBoundary/, 'Converged ROOT workboard must preserve the configured-vs-healthy model boundary.');
assert.ok(liveUi.includes('COGNITIVE TWIN'), 'ROOT live scene must expose Twin proposals.');
assert.ok(liveUi.includes('ACEPTAR') && liveUi.includes('RECHAZAR'), 'ROOT live scene must retain governed decisions.');

const methodLabPage = read('src/app/method-lab/page.tsx');
const methodLabHub = read('src/components/sfi/MethodLabNativeHub.tsx');
assert.match(methodLabPage, /requireRootObserverPage\('\/method-lab'\)/, 'Method Lab native hub must remain ROOT protected.');
assert.match(methodLabPage, /readMethodLabState/, 'Method Lab native hub must read canonical protocol state.');
assert.match(methodLabPage, /readMethodLabEvidenceOptions/, 'Method Lab native hub must expose persisted evidence through a server-owned reader.');
assert.match(methodLabPage, /MethodLabNativeHub/, 'Method Lab declared execution surface must render its native hub.');
assert.doesNotMatch(methodLabPage, /createServiceSupabaseClient|\.from\(/, 'Method Lab page must not bypass interface persistence boundaries.');
for (const route of ['/api/root/method-lab/simulate','/api/root/cognitive-lab/sessions','/blind','/contrast','/events','/interact']) assert.ok(methodLabHub.includes(route), `method_lab_native_hub_missing_control:${route}`);
assert.ok(methodLabHub.includes('SIMULATED ≠ OBSERVED'), 'Method Lab native hub must state its epistemic boundary.');
assert.ok(methodLabHub.includes('FOUNDER_AUTHORIZATION no equivale a FOUNDER_ORIGINATED'), 'CRL provenance boundary must remain visible to ROOT.');
assert.ok(methodLabHub.includes('FOUNDER_MODEL'), 'Method Lab must retain explicit model-comparison conditions after MODELS scene absorption.');

const externalLab = read('src/app/api/external/v1/lab/route.ts');
assert.match(externalLab, /persistEventId\(commandId: string\)/, 'External Method Lab persist must derive a deterministic event id from commandId.');
assert.match(externalLab, /\.contains\('payload', \{ commandId \}\)/, 'External Method Lab persist must reread prior commandId records before appending.');
assert.match(externalLab, /idempotent: true/, 'External Method Lab persist must expose idempotent reuse explicitly.');
assert.match(externalLab, /eventId: commandId \? persistEventId\(commandId\) : undefined/, 'Database UNIQUE(event_id) must back commandId idempotency under races.');

const bridgeWorkflow = read('.github/workflows/sfi-github-lab-bridge.yml');
assert.match(bridgeWorkflow, /push:\s*\n\s*branches:\s*\n\s*- main\s*\n\s*paths:/, 'GitHub Method Lab write-triggered push must be restricted to main.');
assert.match(bridgeWorkflow, /pull_request:[\s\S]*\{"operation":"state"\}/, 'Pull-request bridge verification must remain read-only.');
assert.match(bridgeWorkflow, /https:\/\/www\.systemfriction\.org/, 'Authenticated bridge calls must normalize the known SFI canonical host before sending Authorization.');

const runner = read('src/lib/method-lab/simulationRun.ts');
assert.match(runner, /executeRegisteredAgent/, 'Method Lab simulations must use isolated registered executors rather than productive runtime event emission.');
assert.match(runner, /METHOD_LAB_SIMULATION_CONTAMINATED_EVIDENCE/, 'Method Lab must abort if a simulator mutates observed evidence.');
assert.match(runner, /sfi_lab_analyses/, 'Method Lab simulation summaries must persist in the shared lab ledger.');

const legacySimulation = read('src/app/api/root/simulation/route.ts');
assert.match(legacySimulation, /runMethodLabSimulation/, 'Legacy ROOT simulation route must delegate to Method Lab.');
assert.match(legacySimulation, /protocolId: 'sociotechnical_simulation'/, 'Legacy simulation adapter must resolve to the sociotechnical protocol.');

for (const path of [
  'src/lib/sfi/cognitive-runtime/agents/economicFieldSimulator.ts',
  'src/lib/sfi/cognitive-runtime/agents/frictionFieldSimulator.ts',
  'src/lib/sfi/cognitive-runtime/agents/crossImpact.ts',
  'src/lib/sfi/cognitive-runtime/agents/culturalFieldSimulator.ts',
  'src/lib/sfi/cognitive-runtime/agents/policyFieldSimulator.ts',
  'src/lib/sfi/cognitive-runtime/agents/psychologicalFieldSimulator.ts',
  'src/lib/sfi/cognitive-runtime/agents/multiStakeholderBootstrap.ts',
  'src/lib/sfi/cognitive-runtime/agents/entropyRedistribution.ts',
]) {
  const source = read(path);
  assert.doesNotMatch(source, /context\.evidence\.push\(/, `${path} must not append simulated output to observed evidence.`);
  assert.match(source, /epistemicClass: 'SIMULATED'/, `${path} must label its simulated output.`);
}

const vercel = JSON.parse(read('vercel.json')) as { crons?: Array<{ path?: string }> };
assert.equal(vercel.crons?.length, 7, 'Method Lab convergence must not add Vercel cron jobs.');
assert.equal(vercel.crons?.filter((item) => item.path === '/api/cron/continuity-report').length, 1, 'Existing continuity cron must remain singular.');

console.log(JSON.stringify({
  ok: true,
  invariants: [
    'one shared Method Lab contract',
    'CHRONOS and CRL are protocols, not parallel labs',
    'CT reentry implementation is distinct from Method Lab validation and individuation claims',
    'sociotechnical/economic runs use isolated executors',
    'simulators cannot append SIMULATED output to observed evidence',
    'ROOT/Governance remain canonical live navigation; MODELS/GENAI are explicitly absorbed while provider/model observability survives in the workboard',
    'Method Lab protocol controls use governed APIs and server-owned evidence readers rather than direct interface persistence',
    'GitHub Method Lab branch PRs are read-only; write-triggered pushes execute only on main',
    'external Method Lab persist is idempotent by commandId and database-unique deterministic event id',
    'no additional Vercel cron',
  ],
}, null, 2));
