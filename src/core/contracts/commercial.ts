import type { SfiInstrumentKind } from './instrument';
import type { SfiTemporalMode } from './temporal';

export const SFI_COMMERCIAL_BOUNDARY_CONTRACT = 'SFI-COMMERCIAL-BOUNDARY-CONTRACT-1.0' as const;
export const SFI_SERVICE_PROFILE_CONTRACT = 'SFI-SERVICE-PROFILE-1.0' as const;
export const SFI_CASE_TO_INSTITUTION_GATE_CONTRACT = 'SFI-CASE-TO-INSTITUTION-GATE-1.0' as const;

export type SfiServiceProfileId =
  | 'SYSTEM_OBSERVATORY'
  | 'AI_IMPLEMENTATION_DIAGNOSTIC'
  | 'AI_ADOPTION_INTEGRATION'
  | 'AI_GOVERNANCE_ASSURANCE'
  | 'SERVICE_OBSERVABILITY'
  | 'CONTRACT_WARRANTY_ASSURANCE'
  | 'TENDER_ASSURANCE'
  | 'ENTERPRISE_MEMORY'
  | 'COGNITIVE_RECONSTRUCTION'
  | 'CUSTOM_RESEARCH';

export type SfiInstitutionalAdmissionPolicy = 'GATED';

export type SfiServiceProfileV1 = {
  contract: typeof SFI_SERVICE_PROFILE_CONTRACT;
  id: SfiServiceProfileId;
  label: string;
  acceptedSubjects: readonly string[];
  inputSchema: string;
  temporalPolicy: readonly SfiTemporalMode[];
  requiredSources: readonly string[];
  allowedInstruments: readonly SfiInstrumentKind[];
  requiredAnalyses: readonly string[];
  metricProfile: readonly string[];
  domainRules: readonly string[];
  epistemicPolicy: readonly string[];
  governancePolicy: readonly string[];
  validationProfile: readonly string[];
  reportTemplate: string;
  rootAccess: false;
  institutionalAdmission: SfiInstitutionalAdmissionPolicy;
};

export type SfiCaseToInstitutionStage =
  | 'CASE_RESULT'
  | 'SANITIZED'
  | 'EPISTEMICALLY_ASSESSED'
  | 'ADMISSION_PROPOSED'
  | 'GOVERNANCE_REVIEWED'
  | 'ADMITTED'
  | 'REJECTED';

export const SFI_COMMERCIAL_BOUNDARY = {
  contract: SFI_COMMERCIAL_BOUNDARY_CONTRACT,
  clientCanAddressRoot: false,
  commercialProductCanModifyInstitutionalTruth: false,
  caseMemoryEqualsInstitutionalMemory: false,
  caseCanWriteInstitutionalMemoryDirectly: false,
  institutionalAdmission: 'GATED',
  reportCanAuthorizeAction: false,
  aiOutputIsEvidenceByInheritance: false,
  statement:
    'The commercial layer consumes governed SFI capabilities through tenant-scoped cases. It does not govern the institute, address ROOT directly, or promote client case memory into institutional memory without admission.',
} as const;
