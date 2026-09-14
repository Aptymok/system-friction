import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  normalizeCasePlatformActionInput,
  resolveCasePlatformCreationIntakeFromAction,
} from '../src/lib/sfi/caseIntakeResolver';

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
assert.equal(openapi.info?.['x-sfi-action-revision'], 'case-lifecycle-actions-v3');
assert.equal(openapi.paths?.['/api/external/v1/cases/read']?.post?.operationId, 'readSfiCase');
assert.equal(openapi.paths?.['/api/external/v1/cases/transition']?.post?.operationId, 'transitionSfiCase');
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
  contract: 'SFI-CASE-INTAKE-ACTION-BINDING-1.3',
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
  dedicatedTransitionOperationId: 'transitionSfiCase',
  rejectedTransitionAllowed: true,
  interventionTransitionAllowed: false,
  awaitingReturnTransitionAllowed: false,
  invalidLifecycleTransitionHttpStatus: 409,
  authorizationForbiddenHttpStatus: 403,
  actionRevision: 'case-lifecycle-actions-v3',
}, null, 2));
