#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path: string) => fs.readFileSync(path, 'utf8');
const universal = read('src/lib/sfi/universalSignalCycle.ts');
const cognitiveCycle = read('src/lib/sfi/cognitive-runtime/cognitiveCycle.ts');
const runtimeMaterializer = read('src/lib/institution/cognitiveSpineRuntimeMaterializer.ts');
const twinAdapter = read('src/lib/institution/cognitiveSpineTwinContextAdapter.ts');
const bootstrap = read('src/lib/sfi/cognitiveBootstrap.ts');
const additionalSources = read('src/lib/institution/cognitiveSpineAdditionalSources.ts');

assert.match(universal, /executeCognitiveCycle\(context\)/, 'Universal Signal must execute the canonical cognitive cycle');
assert.match(universal, /eventName: 'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED'/, 'Universal Signal must persist cognitive-cycle execution');
assert.match(universal, /lineage: lifecycleLineage/, 'Universal lifecycle must preserve intake lineage');
assert.match(universal, /readUniversalCycleHistory/, 'Universal cycle history must remain reconstructable from the epistemic ledger');

assert.match(cognitiveCycle, /materializeInstitutionalRuntimeCognitiveSpine/, 'cognitive cycle must hydrate from the institutional Cognitive Spine');
assert.match(cognitiveCycle, /cognitiveTwinContext: materialized\.cognitiveTwinContext/, 'cognitive cycle must consume the Twin context derived from the Spine');
assert.match(cognitiveCycle, /item\.source !== 'UniversalSignalGateway'/, 'Universal Signal evidence must remain identifiable inside the cognitive cycle');

assert.match(runtimeMaterializer, /buildBoundedTwinContextFromCognitiveSpine/, 'runtime materializer must derive bounded Twin context from the sealed Spine snapshot');
assert.match(runtimeMaterializer, /cognitiveTwinContext/, 'runtime materializer must return bounded Twin context');
assert.match(twinAdapter, /COGNITIVE_TWIN_CONTRACT_VERSION/, 'Twin adapter must bind the Cognitive Twin contract');
assert.match(twinAdapter, /visibleMemoryRefs/, 'Twin context must be bounded by Spine-visible memory refs');
assert.match(twinAdapter, /visibleDecisionRefs/, 'Twin context must be bounded by Spine-visible decision refs');

assert.match(bootstrap, /readUniversalOpenCycles\(20\)/, 'bootstrap must observe current open Universal cycles');
assert.match(bootstrap, /buildBoundedTwinContextFromCognitiveSpine/, 'bootstrap must build Twin context from the sealed Spine');
assert.match(bootstrap, /openUniversalCycles: openCycles\.universal/, 'bootstrap must expose current Universal cycle state with Twin context');

assert.match(additionalSources, /SFI_UNIVERSAL_LEARNING_PROMOTED/, 'only governed promoted Universal learning may enter the Cognitive Spine');
assert.doesNotMatch(additionalSources, /\.eq\('event_name', 'SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED'\)/, 'raw Universal structured results must not enter the Spine as learned Twin context');
assert.match(additionalSources, /lineage/, 'promoted Universal learning must preserve lineage into the Spine');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-WS02-UNIVERSAL-TWIN-LINEAGE-1.0',
  requirement: 'WS-02-001',
  universalCycleExecutesCognitiveRuntime: true,
  twinContextConsumedByCycle: true,
  universalLearningAdmission: 'ROOT_PROMOTED_ONLY',
  rawUniversalResultAdmission: false,
}));
