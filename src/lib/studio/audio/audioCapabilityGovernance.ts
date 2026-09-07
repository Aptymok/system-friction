import type { SfiAuthorityClass } from '@/lib/sfi/cognitive-runtime/cognitivePassportRegistry';
import { SFI_AUDIO_CAPABILITIES, type SfiAudioCapability } from './closedLoop';

export const SFI_AUDIO_CAPABILITY_GOVERNANCE_CONTRACT = 'SFI-AUDIO-CAPABILITY-GOVERNANCE-1.0' as const;

export type SfiAudioCapabilityGovernance = Readonly<{
  capabilityId: SfiAudioCapability;
  authorityCeiling: SfiAuthorityClass;
  epistemicOutput: 'OBSERVATION' | 'DERIVED' | 'PLAN' | 'GENERATED_RENDER' | 'EVALUATION';
  externalObservationRequired: boolean;
  mayPersistCanon: false;
  mayExpandAuthority: false;
  returnRequired: boolean;
}>;

const READ: SfiAuthorityClass = 'READ';
const RECOMMEND: SfiAuthorityClass = 'RECOMMEND';
const EXECUTE_REVERSIBLE: SfiAuthorityClass = 'EXECUTE_REVERSIBLE';

export const SFI_AUDIO_CAPABILITY_GOVERNANCE: Readonly<Record<SfiAudioCapability, SfiAudioCapabilityGovernance>> = Object.freeze({
  audio_observer: Object.freeze({ capabilityId: 'audio_observer', authorityCeiling: READ, epistemicOutput: 'OBSERVATION', externalObservationRequired: true, mayPersistCanon: false, mayExpandAuthority: false, returnRequired: false }),
  audio_reference_resolver: Object.freeze({ capabilityId: 'audio_reference_resolver', authorityCeiling: READ, epistemicOutput: 'DERIVED', externalObservationRequired: false, mayPersistCanon: false, mayExpandAuthority: false, returnRequired: false }),
  audio_cultural_vector: Object.freeze({ capabilityId: 'audio_cultural_vector', authorityCeiling: RECOMMEND, epistemicOutput: 'DERIVED', externalObservationRequired: false, mayPersistCanon: false, mayExpandAuthority: false, returnRequired: false }),
  audio_score_planner: Object.freeze({ capabilityId: 'audio_score_planner', authorityCeiling: RECOMMEND, epistemicOutput: 'PLAN', externalObservationRequired: false, mayPersistCanon: false, mayExpandAuthority: false, returnRequired: false }),
  audio_performance_planner: Object.freeze({ capabilityId: 'audio_performance_planner', authorityCeiling: RECOMMEND, epistemicOutput: 'PLAN', externalObservationRequired: false, mayPersistCanon: false, mayExpandAuthority: false, returnRequired: false }),
  audio_instrument_resolver: Object.freeze({ capabilityId: 'audio_instrument_resolver', authorityCeiling: READ, epistemicOutput: 'DERIVED', externalObservationRequired: false, mayPersistCanon: false, mayExpandAuthority: false, returnRequired: false }),
  audio_renderer: Object.freeze({ capabilityId: 'audio_renderer', authorityCeiling: EXECUTE_REVERSIBLE, epistemicOutput: 'GENERATED_RENDER', externalObservationRequired: false, mayPersistCanon: false, mayExpandAuthority: false, returnRequired: true }),
  audio_stem_separator: Object.freeze({ capabilityId: 'audio_stem_separator', authorityCeiling: EXECUTE_REVERSIBLE, epistemicOutput: 'GENERATED_RENDER', externalObservationRequired: false, mayPersistCanon: false, mayExpandAuthority: false, returnRequired: true }),
  audio_mix_master: Object.freeze({ capabilityId: 'audio_mix_master', authorityCeiling: EXECUTE_REVERSIBLE, epistemicOutput: 'GENERATED_RENDER', externalObservationRequired: false, mayPersistCanon: false, mayExpandAuthority: false, returnRequired: true }),
  audio_candidate_evaluator: Object.freeze({ capabilityId: 'audio_candidate_evaluator', authorityCeiling: RECOMMEND, epistemicOutput: 'EVALUATION', externalObservationRequired: true, mayPersistCanon: false, mayExpandAuthority: false, returnRequired: false }),
  audio_intersection_forecaster: Object.freeze({ capabilityId: 'audio_intersection_forecaster', authorityCeiling: RECOMMEND, epistemicOutput: 'DERIVED', externalObservationRequired: false, mayPersistCanon: false, mayExpandAuthority: false, returnRequired: false }),
});

export function validateAudioCapabilityGovernance(): string[] {
  const errors: string[] = [];
  const ids = Object.keys(SFI_AUDIO_CAPABILITY_GOVERNANCE).sort();
  const expected = [...SFI_AUDIO_CAPABILITIES].sort();
  if (JSON.stringify(ids) !== JSON.stringify(expected)) errors.push('AUDIO_CAPABILITY_REGISTRY_INCOMPLETE');

  for (const capabilityId of SFI_AUDIO_CAPABILITIES) {
    const contract = SFI_AUDIO_CAPABILITY_GOVERNANCE[capabilityId];
    if (!contract) {
      errors.push(`AUDIO_CAPABILITY_MISSING:${capabilityId}`);
      continue;
    }
    if (contract.capabilityId !== capabilityId) errors.push(`AUDIO_CAPABILITY_ID_MISMATCH:${capabilityId}`);
    if (contract.mayPersistCanon !== false) errors.push(`AUDIO_CAPABILITY_CANON_EXPANSION:${capabilityId}`);
    if (contract.mayExpandAuthority !== false) errors.push(`AUDIO_CAPABILITY_AUTHORITY_EXPANSION:${capabilityId}`);
    if (contract.epistemicOutput === 'GENERATED_RENDER' && contract.authorityCeiling !== 'EXECUTE_REVERSIBLE') {
      errors.push(`AUDIO_RENDER_AUTHORITY_INVALID:${capabilityId}`);
    }
    if (contract.epistemicOutput === 'OBSERVATION' && !contract.externalObservationRequired) {
      errors.push(`AUDIO_OBSERVATION_WITHOUT_EXTERNAL_READ:${capabilityId}`);
    }
  }
  return errors.sort();
}
