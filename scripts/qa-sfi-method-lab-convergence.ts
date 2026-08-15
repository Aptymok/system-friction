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

const root = read('src/components/root/sovereign/RootSovereignConsole.tsx');
assert.match(root, /href="\/method-lab"/, 'ROOT must expose the canonical Method Lab surface.');
assert.match(root, /href="\/root\/cognitive-twin"/, 'ROOT must expose the canonical CT-A01 lineage surface.');
assert.doesNotMatch(root, /CognitiveLabConsole/, 'CRL must not keep a parallel ROOT launcher outside Method Lab.');

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
    'no additional Vercel cron',
  ],
}, null, 2));
