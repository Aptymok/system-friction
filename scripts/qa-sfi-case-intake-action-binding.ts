import { strict as assert } from 'node:assert';
import { resolveCasePlatformCreationIntakeFromAction } from '../src/lib/sfi/caseIntakeResolver';

const resolved = {
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

const topLevel = resolveCasePlatformCreationIntakeFromAction(resolved);
assert.equal(topLevel.readyForCreate, true, 'intake_plan must consume the top-level fields exposed by the Action schema');
assert.deepEqual(topLevel.missingContext, []);

const mixed = resolveCasePlatformCreationIntakeFromAction({
  operation: 'intake_plan',
  draft: {
    serviceProfileId: 'SERVICE_OBSERVABILITY',
    subject: 'SERVICE',
    temporalWindow: { mode: 'RETROLONGITUDINAL' },
  },
  scope: resolved.scope,
  systemBoundaryRef: resolved.systemBoundaryRef,
  temporalWindow: {
    basis: 'OBSERVED_TIME',
    cutoff: '2026-09-12T08:50:00-06:00',
  },
});
assert.equal(mixed.readyForCreate, true, 'intake_plan must merge partial draft and top-level Action fields');
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

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-CASE-INTAKE-ACTION-BINDING-1.0',
  topLevelActionFieldsAccepted: true,
  mixedDraftAndTopLevelAccepted: true,
  unresolvedFieldsStillFailClosed: true,
}, null, 2));
