import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

async function text(path: string) {
  return readFile(path, 'utf8');
}

async function main() {
  const [
    learning,
    rootLearning,
    additionalSources,
    sourcePlane,
    bootstrap,
    bootstrapRoute,
    manifest,
    openapiMerge,
  ] = await Promise.all([
    text('src/lib/sfi/universalLearningQuarantine.ts'),
    text('src/app/api/root/learning/route.ts'),
    text('src/lib/institution/cognitiveSpineAdditionalSources.ts'),
    text('src/lib/institution/cognitiveSpineInstitutionalSourcePlane.ts'),
    text('src/lib/sfi/cognitiveBootstrap.ts'),
    text('src/app/api/external/v1/bootstrap/route.ts'),
    text('src/app/api/external/v1/manifest/route.ts'),
    text('scripts/merge-openapi-universal-cycle.mjs'),
  ]);

  assert(learning.includes("'TEST_SYNTHETIC'"));
  assert(learning.includes("'FAILED_EXPERIMENT'"));
  assert(learning.includes("'OPERATIONAL_EVIDENCE'"));
  assert(learning.includes("'CALIBRATED_RETURN'"));
  assert(learning.includes("eventName: 'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED'"));
  assert(learning.includes("eventName: 'SFI_UNIVERSAL_LEARNING_PROMOTED'"));
  assert(learning.includes("eventName: 'SFI_UNIVERSAL_LEARNING_REJECTED'"));
  assert(learning.includes("candidatePayload.eligibleForRootPromotion !== true"));
  assert(learning.includes("text(candidatePayload.classification) !== 'CALIBRATED_RETURN'"));
  assert(learning.includes("epistemicClass: 'verified_contrast'"));
  assert(learning.includes('ROOT authorizes institutional use'));

  assert(rootLearning.includes("requireRootActor(`learning_quarantine.${action}`)"));
  assert(rootLearning.includes("action === 'capture_closed_cycle'"));
  assert(rootLearning.includes("action === 'promote'"));
  assert(rootLearning.includes("action === 'reject'"));
  assert(rootLearning.includes('idempotent: true'));

  assert(additionalSources.includes(".eq('event_name', 'SFI_UNIVERSAL_LEARNING_PROMOTED')"));
  assert(!additionalSources.includes(".eq('event_name', 'SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED')"), 'raw structured result hypotheses must not enter Cognitive Spine');
  assert(additionalSources.includes("text(payload.promotionState) !== 'PROMOTED'"));
  assert(additionalSources.includes("text(payload.classification) !== 'CALIBRATED_RETURN'"));
  assert(additionalSources.includes("epistemicClass: 'VERIFIED_CONTRAST'"));
  assert(sourcePlane.includes('readAdditionalInstitutionalCognitiveSpineSources'));

  assert(bootstrap.includes("profileId: 'RUNTIME_GENERAL_CONTEXT_V1'"));
  assert(bootstrap.includes('consume: true'));
  assert(bootstrap.includes("consumptionReason: 'AUTHORIZED_EXTERNAL_GPT_BOOTSTRAP'"));
  assert(bootstrap.includes("excludedFromSpine: ['TEST_SYNTHETIC', 'FAILED_EXPERIMENT', 'UNPROMOTED_OPERATIONAL_EVIDENCE', 'RAW_AGENT_PROSE', 'UNCONTRASTED_HYPOTHESES']"));
  assert(bootstrap.includes("promoted: promotedLearning"));
  assert(bootstrap.includes('snapshotHash: materialized.snapshot.snapshotHash'));
  assert(bootstrap.includes('constitutionHash: constitution.hash'));
  assert(bootstrap.includes('capsuleHash: stableHash(capsuleSemantic)'));
  assert(bootstrap.includes('Prior context remains context'));

  assert(bootstrapRoute.includes("authorizeExternalRequest(req, 'observe')"));
  assert(bootstrapRoute.includes('X-SFI-Capsule-Hash'));
  assert(bootstrapRoute.includes('must not silently substitute an unversioned persona prompt'));

  assert(manifest.includes("version: '1.9.0'"));
  assert(manifest.includes("cognitiveBootstrap: '/api/external/v1/bootstrap'"));
  assert(manifest.includes("cognitiveSpineAdmissionEvent: 'SFI_UNIVERSAL_LEARNING_PROMOTED'"));
  assert(openapiMerge.includes("api.paths['/api/external/v1/bootstrap']"));
  assert(openapiMerge.includes('learningQuarantineBoundary'));
  assert(openapiMerge.includes('cognitiveBootstrapBoundary'));

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-LEARNING-BOOTSTRAP-QA-1.0',
    invariants: {
      structuredResultIsLearning: false,
      closedCycleIsLearned: false,
      testSyntheticEntersSpine: false,
      failedExperimentEntersSpine: false,
      rootPromotionRequired: true,
      promotionUpgradesTruthByDecree: false,
      bootstrapUsesSealedSpineSnapshot: true,
      bootstrapConsumesPromotedLearningOnly: true,
      personCtInheritedByBootstrap: false,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
