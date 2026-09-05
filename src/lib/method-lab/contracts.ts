export const METHOD_LAB_CONTRACT_VERSION = 'SFI-METHOD-LAB-RUN-1.0' as const;

export type MethodLabProtocolId =
  | 'chronos_olympics'
  | 'cognitive_relational_lab'
  | 'ct_reentry'
  | 'sociotechnical_simulation'
  | 'economic_simulation';

export type MethodLabValidationLevel = 'STRUCTURAL' | 'LOGICAL' | 'SIMULATION' | 'RETROSPECTIVE' | 'PROSPECTIVE';
export type MethodLabProtocolStatus = 'REGISTERED' | 'AVAILABLE' | 'OPERATIONAL' | 'DEGRADED' | 'GATED';

export type MethodLabProtocolDefinition = {
  id: MethodLabProtocolId;
  name: string;
  purpose: string;
  version: string;
  implementationPath: string;
  executionSurface: string | null;
  persistence: string[];
  epistemicClass: 'SIMULATED';
  maximumValidationLevel: MethodLabValidationLevel;
  promotionRequiresRoot: true;
  canonicalMutationAllowed: false;
  externalExecutionAllowed: false;
};

export type MethodLabRunEnvelope = {
  contractVersion: typeof METHOD_LAB_CONTRACT_VERSION;
  labRunId: string;
  protocolId: MethodLabProtocolId;
  protocolVersion: string;
  epistemicClass: 'SIMULATED';
  validationLevel: MethodLabValidationLevel;
  datasetHash: string | null;
  parametersHash: string | null;
  seed: string | number | null;
  codeCommit: string | null;
  provider: string | null;
  model: string | null;
  startedAt: string;
  finishedAt: string | null;
  resultHash: string | null;
  evidenceRefs: string[];
  limitations: string[];
  promotionAllowed: false;
};

export function assertMethodLabRunEnvelope(value: MethodLabRunEnvelope) {
  if (value.contractVersion !== METHOD_LAB_CONTRACT_VERSION) throw new Error('method_lab_contract_version_invalid');
  if (value.epistemicClass !== 'SIMULATED') throw new Error('method_lab_epistemic_class_must_be_simulated');
  if (value.promotionAllowed !== false) throw new Error('method_lab_run_cannot_self_promote');
  if (!value.labRunId || !value.protocolId || !value.protocolVersion || !value.startedAt) throw new Error('method_lab_run_identity_incomplete');
  return value;
}

export * from './experimentContract';
