import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path: string) => readFileSync(path, 'utf8');
const route = read('src/app/api/external/v1/studio/route.ts');
const production = read('src/lib/studio/material/productionLoop.ts');
const studioProduction = read('src/lib/studio/material/studioProductionLoop.ts');
const resolver = read('src/lib/studio/audio/acoustic/productionInstrumentResolver.ts');
const materializer = read('src/lib/studio/audio/acoustic/remotePackageMaterializer.ts');
const manifest = read('src/app/api/external/v1/manifest/route.ts');
const openapi = read('scripts/merge-openapi-studio-attachments.mjs');
const workflow = read('.github/workflows/sfi-audio-material-execution.yml');

for (const token of ["'produce'","return 'studio:run'","'VOICE_MUSICALIZE'","'MASTER_ADJUST'",'productionAuthorization','RIGHTS_TRANSFER=false','CANONICAL_PROMOTION=false']) assert.ok(route.includes(token), `studio_route_missing:${token}`);
assert.doesNotMatch(route, /studio:write/);

for (const token of ['executeSfzAcousticRender','resolveProductionInstrument','materializeRemoteAcousticPackage','NO_ARRANGEMENT_CHANGE_WITHOUT_EXPLICIT_STEMS_OR_PERFORMANCE',"cleanupState: 'FAIL'",'cleanupMaterialProductionWorkspace(workspace)']) assert.ok(production.includes(token), `production_missing:${token}`);
assert.doesNotMatch(production, /instrumentRegistry\.ts|\.\/instrumentRegistry|\.\/sfzAdapter/);

for (const token of [
  "from('sfi_instruments')",
  ".in('owner_id', ownerIds)",
  'SFI_FOUNDER_USER_IDS',
  'SYSTEM_ROOT_EMAIL',
  'SFI_FOUNDER_EMAILS',
  'SFI_AUDIO_CANONICAL_INSTRUMENT_OWNER_UNCONFIGURED',
  ".eq('current_execution_rights_state', 'ELIGIBLE')",
  ".eq('quality_state', 'PRODUCTION')",
  'DERIVATIVE_ALLOWED',
  'EXECUTION_ALLOWED',
]) assert.ok(resolver.includes(token), `resolver_missing:${token}`);
assert.doesNotMatch(resolver, /from\('sfi_instruments'\)[\s\S]*\.eq\('id', instrumentId\)(?![\s\S]*ownerIds)/, 'explicit_instrument_lookup_must_not_bypass_canonical_owner_boundary');
assert.doesNotMatch(resolver, /insert\(|update\(|delete\(/);

for (const token of ["url.hostname !== 'raw.githubusercontent.com'",'IMMUTABLE_REF_REQUIRED','git:${source.commit}',"'-ar', '48000'","'-c:a', 'pcm_s24le'",'publicAccessUsedAsRightsEvidence: false','SFI_ACOUSTIC_INSTRUMENT_PACKAGE_CONTRACT']) assert.ok(materializer.includes(token), `materializer_missing:${token}`);

const cleanupIndex = studioProduction.indexOf('cleanupMaterialProductionWorkspace(materialWorkspace)');
const prepareIndex = studioProduction.indexOf('const prepared = await prepareStudioSignedUpload');
assert.ok(cleanupIndex >= 0 && prepareIndex > cleanupIndex, 'cleanup_must_precede_durable_output');
for (const token of [
  'beforeObservation = await analyzeStudioAudioObject',
  'afterObservation = await analyzeStudioAudioObject',
  'PROCESSING_PERMISSION_ONLY_NOT_RIGHTS_TRANSFER',
  'PENDING_REOBSERVATION',
  'durable-output:studio:',
  'withdrawProducedObject',
  "update({ status: 'failed'",
  'STUDIO_OBJECT_BUCKET).remove',
  'MATERIAL_OUTPUT_WITHDRAWAL_FAILED',
  'rightsTransfer: false',
  'canonicalPromotion: false',
]) assert.ok(studioProduction.includes(token), `studio_production_missing:${token}`);
const completeIndex = studioProduction.indexOf('await completeStudioSignedUpload');
const afterObservationIndex = studioProduction.indexOf('const afterObservation = await analyzeStudioAudioObject');
const catchIndex = studioProduction.indexOf('} catch (error) {');
assert.ok(completeIndex >= 0 && afterObservationIndex > completeIndex && catchIndex > afterObservationIndex, 'post_publication_failures_must_flow_through_withdrawal');

for (const token of ["id: 'studio-produce'","contract: 'SFI-MATERIAL-AUDIO-RETURN-1.0'","productionInstrumentRegistry: 'public.sfi_instruments'",'realSampleSfzRequiredForVoiceMusicalize: true','midiUsedAsSoundSource: false']) assert.ok(manifest.includes(token), `manifest_missing:${token}`);
for (const token of ["'produce'","enum: ['VOICE_MUSICALIZE', 'MASTER_ADJUST']",'instrumentIds',"rightsAwareInstrumentRegistry: 'public.sfi_instruments'",'realSamplePackagesRequiredForMusicalize: true','midiIsSoundSource: false']) assert.ok(openapi.includes(token), `openapi_missing:${token}`);
assert.doesNotMatch(openapi, /studioRequest\.properties\.requireProductionInstruments\s*=/);
assert.doesNotMatch(openapi, /studioRequest\.properties\.performance\s*=/);
assert.match(workflow, /SFI-MATERIAL-PRODUCTION-REAL-1\.0/);
assert.match(workflow, /qa-sfi-material-production-real\.ts/);
for (const removed of ['src/lib/studio/material/instrumentRegistry.ts','src/lib/studio/material/sfzAdapter.ts','src/lib/studio/material/planner.ts','config/studio/instrument-bank.json']) assert.throws(() => readFileSync(removed, 'utf8'));

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-MATERIAL-AUDIO-PRODUCTION-GATE-1.0',
  modes:['VOICE_MUSICALIZE','MASTER_ADJUST'],
  canonicalInstrumentOwner:'CONFIGURED_FOUNDER_INSTRUMENT_BANK',
  canonicalRenderer:'executeSfzAcousticRender',
  scope:'studio:run',
  outputPublication:'WITHDRAW_ON_REOBSERVATION_OR_RETURN_FAILURE',
  rightsTransfer:false,
  canonicalPromotion:false,
  realNetworkSampleQa:true,
  duplicateOwners:0,
}, null, 2));
