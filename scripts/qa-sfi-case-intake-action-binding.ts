import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  deriveHypothesisIntakeFromNarrative,
  normalizeCasePlatformActionInput,
  resolveCasePlatformCreationIntakeFromAction,
} from '../src/lib/sfi/caseIntakeResolver';


const ordinaryKnowledge = {
  subjectKind:'ORGANIZATION',
  subject:'Service operations',
  chosenAttractor:'Sustainable daily service',
  intendedDestination:'A response to each approved request',
  currentSituation:'Requests remain in a queue',
  participatingNodes:'requester;operator;queue',
  previousAttempts:'Manual reminders',
  possibleAction:'Execute a bounded dispatch step',
  visibleDifference:'A response record appears for the authorized request',
  limitsToPreserve:'No unauthorized disclosures',
  availableRecords:'request ledger and independently observed response',
};
const generated = deriveHypothesisIntakeFromNarrative(ordinaryKnowledge);
assert.equal(generated.status,'CANDIDATE_REQUIRES_METHOD_REVIEW');
assert.equal(generated.preregistered,false);
assert.equal(generated.proposedGraph.nodes.some(n=>n.kind==='PROPOSED_PROCEDURE'),true);
assert.equal(generated.proposedGraph.relations.some(e=>e.kind==='HYPOTHESIZED_NOT_CAUSAL_FACT'),true);
assert.equal(generated.proposedTestContract?.minimumSourceFamilies,2);
assert.equal(generated.proposedTestContract?.contradictionCriteria.some(c=>c.id==='BOUNDARY_BREACH'),true);
assert.equal(generated.primaryMethod,'PPOI');
assert.equal(generated.proposedGraph.verified,false);
assert.equal(generated.proposedTestContract?.contract,'SFI-HYPOTHESIS-TEST-1.0');
assert.equal(generated.proposedTestContract?.expectedCriteria.length,2);
assert(generated.proposedTestContract?.contradictionCriteria.some(c=>c.id==='RIVAL_WITHOUT_ACTION'));
assert(generated.proposedTestContract?.expectedCriteria.some(c=>c.signal.includes(ordinaryKnowledge.visibleDifference)));
assert.equal(generated.userAskedToDefineScientificCriteria,false);
const incompleteNarrative = deriveHypothesisIntakeFromNarrative({
  subject:'System',chosenAttractor:'Desired state',currentSituation:'Current state',
});
assert.equal(incompleteNarrative.status,'NEEDS_NARRATIVE_CONTEXT');
assert.equal(incompleteNarrative.proposedTestContract,null,'no invented preregistration without observable anchors');
const qualitativeUi = readFileSync('src/components/sfi/PersonalCognitiveLabWorkspace.tsx','utf8');
const personalApi = readFileSync('src/app/api/interface/cognitive-workspace/route.ts','utf8');
const caseApi = readFileSync('src/app/api/external/v1/cases/intake/route.ts','utf8');
const methodPage = readFileSync('src/app/method-lab/page.tsx','utf8');
assert(qualitativeUi.includes('SFI: construir condiciones de contraste'));
assert(qualitativeUi.includes("operation:'hypothesis_intake_preview'"));
assert(methodPage.includes('<PersonalCognitiveLabWorkspace intakeOnly />'));
assert(personalApi.includes("operation === 'hypothesis_intake_preview'"));
assert(caseApi.includes("text(body.operation) === 'hypothesis_intake_preview'"));
const preRegistrationApi=readFileSync('src/app/api/interface/cognitive-workspace/route.ts','utf8');
assert(preRegistrationApi.includes("operation === 'preregister_generated_conditions'"));
assert(preRegistrationApi.includes("SERVER_OBSERVED_72H_BASELINE_REQUIRED"));
assert(preRegistrationApi.includes('persistMethodLabUiPreregistration'));
assert(preRegistrationApi.includes("daySegments.size<3"));
assert(qualitativeUi.includes("Preregistrar condiciones construidas por SFI"));
assert(qualitativeUi.includes("Crear expediente personal de observación"));
assert(qualitativeUi.includes("Registrar observación"));
const realityChain = readFileSync('src/components/sfi/RealityChainWorkbench.tsx','utf8');
assert(!realityChain.includes('SFI-NARRATIVE-HYPOTHESIS-INTAKE-1.0'),'enterprise workbench must not depend on narrative intake');
assert(!realityChain.includes('deriveHypothesisIntakeFromNarrative'),'do not couple enterprise Reality Chain to personal intake');

const nestedResolved = {
  operation: 'intake_plan',
  serviceProfileId: 'SERVICE_OBSERVABILITY',
  subject: 'SERVICE',
  scope: 'Reconstruct ChatGPT ↔ SFI OAuth incident longitudinally.',
  systemBoundaryRef: { id: 'SFI-CHATGPT-OAUTH-E2E', version: '1.0' },
  temporalWindow: {
    mode: 'RETROLONGITUDINAL',
    basis: 'OBSERVED_TIME',
    cutoff: '2026-09-12T08:50:00-06:00',
  },
};

