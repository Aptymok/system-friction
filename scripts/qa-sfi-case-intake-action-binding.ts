import { strict as assert } from 'node:assert';
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

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-CASE-INTAKE-ACTION-BINDING-1.1',
  nestedActionFieldsAccepted: true,
  flatTransportAliasesAccepted: true,
  flatTransportReconstructsCanonicalNestedContract: true,
  mixedDraftTopLevelFlatAccepted: true,
  conflictingTransportFailsClosed: true,
  unresolvedFieldsStillFailClosed: true,
}, null, 2));
