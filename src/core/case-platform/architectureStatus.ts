import {
  SFI_CASE_CONTRACT,
  SFI_COMMERCIAL_BOUNDARY_CONTRACT,
  SFI_EPISTEMIC_CONTRACT,
  SFI_INSTRUMENT_CONTRACT,
  SFI_REPORT_CONTRACT,
  SFI_SYSTEM_CONTRACT,
  SFI_TEMPORAL_CONTRACT,
} from '../contracts/sfi';
import { SFI_SERVICE_PROFILES } from './serviceProfiles';

export const SFI_ARCHITECTURE_CONTRACT = 'SFI-ARCHITECTURE-1.0' as const;

export const SFI_ARCHITECTURE_V1_STATUS = {
  contract: SFI_ARCHITECTURE_CONTRACT,
  technicalStatus: 'PASS_CANDIDATE',
  constitutionalContracts: [
    SFI_EPISTEMIC_CONTRACT,
    SFI_SYSTEM_CONTRACT,
    SFI_TEMPORAL_CONTRACT,
    SFI_INSTRUMENT_CONTRACT,
    SFI_COMMERCIAL_BOUNDARY_CONTRACT,
  ],
  validatedSubcontracts: [SFI_CASE_CONTRACT, SFI_REPORT_CONTRACT],
  serviceProfiles: SFI_SERVICE_PROFILES.map((profile) => profile.id),
  cognitiveSpineTechnicalIntegrationRequired: true,
  empiricalValidation: 'OPEN_ACCUMULATING',
  scientificValidityImplied: false,
  institutionalAutonomyImplied: false,
  truthAuthorityGranted: false,
  phenomenalConsciousnessClaim: false,
  statement:
    'SFI Architecture V1 is the shared constitutional frame for observation, system modelling, temporal reconstruction, instruments, governed intervention, institutional continuity and tenant-scoped commercial cases.',
} as const;