const nested = resolveCasePlatformCreationIntakeFromAction(nestedResolved);
assert.equal(nested.readyForCreate, true, 'canonical nested Action fields must remain supported');
assert.deepEqual(nested.missingContext, []);
assert.equal(nested.readyForProjectExecution, false, 'observational case is not yet authorized as an execution project');

const projectReady = resolveCasePlatformCreationIntakeFromAction({
  ...nestedResolved,subjectKind:'PERSON',declaredAttractor:'Elected destination',
  intendedDestination:'Operating institution',attractorObservation:{
    startedAt:'2026-10-15T09:00:00Z',closedAt:'2026-10-19T09:00:00Z',evidenceRefs:['participant:1','participant:2','participant:3'],
    marks:[{observedAt:'2026-10-15T10:00:00Z',evidenceRef:'participant:1'},
      {observedAt:'2026-10-16T10:00:00Z',evidenceRef:'participant:2'},
      {observedAt:'2026-10-17T10:00:00Z',evidenceRef:'participant:3'}],
  },sedimentationReflection:'Observed repeated obstacles',
  projectObjective:'Demonstrate a bounded execution',
  projectExecutionPlace:'User-authorized environment',
  projectAcceptanceCriteria:'A recorded and independently verified RETURN',
});
assert.equal(projectReady.attractorOnboarding.primaryMethod,'MOP_H');
assert.equal(projectReady.candidateReadyForProjectReview,true);
assert.equal(projectReady.readyForProjectExecution,false,'participant-supplied marks are not independent server verification');
const shortWindow=resolveCasePlatformCreationIntakeFromAction({
  ...nestedResolved,declaredAttractor:'Elected',intendedDestination:'Outcome',
  attractorObservation:{startedAt:'2026-10-18T08:00:00Z',closedAt:'2026-10-18T10:00:00Z',evidenceRefs:['user:1']},
  sedimentationReflection:'Reflection',projectObjective:'Work',projectExecutionPlace:'Here',
  projectAcceptanceCriteria:'Observations',
});
assert.equal(shortWindow.readyForProjectExecution,false,'a two-hour sample is not 72-hour sedimentation');

const flatResolved = {
  operation: 'intake_plan',
  serviceProfileId: 'SERVICE_OBSERVABILITY',
  subject: 'SERVICE',
  scope: nestedResolved.scope,
  systemBoundaryId: 'SFI-CHATGPT-OAUTH-E2E',
  systemBoundaryVersion: '1.0',
  temporalMode: 'RETROLONGITUDINAL',
  temporalBasis: 'OBSERVED_TIME',
  temporalStart: '2026-09-11T23:20:00-06:00',
  temporalEnd: '2026-09-12T08:50:00-06:00',
  temporalCutoff: '2026-09-12T08:50:00-06:00',
  temporalTimezone: 'America/Mexico_City',
  temporalReconstructionAsOf: '2026-09-12T08:50:00-06:00',
};

const flat = resolveCasePlatformCreationIntakeFromAction(flatResolved);
assert.equal(flat.readyForCreate, true, 'flat GPT Action aliases must satisfy Case intake without nested objects');
assert.deepEqual(flat.missingContext, []);

const normalizedFlat = normalizeCasePlatformActionInput(flatResolved);
assert.equal((normalizedFlat.systemBoundaryRef as Record<string, unknown>).id, 'SFI-CHATGPT-OAUTH-E2E');
assert.equal((normalizedFlat.systemBoundaryRef as Record<string, unknown>).version, '1.0');
assert.equal((normalizedFlat.temporalWindow as Record<string, unknown>).cutoff, '2026-09-12T08:50:00-06:00');
assert.equal((normalizedFlat.temporalWindow as Record<string, unknown>).mode, 'RETROLONGITUDINAL');
assert.equal((normalizedFlat.temporalWindow as Record<string, unknown>).timezone, 'America/Mexico_City');

const mixed = resolveCasePlatformCreationIntakeFromAction({
  operation: 'intake_plan',
  draft: {
    serviceProfileId: 'SERVICE_OBSERVABILITY',
    subject: 'SERVICE',
    temporalMode: 'RETROLONGITUDINAL',
  },
  scope: nestedResolved.scope,
  systemBoundaryId: 'SFI-CHATGPT-OAUTH-E2E',
  temporalBasis: 'OBSERVED_TIME',
  temporalCutoff: '2026-09-12T08:50:00-06:00',
});
assert.equal(mixed.readyForCreate, true, 'intake_plan must compose draft, top-level and flat transport aliases');
assert.deepEqual(mixed.missingContext, []);

