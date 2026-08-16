import {
  SFI_CASE_CONTRACT,
  SFI_CASE_TO_INSTITUTION_GATE_CONTRACT,
  SFI_COMMERCIAL_BOUNDARY_CONTRACT,
  SFI_EPISTEMIC_CONTRACT,
  SFI_INSTRUMENT_CONTRACT,
  SFI_REPORT_CONTRACT,
  SFI_SERVICE_PROFILE_CONTRACT,
  SFI_SYSTEM_CONTRACT,
  SFI_TEMPORAL_CONTRACT,
} from '../contracts/sfi';
import { SFI_SERVICE_PROFILES } from './serviceProfiles';

export const SFI_ARCHITECTURE_CONTRACT = 'SFI-ARCHITECTURE-1.0' as const;
export const SFI_CORE_CONTRACT = 'SFI-CORE-1.0' as const;

export const SFI_ARCHITECTURE_V1_STATUS = {
  contract: SFI_ARCHITECTURE_CONTRACT,
  technicalStatus: 'PASS',
  constitutionalContracts: [
    SFI_EPISTEMIC_CONTRACT,
    SFI_SYSTEM_CONTRACT,
    SFI_TEMPORAL_CONTRACT,
    SFI_INSTRUMENT_CONTRACT,
    SFI_COMMERCIAL_BOUNDARY_CONTRACT,
  ],
  validatedSubcontracts: [
    SFI_CASE_CONTRACT,
    SFI_REPORT_CONTRACT,
    SFI_SERVICE_PROFILE_CONTRACT,
    SFI_CASE_TO_INSTITUTION_GATE_CONTRACT,
  ],
  serviceProfiles: SFI_SERVICE_PROFILES.map((profile) => profile.id),
  caseEngine: 'SHARED_SEMANTIC_CORE',
  reportAssembler: 'SHARED_SEMANTIC_CORE',
  persistenceOwner: 'NOT_DEFINED_BY_CONTRACT',
  cognitiveSpineTechnicalIntegrationRequired: true,
  empiricalValidation: 'OPEN_ACCUMULATING',
  scientificValidityImplied: false,
  institutionalAutonomyImplied: false,
  truthAuthorityGranted: false,
  phenomenalConsciousnessClaim: false,
  statement:
    'SFI Architecture V1 is the shared constitutional frame for observation, system modelling, temporal reconstruction, instruments, governed intervention, institutional continuity and tenant-scoped commercial cases.',
} as const;

export const SFI_CORE_V1_STATUS = {
  contract: SFI_CORE_CONTRACT,
  technicalStatus: 'PASS',
  architecture: 'PASS',
  epistemicContract: 'FROZEN',
  systemContract: 'FROZEN',
  temporalContract: 'FROZEN',
  instrumentContract: 'FROZEN',
  commercialBoundaryContract: 'FROZEN',
  caseContract: 'VALIDATED',
  caseEngine: 'VALIDATED',
  reportContract: 'VALIDATED',
  reportAssembler: 'VALIDATED',
  serviceProfileRegistry: 'VALIDATED',
  cognitiveSpine: 'INTEGRATED',
  rootGovernance: 'PRESERVED',
  platformIndependence: 'PRESERVED',
  tenantToRoot: 'PROHIBITED',
  caseToInstitutionalMemory: 'GATED',
  aiOutputToEvidence: 'PROHIBITED_BY_INHERITANCE',
  reportToAction: 'GOVERNANCE_GATED',
  operationalExercise: 'OPEN',
  empiricalValidation: 'OPEN_ACCUMULATING',
  statement:
    'SFI Core V1 is technically constituted. Operational exercise and empirical validation remain separate open programs and cannot be inferred from software closure.',
} as const;
