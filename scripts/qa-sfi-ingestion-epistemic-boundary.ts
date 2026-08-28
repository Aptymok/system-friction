import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { evaluateUniversalAnalysisSufficiency } from '../src/lib/sfi/epistemicSufficiency';

async function text(path: string) {
  return readFile(path, 'utf8');
}

async function main() {
  const referenceOnly = evaluateUniversalAnalysisSufficiency({
    signal: {
      kind: 'dataset',
      name: 'Reportes Mesa de Ayuda.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      assetRef: 'file_reference_only',
      extracted: {},
    },
    question: '¿Qué revela el dataset?',
  });
  assert.equal(referenceOnly.status, 'BLOCKED');
  assert.equal(referenceOnly.analysisStatus, 'BLOCKED_INSUFFICIENT_OBJECT_OBSERVATION');
  assert.deepEqual(referenceOnly.requiredCapabilities, ['DATASET.XLSX.PROFILE']);
  assert(referenceOnly.missingObservations.includes('MATERIAL_CONTENT_OR_EXTRACTION'));
  assert(referenceOnly.missingObservations.includes('SCHEMA_OR_FIELDS'));
  assert(referenceOnly.missingObservations.includes('ROW_OR_RECORD_COUNT'));

  const materiallyProfiled = evaluateUniversalAnalysisSufficiency({
    signal: {
      kind: 'dataset',
      name: 'Reportes Mesa de Ayuda.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      objectHash: 'a'.repeat(64),
      extracted: {
        schema: ['CODIGO', 'CREACION', 'FECHA CIERRE'],
        rowCount: 80017,
        analyzableRowCount: 79967,
        malformedRows: 50,
        profileRef: 'dataset-profile:test',
      },
    },
    question: '¿Qué revela el dataset?',
  });
  assert.equal(materiallyProfiled.status, 'READY');
  assert.equal(materiallyProfiled.materialObservation, 'PRESENT');
  assert.equal(materiallyProfiled.requiredCapabilities.length, 0);

  const [signalRoute, universalCycle, hydrator, legacyUpload, ticketRoute, finalizeRoute, profileResult, worker, profiler, vercel] = await Promise.all([
    text('src/app/api/external/v1/signal/route.ts'),
    text('src/lib/sfi/universalSignalCycle.ts'),
    text('src/lib/sfi/universalObservationHydrator.ts'),
    text('src/app/api/cases/[caseId]/sources/upload/route.ts'),
    text('src/app/api/cases/[caseId]/sources/upload-ticket/route.ts'),
    text('src/app/api/cases/[caseId]/sources/finalize-upload/route.ts'),
    text('src/app/api/cases/[caseId]/sources/profile-result/route.ts'),
    text('supabase/functions/sfi-dataset-profile/index.ts'),
    text('supabase/functions/sfi-dataset-profile/datasetProfile.ts'),
    text('vercel.json'),
  ]);

  assert(signalRoute.includes("error: 'insufficient_object_observation'"), 'Universal Signal must fail closed on insufficient material observation');
  assert(signalRoute.includes('hydrateUniversalCycleInput'), 'Universal Signal must attempt persisted observation hydration before sufficiency');
  assert(signalRoute.indexOf('hydrateUniversalCycleInput') < signalRoute.indexOf('evaluateUniversalAnalysisSufficiency(input)'), 'hydration must precede sufficiency evaluation');
  assert(signalRoute.indexOf("sufficiency.status === 'BLOCKED'") < signalRoute.indexOf('runUniversalCognitiveCycle(preparedInput'), 'sufficiency gate must execute before cognitive runtime');
  assert(hydrator.includes('SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED'), 'hydrator must recover external structured results');
  assert(hydrator.includes('SFI_DATASET_PROFILE_ADMITTED'), 'hydrator must recover admitted dataset profiles');
  assert(hydrator.includes(".eq('object_kind', 'OBSERVATION')"), 'hydrator must recover the full Case observation profile when available');

  assert(universalCycle.includes("selectionMode: requestedValid.length ? 'EXPLICIT' : 'AUTO_MINIMUM_RELEVANT'"), 'gateway must preserve MetaOrchestrator minimum-auto selection');
  assert(universalCycle.includes('requested: requestedValid'), 'gateway must not force all registered agents when none were requested');
  assert(!universalCycle.includes('requested: requestedValid.length ? requestedValid : available'), 'all-agent fallback must remain removed');

  assert(legacyUpload.includes('SFI_CASE_LEGACY_PROXY_MAX_BYTES'), 'legacy Vercel upload must be explicitly bounded');
  assert(legacyUpload.includes("error: 'SFI_SOURCE_DIRECT_UPLOAD_REQUIRED'"), 'large files must be redirected away from Vercel');
  assert(ticketRoute.includes('createSignedUploadUrl'), 'normal upload path must issue direct Storage access');
  assert(ticketRoute.includes('CONTROL_PLANE_ONLY'), 'ticket route must declare Vercel control-plane boundary');
  assert(!ticketRoute.includes('arrayBuffer()'), 'ticket route must never buffer raw bytes');
  assert(!finalizeRoute.includes('.download('), 'finalization must not redownload raw bytes through Vercel');
  assert(finalizeRoute.includes("epistemicBoundary: 'SOURCE_NOT_EVIDENCE'"), 'uploaded source must remain SOURCE, not evidence');

  assert(profileResult.includes('SFI_DATASET_PROFILE_ATTESTATION_INVALID'), 'SFI must verify trusted-worker attestation');
  assert(profileResult.includes("kind: 'OBSERVATION'"), 'dataset profile must enter Case as observation');
  assert(profileResult.includes("epistemicRole: 'RECORD'"), 'profile observation must not mint accepted evidence');
  assert(profileResult.includes("eventName: 'SFI_DATASET_PROFILE_ADMITTED'"), 'material profiling must enter the epistemic event ledger');
  assert(profileResult.includes('CONTROL_PLANE_ONLY'), 'profile admission must stay on Vercel control plane');

  assert(worker.includes("const BUCKET = 'field-evidence'"), 'dataset worker must process the same governed Storage object');
  assert(worker.includes("executionBoundary: 'DATA_PLANE_SUPABASE"), 'raw dataset processing must remain outside Vercel');
  assert(worker.includes('SFI_DATASET_CONTENT_HASH_MISMATCH'), 'material identity mismatch must fail closed');
  assert(worker.includes('HMAC-SHA256'), 'worker result must be attested before client transport');

  assert(profiler.includes('formulasEvaluated: false'), 'workbook formulas must never execute during profiling');
  assert(profiler.includes('macrosExecuted: false'), 'workbook macros must never execute during profiling');
  assert(profiler.includes('externalLinksFollowed: false'), 'workbook external links must never be followed');
  assert(profiler.includes('rawRowsReturned: false'), 'dataset worker must not return raw rows');
  assert(profiler.includes('piiDistributionSuppression: true'), 'dataset profiling must suppress sensitive distributions');

  const vercelConfig = JSON.parse(vercel) as { git?: { deploymentEnabled?: boolean } };
  assert.equal(vercelConfig.git?.deploymentEnabled, false, 'Git commits/PRs must not trigger Vercel deployments');

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-INGESTION-EPISTEMIC-BOUNDARY-1.1',
    datasetReferenceOnlyBlocked: true,
    materialProfileRequired: true,
    persistedObservationHydration: true,
    minimumAgentOrchestration: true,
    largeRawBytesBypassVercel: true,
    sourceNotEvidence: true,
    attestedProfilesOnly: true,
    rawDatasetProcessingPlane: 'SUPABASE',
    gitDeploymentsToVercel: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
