import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { resolveUniversalCaseIntake, resolveCasePlatformCreationIntake } from '../src/lib/sfi/caseIntakeResolver';
import { evaluateUniversalAnalysisSufficiency } from '../src/lib/sfi/epistemicSufficiency';

async function text(path: string) {
  return readFile(path, 'utf8');
}

function gitDeploymentsDisabled(value: unknown) {
  if (value === false) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const policy = value as Record<string, unknown>;
  return policy['*'] === false && Object.values(policy).every((branchPolicy) => branchPolicy === false);
}

async function main() {
  const descriptive = resolveUniversalCaseIntake({
    signal: { kind: 'dataset', name: 'Mesa de Ayuda.xlsx' },
    question: '¿Qué patrones operativos contiene este dataset?',
    declaredFunction: 'dataset operativo interno que debe ser observado',
    context: { dataHandling: 'private-reference-only' },
  });
  assert.equal(descriptive.caseClass, 'DESCRIPTIVE');
  assert.equal(descriptive.blockingQuestions.length, 0, 'resolved descriptive intake must not force irrelevant questions');
  assert.equal(descriptive.readyForObservation, true);

  const decision = resolveUniversalCaseIntake({
    signal: { kind: 'dataset', name: 'Mesa de Ayuda.xlsx' },
    question: '¿Qué intervención debemos implementar para reducir recurrencia?',
    declaredFunction: 'operational decision source',
    context: { dataHandling: 'private-reference-only' },
  });
  assert(['DECISION', 'INTERVENTION'].includes(decision.caseClass));
  assert.equal(decision.blockingQuestions.length, 0, 'observation must not be blocked by context SFI can infer after inspecting the object');
  assert(decision.questions.some((item) => item.key === 'SYSTEM_BOUNDARY' && item.blocking === false));
  assert(decision.questions.some((item) => item.key === 'OUTCOME_CRITERIA' && item.blocking === false));
  assert.equal(decision.readyForObservation, true);

  const missingIntent = resolveUniversalCaseIntake({ signal: { kind: 'document', name: 'unknown.pdf' } });
  assert(missingIntent.blockingQuestions.some((item) => item.key === 'INTENT'), 'intent remains the only universal pre-observation blocker');

  const referenceOnlyImage = evaluateUniversalAnalysisSufficiency({
    signal: { kind: 'image', name: 'photo.png', objectHash: 'a'.repeat(64), assetRef: 'storage://private/photo.png' },
    question: '¿Qué contiene?',
  });
  assert.equal(referenceOnlyImage.status, 'BLOCKED');
  assert(referenceOnlyImage.missingObservations.includes('MATERIAL_CONTENT_OR_EXTRACTION'));

  const extractedImage = evaluateUniversalAnalysisSufficiency({
    signal: { kind: 'image', name: 'photo.png', extracted: { description: 'A service desk screenshot', entities: ['ticket queue'] } },
    question: '¿Qué contiene?',
  });
  assert.equal(extractedImage.status, 'READY');

  const referenceOnlyDataset = evaluateUniversalAnalysisSufficiency({
    signal: { kind: 'dataset', name: 'Mesa de Ayuda.xlsx', objectHash: 'b'.repeat(64) },
    question: '¿Qué patrones contiene?',
  });
  assert.equal(referenceOnlyDataset.status, 'BLOCKED');
  assert(referenceOnlyDataset.missingObservations.includes('SCHEMA_OR_FIELDS'));
  assert(referenceOnlyDataset.missingObservations.includes('ROW_OR_RECORD_COUNT'));

  const materialDataset = evaluateUniversalAnalysisSufficiency({
    signal: { kind: 'dataset', name: 'Mesa de Ayuda.xlsx', extracted: { headers: ['CÓDIGO', 'CREACIÓN'], rowCount: 80017 } },
    question: '¿Qué patrones contiene?',
  });
  assert.equal(materialDataset.status, 'READY');

  const caseCreate = resolveCasePlatformCreationIntake({
    serviceProfileId: 'SERVICE_OBSERVABILITY',
    subject: 'HELP_DESK',
    scope: 'Operational recurrence',
    systemBoundaryRef: { id: 'system:help-desk' },
    temporalWindow: { cutoff: '2026-08-28T00:00:00Z' },
  });
  assert.equal(caseCreate.readyForCreate, true);
  assert.equal(caseCreate.questions.length, 0);

  const [signalRoute, casesRoute, cycle, automationSelector, hydrator, evidenceResolver, synthesis, closure, profiler, vercel] = await Promise.all([
    text('src/app/api/external/v1/signal/route.ts'),
    text('src/app/api/external/v1/cases/route.ts'),
    text('src/lib/sfi/universalSignalCycle.ts'),
    text('src/lib/sfi/cognitive-runtime/automationSelector.ts'),
    text('src/lib/sfi/universalObservationHydrator.ts'),
    text('src/lib/sfi/evidenceRequirementResolver.ts'),
    text('src/lib/sfi/universalAiSynthesis.ts'),
    text('src/lib/sfi/universalClosure.ts'),
    text('supabase/functions/sfi-dataset-profile/datasetProfile.ts'),
    text('vercel.json'),
  ]);

  const hydrationIndex = signalRoute.indexOf('hydrateUniversalCycleInput(rawInput, tenantId)');
  const sufficiencyIndex = signalRoute.indexOf('evaluateUniversalAnalysisSufficiency(input)');
  const webIndex = signalRoute.indexOf('acquireUniversalWebEvidence(input');
  const runtimeIndex = signalRoute.indexOf('runUniversalCognitiveCycle(preparedInput');
  const synthesisIndex = signalRoute.indexOf('await synthesizeUniversalCycleWithAi({');
  assert(hydrationIndex >= 0 && hydrationIndex < sufficiencyIndex, 'material hydration must precede sufficiency');
  assert(sufficiencyIndex >= 0 && sufficiencyIndex < webIndex, 'object sufficiency must precede external evidence acquisition');
  assert(webIndex >= 0 && webIndex < runtimeIndex, 'required web evidence must be acquired before cognitive execution');
  assert(runtimeIndex >= 0 && runtimeIndex < synthesisIndex, 'AI synthesis must occur after deterministic cognitive execution');

  assert(signalRoute.includes("error: 'clarification_required'"));
  assert(signalRoute.includes("error: 'insufficient_object_observation'"));
  assert(signalRoute.includes("error: 'required_web_evidence_unavailable'"));
  assert(signalRoute.includes("error: 'methodological_closure_incomplete'"));
  assert(signalRoute.includes("error: 'resume_cycle_invalid'"));
  assert(signalRoute.includes('contrastLatestUniversalReturn'));
  assert(signalRoute.includes('SFI_UNIVERSAL_CLOSURE_ENVELOPE_ACCEPTED'));
  assert(signalRoute.includes('body.aiSynthesis !== false'), 'one bounded end-of-cycle AI synthesis should be default-on');
  assert(signalRoute.includes('resumeCycleId: resumeValidation.cycleId ?? undefined'), 'same methodological question must be resumable on the original cycle id');
  assert(signalRoute.includes('suggestedResumeCycleId'), 'intake should expose the existing same-object cycle instead of forcing a parallel run');
  assert(!signalRoute.includes('closeUniversalCycle({\n      cycleId: cycle.cycleId'), 'run must never auto-close its own cycle');

  assert(casesRoute.includes("'intake_plan'"), 'external Case Platform must expose pre-case questions to GPT/AI clients');
  assert(casesRoute.includes('resolveCasePlatformCreationIntake'));
  assert(casesRoute.includes("error: 'case_intake_incomplete'"));

  assert(cycle.includes("selectionMode: requestedValid.length ? 'EXPLICIT' : 'AUTO_MINIMUM_RELEVANT'"));
  assert(cycle.includes('requested: requestedValid'));
  assert(!cycle.includes('requested: requestedValid.length ? requestedValid : available'));
  assert(cycle.includes("eventName: resumed ? 'SFI_UNIVERSAL_CYCLE_RESUMED' : 'SFI_UNIVERSAL_CYCLE_OPENED'"));
  assert(cycle.includes('const cycleId = resumeCycleId ?? randomUUID()'), 'resumed runs must reuse cycle id');
  assert(cycle.includes('const logbookId = `universal-cycle:${cycleId}`'), 'resumed runs must reuse cycle logbook');
  assert(cycle.includes("const resumptions = events.filter((row) => row.event_name === 'SFI_UNIVERSAL_CYCLE_RESUMED')"));
  assert(automationSelector.includes("choose('field_observer', 'baseline_observation')"));
  assert(automationSelector.includes("choose('evidence_hunter', 'evidence_sufficiency_check')"));

  assert(hydrator.includes('SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED'));
  assert(hydrator.includes('SFI_DATASET_PROFILE_ADMITTED'));
  assert(hydrator.includes(".eq('object_kind', 'OBSERVATION')"));
  assert(hydrator.includes('hydratedFromEventId'));

  assert(evidenceResolver.includes("'WEB_REQUIRED'"));
  assert(evidenceResolver.includes("'WEB_OPTIONAL'"));
  assert(evidenceResolver.includes("'WEB_NOT_REQUIRED'"));
  assert(evidenceResolver.includes("'WEB_FORBIDDEN'"));
  assert(evidenceResolver.includes('12_000'), 'Universal public retrieval must remain time-bounded');
  assert(evidenceResolver.includes('Promise.allSettled'), 'bounded web queries should execute concurrently');
  assert(!evidenceResolver.includes('runLlmTask'), 'web acquisition must not depend on an LLM');
  assert(!evidenceResolver.includes('runPublicResearch'), 'Universal retrieval must not fall into the long research/synthesis pipeline');
  assert(evidenceResolver.includes("epistemicClass: 'SOURCE_CLAIM'"));

  assert(synthesis.includes('SFI-UNIVERSAL-AI-SYNTHESIS-1.0'));
  assert(synthesis.includes('primaryHypothesis'));
  assert(synthesis.includes('rivalHypotheses'));
  assert(synthesis.includes('expectedSignals'));
  assert(synthesis.includes('contradictionSignals'));
  assert(synthesis.includes('observationWindow'));
  assert(synthesis.includes("eventName: 'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED'"));
  assert(synthesis.includes("epistemicClass: 'inferred'"));
  assert(synthesis.includes('Never invent measurements'));

  for (const field of [
    'PRIMARY_HYPOTHESIS',
    'RIVAL_HYPOTHESIS',
    'PREDICTION',
    'EXPECTED_SIGNALS',
    'CONTRADICTION_SIGNALS',
    'OBSERVATION_WINDOW',
    'OBSERVED_RETURN',
    'CONTRAST',
    'UPDATED_CONFIDENCE',
    'OUTCOME',
    'LEARNING_CANDIDATE',
  ]) assert(closure.includes(field), `closure gate missing ${field}`);
  assert(closure.includes('DESCRIPTIVE_DELIMITED'));
  assert(closure.includes("eventName: 'SFI_UNIVERSAL_RETURN_CONTRASTED'"));
  assert(closure.includes("promotionState: 'CANDIDATE_NOT_CANONICAL'"));

  assert(cycle.includes("const aiSyntheses = events.filter((row) => row.event_name === 'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED')"));
  assert(cycle.includes("const returnContrasts = events.filter((row) => row.event_name === 'SFI_UNIVERSAL_RETURN_CONTRASTED')"));
  assert(cycle.includes("const closureEnvelopes = events.filter((row) => row.event_name === 'SFI_UNIVERSAL_CLOSURE_ENVELOPE_ACCEPTED')"));
  assert(cycle.includes("? 'CALIBRATED'"));

  assert(profiler.includes('formulasEvaluated: false'));
  assert(profiler.includes('macrosExecuted: false'));
  assert(profiler.includes('rawRowsReturned: false'));

  const vercelConfig = JSON.parse(vercel) as { git?: { deploymentEnabled?: boolean | Record<string, boolean> } };
  assert(
    gitDeploymentsDisabled(vercelConfig.git?.deploymentEnabled),
    'Universal-cycle QA requires Git-triggered Vercel deployments to remain disabled regardless of equivalent config representation',
  );

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-UNIVERSAL-FULL-CYCLE-QA-1.3',
    lifecycle: [
      'INTENT',
      'OBSERVE_FIRST',
      'OBSERVATION_HYDRATION',
      'OBJECT_SUFFICIENCY_ALL_REPRESENTATIONS',
      'SAME_CYCLE_REMEDIATION_RERUN',
      'EVIDENCE_REQUIREMENT',
      'BOUNDED_WEB_ACQUISITION',
      'MINIMUM_COGNITIVE_RUNTIME',
      'AI_SYNTHESIS',
      'RETURN',
      'CONTRAST',
      'CLOSURE_GATE',
    ],
    operatorClassificationRequiredBeforeObservation: false,
    referenceOnlyExecutionAllowed: false,
    parallelCycleIsDefault: false,
    priorFailedRunsAreErased: false,
    sourceClaimsAreEvidence: false,
    aiInferenceIsTruth: false,
    automaticClosure: false,
    gitDeploymentsToVercel: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
