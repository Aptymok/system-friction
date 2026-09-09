import { createHash } from 'node:crypto';
import {
  assertMethodLabExperimentPreregistration,
  type MethodLabExperimentPreregistration,
} from './experimentContract';

export const METHOD_LAB_PREREGISTRATION_EXPORT_CONTRACT_VERSION = 'SFI-METHOD-LAB-PREREGISTRATION-EXPORT-1.0' as const;

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
  STOPPING_TERMS: MethodLabExperimentPreregistration['STOPPING_RULE'];
  EXPECTED_SIGNAL: MethodLabExperimentPreregistration['EXPECTED_SIGNAL'];
  RETURN_CRITERIA: {
    returnWindow: MethodLabExperimentPreregistration['RETURN_WINDOW'];
    falsification: MethodLabExperimentPreregistration['FALSIFICATION'];
  };
  REPRODUCIBILITY_REFS: {
    evidenceRefs: string[];
    modelRefs: string[];
    passportRefs: string[];
    twinStateRefs: string[];
    parameterRefs: string[];
    contextRefs: string[];
  };
  boundaries: {
    externalRegistrationClaim: false;
    registrationState: 'NOT_REGISTERED_EXTERNALLY';
    canonicalMutation: false;
    privateTwinPayloadIncluded: false;
    simulationBecomesObservation: false;
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

function refsByRole(preregistration: MethodLabExperimentPreregistration, role: MethodLabExperimentPreregistration['INPUTS'][number]['role']) {
  return [...new Set(preregistration.INPUTS.filter((input) => input.role === role).map((input) => input.ref))].sort();
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
    STOPPING_TERMS: preregistration.STOPPING_RULE,
    EXPECTED_SIGNAL: preregistration.EXPECTED_SIGNAL,
    RETURN_CRITERIA: {
      returnWindow: preregistration.RETURN_WINDOW,
      falsification: preregistration.FALSIFICATION,
    },
    REPRODUCIBILITY_REFS: {
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
    },
  };
}
