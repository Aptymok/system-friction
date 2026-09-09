import { createHash } from 'node:crypto';
import {
  assertMethodLabExperimentPreregistration,
  type MethodLabExperimentPreregistration,
} from './experimentContract';

export const METHOD_LAB_PREREGISTRATION_EXPORT_CONTRACT_VERSION = 'SFI-METHOD-LAB-PREREGISTRATION-EXPORT-1.2' as const;

type PreregistrationInput = MethodLabExperimentPreregistration['INPUTS'][number];
type ReproducibilityRef = Pick<PreregistrationInput, 'ref' | 'role' | 'epistemicClass'>;
type RoleRef = Pick<PreregistrationInput, 'ref' | 'epistemicClass'>;

export type MethodLabPreregistrationExport = {
  contractVersion: typeof METHOD_LAB_PREREGISTRATION_EXPORT_CONTRACT_VERSION;
  exportId: string;
  experimentId: string;
  experimentType: MethodLabExperimentPreregistration['experimentType'];
  definitionHash: string;
  exportHash: string;
  HYPOTHESIS: MethodLabExperimentPreregistration['HYPOTHESIS'];
  T0: MethodLabExperimentPreregistration['T0'];
  METHOD: MethodLabExperimentPreregistration['METHOD'];
  POPULATION_SYSTEM: MethodLabExperimentPreregistration['POPULATION_SYSTEM'];
  CONTROL: MethodLabExperimentPreregistration['CONTROL'];
  VARIANTS: MethodLabExperimentPreregistration['VARIANTS'];
  STOPPING_TERMS: MethodLabExperimentPreregistration['STOPPING_RULE'];
  EXPECTED_SIGNAL: MethodLabExperimentPreregistration['EXPECTED_SIGNAL'];
  RETURN_CRITERIA: {
    returnWindow: MethodLabExperimentPreregistration['RETURN_WINDOW'];
    falsification: MethodLabExperimentPreregistration['FALSIFICATION'];
  };
  REPRODUCIBILITY_REFS: {
    inputs: ReproducibilityRef[];
    evidenceRefs: RoleRef[];
    modelRefs: RoleRef[];
    passportRefs: RoleRef[];
    twinStateRefs: RoleRef[];
    parameterRefs: RoleRef[];
    contextRefs: RoleRef[];
  };
  boundaries: {
    externalRegistrationClaim: false;
    registrationState: 'NOT_REGISTERED_EXTERNALLY';
    canonicalMutation: false;
    privateTwinPayloadIncluded: false;
    simulationBecomesObservation: false;
    epistemicClassesPreserved: true;
    frozenArmsPreserved: true;
  };
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(row).sort().map((key) => [key, canonicalize(row[key])]));
  }
  return value;
}

function sha256(value: unknown) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function refsByRole(preregistration: MethodLabExperimentPreregistration, role: PreregistrationInput['role']): RoleRef[] {
  return preregistration.INPUTS
    .filter((item) => item.role === role)
    .map((item) => ({ ref: item.ref, epistemicClass: item.epistemicClass }))
    .sort((left, right) => left.ref.localeCompare(right.ref) || left.epistemicClass.localeCompare(right.epistemicClass));
}

function allInputRefs(preregistration: MethodLabExperimentPreregistration): ReproducibilityRef[] {
  return preregistration.INPUTS
    .map((item) => ({ ref: item.ref, role: item.role, epistemicClass: item.epistemicClass }))
    .sort((left, right) => left.ref.localeCompare(right.ref) || left.role.localeCompare(right.role) || left.epistemicClass.localeCompare(right.epistemicClass));
}

export function buildMethodLabPreregistrationExport(input: {
  preregistration: MethodLabExperimentPreregistration;
  definitionHash: string;
}): MethodLabPreregistrationExport {
  const preregistration = assertMethodLabExperimentPreregistration(input.preregistration);
  const definitionHash = input.definitionHash.trim();
  if (!/^[a-f0-9]{64}$/i.test(definitionHash)) throw new Error('METHOD_LAB_PREREGISTRATION_EXPORT_DEFINITION_HASH_INVALID');

  const stablePayload = {
    experimentId: preregistration.experimentId,
    experimentType: preregistration.experimentType,
    definitionHash,
    HYPOTHESIS: preregistration.HYPOTHESIS,
    T0: preregistration.T0,
    METHOD: preregistration.METHOD,
    POPULATION_SYSTEM: preregistration.POPULATION_SYSTEM,
    CONTROL: preregistration.CONTROL,
    VARIANTS: preregistration.VARIANTS,
    STOPPING_TERMS: preregistration.STOPPING_RULE,
    EXPECTED_SIGNAL: preregistration.EXPECTED_SIGNAL,
    RETURN_CRITERIA: {
      returnWindow: preregistration.RETURN_WINDOW,
      falsification: preregistration.FALSIFICATION,
    },
    REPRODUCIBILITY_REFS: {
      inputs: allInputRefs(preregistration),
      evidenceRefs: refsByRole(preregistration, 'EVIDENCE'),
      modelRefs: refsByRole(preregistration, 'MODEL'),
      passportRefs: refsByRole(preregistration, 'PASSPORT'),
      twinStateRefs: refsByRole(preregistration, 'TWIN_STATE'),
      parameterRefs: refsByRole(preregistration, 'PARAMETER'),
      contextRefs: refsByRole(preregistration, 'CONTEXT'),
    },
  };
  const exportHash = sha256(stablePayload);

  return {
    contractVersion: METHOD_LAB_PREREGISTRATION_EXPORT_CONTRACT_VERSION,
    exportId: `method-lab:prereg-export:${preregistration.experimentId}:${definitionHash}`,
    ...stablePayload,
    exportHash,
    boundaries: {
      externalRegistrationClaim: false,
      registrationState: 'NOT_REGISTERED_EXTERNALLY',
      canonicalMutation: false,
      privateTwinPayloadIncluded: false,
      simulationBecomesObservation: false,
      epistemicClassesPreserved: true,
      frozenArmsPreserved: true,
    },
  };
}
