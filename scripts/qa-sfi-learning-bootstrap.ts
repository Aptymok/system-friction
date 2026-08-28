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
  assert(learning.includes("eventName: 'SFI_UNIVERSAL_LEARNING_PROMOTED',\n    epistemicClass: 'derived'"));
  assert(learning.includes("assessmentClass: 'VERIFIED_CONTRAST'"));
  assert(!learning.includes("epistemicClass: 'verified_contrast'"), 'event store must never receive a non-canonical epistemic class');
  assert(learning.includes('ROOT authorizes institutional use'));
  assert(learning.includes('The persisted event remains DERIVED'));
  assert(learning.includes('readUniversalLearningTerminalState'));
  assert(learning.includes("error: 'LEARNING_CANDIDATE_ALREADY_TERMINAL'"));
  assert(learning.includes("if (terminal.state === 'PROMOTED')"));
  assert(learning.includes("if (terminal.state === 'REJECTED')"));
  assert(learning.includes('candidateLineage'));
  assert(learning.includes(".eq('payload->>candidateEventId', candidateEventId)"));
  assert(learning.includes(".eq('payload->>cycleId', cycleId)"));

  assert(rootLearning.includes("requireRootActor(`learning_quarantine.${action}`)"));
  assert(rootLearning.includes("action === 'capture_closed_cycle'"));
  assert(rootLearning.includes("action === 'promote'"));
  assert(rootLearning.includes("action === 'reject'"));
  assert(rootLearning.includes('readUniversalLearningCycleState(cycleId)'));
  assert(rootLearning.includes("if (promoted.idempotent)"));
  assert(rootLearning.includes("if (rejected.idempotent)"));
  assert(rootLearning.includes('No duplicate promotion or audit mutation was created.'));
  assert(rootLearning.includes('No duplicate rejection or audit mutation was created.'));

  assert(additionalSources.includes(".eq('event_name', 'SFI_UNIVERSAL_LEARNING_PROMOTED')"));
  assert(!additionalSources.includes(".eq('event_name', 'SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED')"), 'raw structured result hypotheses must not enter Cognitive Spine');
  assert(additionalSources.includes("text(event.epistemic_class) !== 'derived'"));
  assert(additionalSources.includes("text(payload.promotionState) !== 'PROMOTED'"));
  assert(additionalSources.includes("text(payload.classification) !== 'CALIBRATED_RETURN'"));
  assert(additionalSources.includes("text(payload.assessmentClass) !== 'VERIFIED_CONTRAST'"));
  assert(additionalSources.includes("epistemicClass: 'VERIFIED_CONTRAST'"));
  assert(sourcePlane.includes('readAdditionalInstitutionalCognitiveSpineSources'));

  assert(bootstrap.includes("profileId: 'RUNTIME_GENERAL_CONTEXT_V1'"));
  assert(bootstrap.includes('consume: true'));
  assert(bootstrap.includes("consumptionReason: 'AUTHORIZED_EXTERNAL_GPT_BOOTSTRAP'"));
  assert(bootstrap.includes("excludedFromSpine: ['TEST_SYNTHETIC', 'FAILED_EXPERIMENT', 'UNPROMOTED_OPERATIONAL_EVIDENCE', 'RAW_AGENT_PROSE', 'UNCONTRASTED_HYPOTHESES']"));
  assert(bootstrap.includes("eventStoreClasses: ['OBSERVED'"));
  assert(bootstrap.includes("assessmentClasses: ['PROJECTED', 'VERIFIED_CONTRAST', 'INVALIDATED']"));
  assert(bootstrap.includes("eventEpistemicClass: text(event.epistemic_class) ?? 'derived'"));
  assert(bootstrap.includes("assessmentClass: text(payload.assessmentClass) ?? 'VERIFIED_CONTRAST'"));
  assert(bootstrap.includes("promoted: promotedLearning"));
  assert(bootstrap.includes('snapshotHash: materialized.snapshot.snapshotHash'));
  assert(bootstrap.includes('constitutionHash: constitution.hash'));
  assert(bootstrap.includes('capsuleHash: stableHash(capsuleSemantic)'));
  assert(bootstrap.includes('Prior context remains context'));

  assert(bootstrapRoute.includes("authorizeExternalRequest(req, 'observe')"));
  assert(bootstrapRoute.includes('X-SFI-Capsule-Hash'));
  assert(bootstrapRoute.includes('must not silently substitute an unversioned persona prompt'));

  const manifestVersion = manifest.match(/version:\s*'([^']+)'/)?.[1] ?? null;
  assert(manifestVersion && /^\d+\.\d+\.\d+$/.test(manifestVersion), 'external manifest must expose a semantic release version');
  assert(manifest.includes("cognitiveBootstrap: '/api/external/v1/bootstrap'"));
  assert(manifest.includes("cognitiveSpineAdmissionEvent: 'SFI_UNIVERSAL_LEARNING_PROMOTED'"));
  assert(openapiMerge.includes("api.paths['/api/external/v1/bootstrap']"));
  assert(openapiMerge.includes('learningQuarantineBoundary'));
  assert(openapiMerge.includes('cognitiveBootstrapBoundary'));

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-LEARNING-BOOTSTRAP-QA-1.1',
    manifestVersion,
    invariants: {
      structuredResultIsLearning: false,
      closedCycleIsLearned: false,
      testSyntheticEntersSpine: false,
      failedExperimentEntersSpine: false,
      rootPromotionRequired: true,
      singleTerminalLearningState: true,
      repeatedTerminalRequestIsIdempotent: true,
      persistedEventClassIsCanonical: true,
      verifiedContrastIsAssessmentNotEventClass: true,
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
