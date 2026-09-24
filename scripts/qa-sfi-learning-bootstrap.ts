import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

async function text(path: string) {
  return readFile(path, 'utf8');
}

async function main() {
  const [
    learning,
    closure,
    rootLearning,
    additionalSources,
    sourcePlane,
    bootstrap,
    bootstrapRoute,
    manifest,
    openapiMerge,
    worldHypotheses,
    worldCalibration,
    worldCron,
    worldReobserve,
    worldBootstrap,
  ] = await Promise.all([
    text('src/lib/sfi/universalLearningQuarantine.ts'),
    text('src/lib/sfi/universalClosure.ts'),
    text('src/app/api/root/learning/route.ts'),
    text('src/lib/institution/cognitiveSpineAdditionalSources.ts'),
    text('src/lib/institution/cognitiveSpineInstitutionalSourcePlane.ts'),
    text('src/lib/sfi/cognitiveBootstrap.ts'),
    text('src/app/api/external/v1/bootstrap/route.ts'),
    text('src/app/api/external/v1/manifest/route.ts'),
    text('scripts/merge-openapi-universal-cycle.mjs'),
    text('src/lib/world-observatory/hypothesisCycle.ts'),
    text('src/lib/world-observatory/hypothesisCalibration.ts'),
    text('src/app/api/cron/world-observatory/route.ts'),
    text('src/app/api/field/map/world/reobserve/route.ts'),
    text('src/app/api/field/map/world/bootstrap.ts'),
  ]);

  assert(learning.includes("SFI-UNIVERSAL-LEARNING-QUARANTINE-1.1"));
  assert(learning.includes("'TEST_SYNTHETIC'"));
  assert(learning.includes("'FAILED_EXPERIMENT'"));
  assert(learning.includes("'OPERATIONAL_EVIDENCE'"));
  assert(learning.includes("'CALIBRATED_RETURN'"));
  assert(learning.includes("eventName: 'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED'"));
  assert(learning.includes("eventName: 'SFI_UNIVERSAL_LEARNING_PROMOTED'"));
  assert(learning.includes("eventName: 'SFI_UNIVERSAL_LEARNING_REJECTED'"));

  // World hypotheses must preregister a discriminating test contract before observing RETURN.
  assert(worldHypotheses.includes("SFI-HYPOTHESIS-TEST-1.0"), 'world_hypothesis_test_contract_missing');
  assert(worldHypotheses.includes('testContract'), 'world_hypothesis_test_contract_not_persisted');
  assert(worldHypotheses.includes('minimumEvidenceCount'), 'world_hypothesis_minimum_evidence_missing');
  assert(worldHypotheses.includes('minimumSourceFamilies'), 'world_hypothesis_source_diversity_missing');
  assert(worldHypotheses.includes('expectedCriteria'), 'world_hypothesis_expected_criteria_missing');
  assert(worldHypotheses.includes('contradictionCriteria'), 'world_hypothesis_contradiction_criteria_missing');
  assert(worldHypotheses.includes('horizonBasis'), 'world_hypothesis_horizon_basis_missing');
  assert(!worldHypotheses.includes('Math.min(720'), 'world_hypothesis_horizon_must_not_be_silently_truncated');

  // The model may assess criterion evidence, but deterministic code owns final classification.
  // Calibration owns the observed coverage inputs; the deterministic test contract owns the preregistered minima.
  assert(worldCalibration.includes('classifyHypothesisTestContract'), 'world_hypothesis_deterministic_classifier_missing');
  assert(worldCalibration.includes('criterionResults'), 'world_hypothesis_criterion_results_missing');
  assert(worldCalibration.includes("classification === 'VALIDATED' || classification === 'CONTRADICTED'"), 'world_learning_must_require_decisive_outcome');
  assert(worldCalibration.includes('linkedSourceFamilies'), 'world_calibration_source_diversity_gate_missing');
  assert(worldCalibration.includes('linkedEvidenceCount'), 'world_calibration_evidence_count_gate_missing');
  assert(worldCalibration.includes('buildLegacyFrozenSignals'), 'legacy_frozen_signal_builder_missing');
  assert(worldCalibration.includes('classifyLegacyFrozenSignals'), 'legacy_frozen_signal_classifier_missing');
  assert(worldCalibration.includes('LEGACY_FROZEN_SIGNAL_ADJUDICATION'), 'legacy_frozen_signal_outcome_marker_missing');
  assert(worldCalibration.includes('Legacy adjudication never writes world_learning_events'), 'legacy_adjudication_must_not_write_learning');
  assert(!worldCalibration.includes('LEGACY_HYPOTHESIS_WITHOUT_PREREGISTERED_TEST_CONTRACT'), 'legacy_hypotheses_must_not_be_auto_closed_only_for_missing_test_contract');
  assert(!worldCalibration.includes('"classification":"VALIDATED|PARTIALLY_VALIDATED|CONTRADICTED|INCONCLUSIVE"'), 'model_must_not_own_final_hypothesis_classification');
  for (const liveCaller of [worldCron, worldReobserve, worldBootstrap]) {
    assert(liveCaller.includes("@/lib/world-observatory/hypothesisCalibration"), 'live_world_surface_not_using_strict_calibration_owner');
  }

  // CALIBRATED_RETURN is evidence-complete and must derive from canonical persisted contrast.
  assert(learning.includes('calibratedReturnEligibility'));
  assert(learning.includes("text(contrast.calibrationStatus) !== 'CONTRAST_RECORDED'"));
  assert(learning.includes("text(contrast.classification) === 'INCONCLUSIVE'"));
  assert(learning.includes("reason: 'PREDICTION_MISSING'"));
  assert(learning.includes("reason: 'DISCRIMINATING_SIGNALS_MISSING'"));
  assert(learning.includes("reason: 'RETURN_EVIDENCE_UNLINKED'"));
  assert(learning.includes("reason: 'RETURN_EVIDENCE_UNVERIFIED'"));
  assert(learning.includes("text(contrast.returnTraceability) !== 'VERIFIED_EVIDENCE_LINKED'"));
  assert(learning.includes("reason: 'UPDATED_CONFIDENCE_MISSING'"));
  assert(learning.includes("reason: 'EVIDENCE_COMPLETE_CALIBRATED_RETURN'"));
  assert(learning.includes("if (explicit === 'CALIBRATED_RETURN') return hasCalibratedReturn(history) ? 'CALIBRATED_RETURN' : 'OPERATIONAL_EVIDENCE'"));
  assert(learning.includes("eligibleForRootPromotion: promotionState === 'ELIGIBLE_FOR_ROOT_PROMOTION' && eligibility.eligible"));
  assert(learning.includes('contrast: latestContrast ? latestContrastPayload : null'));
  assert(learning.includes('contrastNarrative: closure.contrast ?? null'));
  assert(!learning.includes('contrast: closure.contrast ??'), 'closure narrative must never replace canonical contrast');
  assert(learning.includes('persistedCandidateEvidenceEligible'));
  assert(learning.includes("text(candidatePayload.eligibilityBasis) === 'EVIDENCE_COMPLETE_CALIBRATED_RETURN'"));
  assert(learning.includes("text(contrast.calibrationStatus) === 'CONTRAST_RECORDED'"));
  assert(learning.includes("text(contrast.classification) !== 'INCONCLUSIVE'"));
  assert(learning.includes("text(contrast.returnTraceability) === 'VERIFIED_EVIDENCE_LINKED'"));
  assert(learning.includes('strings(contrast.returnEvidenceRefs).length > 0'));
  assert(learning.includes('strings(contrast.expectedSignals).length > 0'));
  assert(learning.includes('strings(contrast.contradictionSignals).length > 0'));
  assert(learning.includes('Number.isFinite(Number(contrast.updatedConfidence))'));
  assert(learning.includes("error: 'LEARNING_CANDIDATE_NOT_ELIGIBLE_FOR_PROMOTION'"));

  // Empirical closure cannot be satisfied by request-scoped RETURN/contrast substitutes.
  assert(closure.includes("const empirical = klass !== 'DESCRIPTIVE_DELIMITED'"));
  assert(closure.includes('const observedReturn = empirical ? returnPayload.outcome ?? null'));
  assert(closure.includes('const contrast = empirical ? (lastContrast ? lastContrastPayload : null)'));
  assert(closure.includes("if (!lastReturn || !observedReturn) missing.push('OBSERVED_RETURN')"));
  assert(closure.includes("if (!lastContrast || !contrast) missing.push('CONTRAST')"));
  assert(closure.includes("if (!lastContrast || lastContrastPayload.calibrationStatus !== 'CONTRAST_RECORDED') missing.push('CALIBRATED_CONTRAST')"));
  assert(closure.includes('validateReturnEvidenceRefs'));
  assert(closure.includes("RETURN_EVIDENCE_CLASSES = new Set(['observed', 'imported', 'extracted', 'canonical'])"));
  assert(closure.includes("eventTenant === input.tenantId"));
  assert(closure.includes("eventCycle === input.cycleId"));
  assert(closure.includes("'RETURN_EVIDENCE_UNVERIFIED'"));
  assert(closure.includes("returnTraceability: traceableReturn ? 'VERIFIED_EVIDENCE_LINKED'"));
  assert(closure.includes('lineage: [returnEventId, ...returnEvidenceRefs].filter(Boolean)'));

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
  assert(bootstrap.includes('do not treat prior institutional context as a new observation'));
  assert(bootstrap.includes('does not create evidence'));
  assert(bootstrap.includes('convert institutional memory into present-tense observation'));

  assert(bootstrapRoute.includes("authorizeExternalRequest(req, 'observe')"));
  assert(bootstrapRoute.includes('X-SFI-Capsule-Hash'));
  assert(bootstrapRoute.includes("error: 'sfi_cognitive_bootstrap_failed'"));
  assert(bootstrapRoute.includes("instruction: 'Do not silently substitute an unversioned persona prompt."));
  assert(bootstrapRoute.includes('retry the governed bootstrap surface when available'));
  assert(bootstrapRoute.includes('{ status: 503 }'));

  const manifestVersion = manifest.match(/version:\s*'([^']+)'/)?.[1] ?? null;
  assert(manifestVersion && /^\d+\.\d+\.\d+$/.test(manifestVersion), 'external manifest must expose a semantic release version');
  assert(manifest.includes("cognitiveBootstrap: '/api/external/v1/bootstrap'"));
  assert(manifest.includes("cognitiveSpineAdmissionEvent: 'SFI_UNIVERSAL_LEARNING_PROMOTED'"));
  assert(openapiMerge.includes("api.paths['/api/external/v1/bootstrap']"));
  assert(openapiMerge.includes('learningQuarantineBoundary'));
  assert(openapiMerge.includes('cognitiveBootstrapBoundary'));

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-LEARNING-BOOTSTRAP-QA-1.6',
    manifestVersion,
    invariants: {
      calibratedReturnCannotBeForced: true,
      closureRequestCannotForgeCalibration: true,
      returnEvidenceRefsMustResolveInTenantCycle: true,
      closureNarrativeCannotReplaceCanonicalContrast: true,
      unlinkedReturnEligibleForLearning: false,
      discriminatingSignalsRequired: true,
      worldHypothesesPreregisterThresholds: true,
      worldHypothesisHorizonNotSilentlyTruncated: true,
      modelCannotOwnFinalWorldClassification: true,
      decisiveWorldOutcomeRequiredForLearning: true,
      strictCalibrationOwnsLiveWorldSurfaces: true,
      legacyHypothesesUseFrozenSignalAdjudication: true,
      legacyHypothesesCannotCreateLearningEvents: true,
      promotionRechecksPersistedCalibration: true,
      rootPromotionRequired: true,
      singleTerminalLearningState: true,
      persistedEventClassIsCanonical: true,
      verifiedContrastIsAssessmentNotEventClass: true,
      promotionUpgradesTruthByDecree: false,
      bootstrapUsesSealedSpineSnapshot: true,
      bootstrapConsumesPromotedLearningOnly: true,
      priorContextIsNewObservation: false,
      bootstrapFailureFailsClosed: true,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
