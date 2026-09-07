import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SFI_AUDIO_CAPABILITY_GOVERNANCE,
  SFI_AUDIO_CAPABILITY_GOVERNANCE_CONTRACT,
  validateAudioCapabilityGovernance,
} from './audioCapabilityGovernance';
import { SFI_AUDIO_CAPABILITIES } from './closedLoop';

test('all closed-loop audio capabilities have explicit non-expanding governance', () => {
  assert.equal(SFI_AUDIO_CAPABILITY_GOVERNANCE_CONTRACT, 'SFI-AUDIO-CAPABILITY-GOVERNANCE-1.0');
  assert.deepEqual(validateAudioCapabilityGovernance(), []);
  assert.equal(Object.keys(SFI_AUDIO_CAPABILITY_GOVERNANCE).length, SFI_AUDIO_CAPABILITIES.length);
  for (const capabilityId of SFI_AUDIO_CAPABILITIES) {
    const capability = SFI_AUDIO_CAPABILITY_GOVERNANCE[capabilityId];
    assert.equal(capability.capabilityId, capabilityId);
    assert.equal(capability.mayPersistCanon, false);
    assert.equal(capability.mayExpandAuthority, false);
  }
});

test('material execution remains reversible and generated output remains non-observation', () => {
  for (const capabilityId of ['audio_renderer', 'audio_stem_separator', 'audio_mix_master'] as const) {
    const capability = SFI_AUDIO_CAPABILITY_GOVERNANCE[capabilityId];
    assert.equal(capability.authorityCeiling, 'EXECUTE_REVERSIBLE');
    assert.equal(capability.epistemicOutput, 'GENERATED_RENDER');
    assert.equal(capability.returnRequired, true);
  }
});

test('only an explicit observer may emit observation and evaluation requires observation input', () => {
  assert.equal(SFI_AUDIO_CAPABILITY_GOVERNANCE.audio_observer.epistemicOutput, 'OBSERVATION');
  assert.equal(SFI_AUDIO_CAPABILITY_GOVERNANCE.audio_observer.externalObservationRequired, true);
  assert.equal(SFI_AUDIO_CAPABILITY_GOVERNANCE.audio_candidate_evaluator.externalObservationRequired, true);
  assert.notEqual(SFI_AUDIO_CAPABILITY_GOVERNANCE.audio_candidate_evaluator.epistemicOutput, 'OBSERVATION');
});
