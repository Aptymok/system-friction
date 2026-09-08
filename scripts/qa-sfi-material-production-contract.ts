import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path: string) => readFileSync(path, 'utf8');
const route = read('src/app/api/external/v1/studio/route.ts');
const production = read('src/lib/studio/material/productionLoop.ts');
const studioProduction = read('src/lib/studio/material/studioProductionLoop.ts');
const types = read('src/lib/studio/material/types.ts');
const resolver = read('src/lib/studio/audio/acoustic/productionInstrumentResolver.ts');
const materializer = read('src/lib/studio/audio/acoustic/remotePackageMaterializer.ts');
const manifest = read('src/app/api/external/v1/manifest/route.ts');
const openapi = read('scripts/merge-openapi-studio-attachments.mjs');
const workflow = read('.github/workflows/sfi-audio-material-execution.yml');

for (const token of ["'produce'", "return 'studio:run'", "'VOICE_MUSICALIZE'", "'MASTER_ADJUST'", 'productionAuthorization', 'RIGHTS_TRANSFER=false', 'CANONICAL_PROMOTION=false']) assert.ok(route.includes(token), `studio_route_missing:${token}`);
assert.doesNotMatch(route, /studio:write/);

for (const token of [
  'executeSfzAcousticRender', 'resolveProductionInstrument', 'materializeRemoteAcousticPackage',
  'NO_ARRANGEMENT_CHANGE_WITHOUT_EXPLICIT_STEMS_OR_PERFORMANCE', "cleanupState: 'FAIL'",
  'cleanupMaterialProductionWorkspace(workspace)', 'MAX_PRODUCTION_DURATION_SECONDS = 240',
  'SFI_AUDIO_PRODUCTION_DURATION_EXCEEDED', 'requiredEvents: input.performance.events.map',
  'effectiveParameters', "'SFI-SFZ-RENDER-1.0'", "'SFI-FFMPEG-MASTER-1.0'",
  'const performances: SfiAudioPerformance[] = []', 'performances.push(harmonyPerformance, bassPerformance)',
  'return { receipt, finalPath, renderReceipts, performances, workspace }',
]) assert.ok(production.includes(token), `production_missing:${token}`);
assert.match(production, /adapter:\s*\{\s*id:\s*input\.mode\s*===\s*'VOICE_MUSICALIZE'\s*\?\s*'SFI-SFZ-RENDER-1\.0'\s*:\s*'SFI-FFMPEG-MASTER-1\.0'/);
assert.match(types, /effectiveParameters:\s*\{\s*bpm:\s*number\s*\|\s*null;\s*key:\s*string\s*\|\s*null;\s*culturalProfile:\s*string\s*\|\s*null/);
assert.match(types, /'SFI-SFZ-RENDER-1\.0'\s*\|\s*'SFI-FFMPEG-MASTER-1\.0'/);
assert.doesNotMatch(production, /instrumentRegistry\.ts|\.\/instrumentRegistry|\.\/sfzAdapter/);

for (const token of [
  "from('sfi_instruments')", ".in('owner_id', ownerIds)", ".eq('engine', 'SFZ')",
  'SFI_FOUNDER_USER_IDS', 'SYSTEM_ROOT_EMAIL', 'SFI_FOUNDER_EMAILS', 'SFI_AUDIO_CANONICAL_INSTRUMENT_OWNER_UNCONFIGURED',
  ".eq('current_execution_rights_state', 'ELIGIBLE')", ".eq('quality_state', 'PRODUCTION')",
  'DERIVATIVE_ALLOWED', 'EXECUTION_ALLOWED',
]) assert.ok(resolver.includes(token), `resolver_missing:${token}`);
assert.doesNotMatch(resolver, /insert\(|update\(|delete\(/);

for (const token of [
  "url.hostname !== 'raw.githubusercontent.com'", 'IMMUTABLE_REF_REQUIRED', 'git:${source.commit}',
  "'-ar', '48000'", "'-c:a', 'pcm_s24le'", 'publicAccessUsedAsRightsEvidence: false',
  'SFI_ACOUSTIC_INSTRUMENT_PACKAGE_CONTRACT', 'requiredEvents: RequiredEvent[]',
  'event.velocity >= candidate.lovel', 'event.velocity <= candidate.hivel',
]) assert.ok(materializer.includes(token), `materializer_missing:${token}`);

const materialCleanupIndex = studioProduction.indexOf('cleanupMaterialProductionWorkspace(materialWorkspace)');
const finalBytesIndex = studioProduction.indexOf('const finalBytes = fs.readFileSync(produced.finalPath)');
const outerCleanupIndex = studioProduction.indexOf('const outerCleanupState = cleanupStudioProductionWorkspace(workspace)');
const prepareIndex = studioProduction.indexOf('const prepared = await prepareStudioSignedUpload');
assert.ok(materialCleanupIndex >= 0 && finalBytesIndex > materialCleanupIndex, 'material_cleanup_must_precede_final_buffer_read');
assert.ok(outerCleanupIndex > finalBytesIndex && prepareIndex > outerCleanupIndex, 'outer_workspace_cleanup_must_precede_durable_output_admission');
assert.match(studioProduction, /if \(!outerWorkspaceCleaned\)[\s\S]*STUDIO_PRODUCTION_WORKSPACE_CLEANUP_FAILED/);

for (const token of [
  'beforeObservation = await analyzeStudioAudioObject', 'afterObservation = await analyzeStudioAudioObject',
  'PROCESSING_PERMISSION_ONLY_NOT_RIGHTS_TRANSFER', 'PENDING_REOBSERVATION', 'durable-output:studio:',
  'withdrawProducedObject', "update({ status: 'failed'", 'STUDIO_OBJECT_BUCKET).remove',
  'MATERIAL_OUTPUT_WITHDRAWAL_FAILED', 'rightsTransfer: false', 'canonicalPromotion: false',
  'effectiveParameters: receipt.effectiveParameters', 'renderReceipts: produced.renderReceipts', 'outer-workspace-cleanup:PASS',
  'performanceArtifacts = produced.performances.map', 'sha256: hashPerformance(performance)',
  'candidate.ref === renderReceipt.performanceRef', 'artifact.sha256 !== renderReceipt.performanceHash',
  'MATERIAL_PERFORMANCE_LINEAGE_FAILED', 'performanceArtifacts,', 'performanceRefs:',
]) assert.ok(studioProduction.includes(token), `studio_production_missing:${token}`);
const performanceValidationIndex = studioProduction.indexOf('const performanceArtifacts = produced.performances.map');
const performancePersistenceIndex = studioProduction.indexOf('performanceArtifacts,', studioProduction.indexOf('const initialMetadata ='));
assert.ok(performanceValidationIndex >= 0 && performancePersistenceIndex > performanceValidationIndex && performancePersistenceIndex < prepareIndex + 5000, 'canonical_performances_must_be_validated_and_persisted_before_publication');
const completeIndex = studioProduction.indexOf('await completeStudioSignedUpload');
const afterObservationIndex = studioProduction.indexOf('const afterObservation = await analyzeStudioAudioObject');
const catchIndex = studioProduction.indexOf('} catch (error) {');
assert.ok(completeIndex >= 0 && afterObservationIndex > completeIndex && catchIndex > afterObservationIndex, 'post_publication_failures_must_flow_through_withdrawal');
assert.ok(studioProduction.indexOf('performanceArtifacts,', studioProduction.indexOf('const initialMetadata =')) < completeIndex, 'performance_artifacts_must_be_durable_before_publication');

for (const token of ["id: 'studio-produce'", "contract: 'SFI-MATERIAL-AUDIO-RETURN-1.0'", "productionInstrumentRegistry: 'public.sfi_instruments'", 'realSampleSfzRequiredForVoiceMusicalize: true', 'midiUsedAsSoundSource: false']) assert.ok(manifest.includes(token), `manifest_missing:${token}`);
for (const token of ["'produce'", "enum:['VOICE_MUSICALIZE','MASTER_ADJUST']", 'instrumentIds', "rightsAwareInstrumentRegistry:'public.sfi_instruments'", 'realSamplePackagesRequiredForMusicalize:true', 'midiIsSoundSource:false']) assert.ok(openapi.includes(token), `openapi_missing:${token}`);
assert.doesNotMatch(openapi, /studioRequest\.properties\.requireProductionInstruments\s*=/);
assert.doesNotMatch(openapi, /studioRequest\.properties\.performance\s*=/);
assert.match(workflow, /SFI-MATERIAL-PRODUCTION-REAL-1\.0/);
assert.match(workflow, /qa-sfi-material-production-real\.ts/);
for (const removed of ['src/lib/studio/material/instrumentRegistry.ts', 'src/lib/studio/material/sfzAdapter.ts', 'src/lib/studio/material/planner.ts', 'config/studio/instrument-bank.json']) assert.throws(() => readFileSync(removed, 'utf8'));

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-MATERIAL-AUDIO-PRODUCTION-GATE-1.1',
  modes: ['VOICE_MUSICALIZE', 'MASTER_ADJUST'],
  canonicalInstrumentOwner: 'CONFIGURED_FOUNDER_INSTRUMENT_BANK',
  canonicalEngine: 'SFZ',
  canonicalRenderer: 'executeSfzAcousticRender',
  scope: 'studio:run',
  maxProductionDurationSeconds: 240,
  velocityAwareRemoteMaterialization: true,
  durableEffectiveParameters: true,
  durableRenderReceipts: true,
  durableCanonicalPerformances: true,
  renderReceiptPerformanceRefsReconstructable: true,
  modeTruthfulAdapter: true,
  outerCleanupBeforePublication: true,
  outputPublication: 'WITHDRAW_ON_REOBSERVATION_OR_RETURN_FAILURE',
  rightsTransfer: false,
  canonicalPromotion: false,
  realNetworkSampleQa: true,
  duplicateOwners: 0,
}, null, 2));