const missing = resolveCasePlatformCreationIntakeFromAction({
  operation: 'intake_plan',
  serviceProfileId: 'SERVICE_OBSERVABILITY',
});
assert.equal(missing.readyForCreate, false);
assert(missing.missingContext.includes('SUBJECT'));
assert(missing.missingContext.includes('SCOPE'));
assert(missing.missingContext.includes('SYSTEM_BOUNDARY'));
assert(missing.missingContext.includes('TEMPORAL_CUTOFF'));

assert.throws(() => resolveCasePlatformCreationIntakeFromAction({
  ...flatResolved,
  systemBoundaryRef: { id: 'DIFFERENT-BOUNDARY' },
}), /SFI_CASE_ACTION_SYSTEM_BOUNDARY_ID_CONFLICT/);

const openapi = JSON.parse(readFileSync('public/openapi.json', 'utf8')) as Record<string, any>;
const requiredSchema = openapi.components?.schemas?.CaseResolvedTransportRequest;
assert(requiredSchema, 'CaseResolvedTransportRequest must be materialized in OpenAPI');
assert.deepEqual(
  requiredSchema.required,
  ['serviceProfileId', 'subject', 'scope', 'systemBoundaryId', 'temporalCutoff'],
  'Dedicated Case intake/create Actions must require the five blocking intake fields at the tool-schema layer',
);
assert.equal(openapi.paths?.['/api/external/v1/cases/intake']?.post?.operationId, 'planSfiCaseIntake');
assert.equal(openapi.paths?.['/api/external/v1/cases/create']?.post?.operationId, 'createSfiCaseFromResolvedIntake');

// The lifecycle revision extends the Case Action surface but MUST NOT weaken
// intake/create requirements. It also makes the exact read/transition intents
// explicit for CASE-0001 and future governed cases.
assert.equal(openapi.info?.version, '1.20.0');
assert.equal(openapi.info?.['x-sfi-action-revision'], 'case-lifecycle-actions-v6');
assert.equal(openapi.paths?.['/api/external/v1/cases/read']?.post?.operationId, 'readSfiCase');
assert.equal(openapi.paths?.['/api/external/v1/cases/transition']?.post?.operationId, 'transitionSfiCaseV2');
assert.notEqual(openapi.paths?.['/api/external/v1/cases/transition']?.post?.operationId, 'transitionSfiCase');
assert.deepEqual(openapi.components?.schemas?.CaseReadRequest?.required, ['caseId']);
assert.deepEqual(openapi.components?.schemas?.CaseTransitionRequest?.required, ['caseId', 'status']);
const transitionStatuses = openapi.components?.schemas?.CaseTransitionRequest?.properties?.status?.enum ?? [];
assert(transitionStatuses.includes('REJECTED'), 'REJECTED must remain available as a bounded lifecycle state');
assert.equal(transitionStatuses.includes('INTERVENING'), false, 'INTERVENING must remain outside the external transition Action');
assert.equal(transitionStatuses.includes('AWAITING_RETURN'), false, 'AWAITING_RETURN must remain outside the external transition Action');

const caseHttp = readFileSync('src/lib/sfi/case-platform/http.ts', 'utf8');
const transitionConflictMatcher = caseHttp.indexOf('/SFI_CASE_TRANSITION_FORBIDDEN/');
const genericForbiddenMatcher = caseHttp.indexOf('/FORBIDDEN/');
assert(transitionConflictMatcher >= 0, 'Case HTTP failure mapper must recognize canonical transition conflicts explicitly');
assert(genericForbiddenMatcher >= 0, 'Case HTTP failure mapper must retain generic forbidden authorization mapping');
assert(
  transitionConflictMatcher < genericForbiddenMatcher,
  'Canonical transition conflicts must be classified before generic FORBIDDEN so state conflicts remain HTTP 409 instead of authorization 403',
);
assert.match(
  caseHttp.slice(transitionConflictMatcher, genericForbiddenMatcher),
  /\? 409/,
  'SFI_CASE_TRANSITION_FORBIDDEN must map to HTTP 409 Conflict',
);

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-CASE-INTAKE-ACTION-BINDING-1.4',
  nestedActionFieldsAccepted: true,
  flatTransportAliasesAccepted: true,
  flatTransportReconstructsCanonicalNestedContract: true,
  mixedDraftTopLevelFlatAccepted: true,
  conflictingTransportFailsClosed: true,
  unresolvedFieldsStillFailClosed: true,
  dedicatedIntakeActionRequiredFields: requiredSchema.required,
  dedicatedIntakeOperationId: 'planSfiCaseIntake',
  dedicatedCreateOperationId: 'createSfiCaseFromResolvedIntake',
  dedicatedReadOperationId: 'readSfiCase',
  dedicatedTransitionOperationId: 'transitionSfiCaseV2',
  rejectedTransitionAllowed: true,
  interventionTransitionAllowed: false,
  awaitingReturnTransitionAllowed: false,
  invalidLifecycleTransitionHttpStatus: 409,
  authorizationForbiddenHttpStatus: 403,
  actionRevision: 'case-lifecycle-actions-v6',
}, null, 2));
