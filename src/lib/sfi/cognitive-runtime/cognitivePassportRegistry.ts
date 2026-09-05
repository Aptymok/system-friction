import type { SfiRegisteredCognitiveAgent } from './types';
import { executionContractForAgent } from './executionContracts';
import {
  operationModelRequirementsForAgent,
  type SfiOperationModelRequirements,
} from './agentModelRequirements';

export type { SfiOperationModelRequirements } from './agentModelRequirements';

export const SFI_COGNITIVE_PASSPORT_CONTRACT = 'SFI-COGNITIVE-PASSPORT-1.0' as const;
export const SFI_COGNITIVE_PASSPORT_VERSION = '1.0' as const;

export type SfiCognitivePassportEpistemicMode =
  | 'OBSERVE'
  | 'RECONSTRUCT'
  | 'INFER'
  | 'SIMULATE'
  | 'PROJECT'
  | 'DECIDE'
  | 'LEARN';

export type SfiAuthorityClass =
  | 'READ'
  | 'RECOMMEND'
  | 'WRITE_INTERNAL'
  | 'EXECUTE_REVERSIBLE'
  | 'EXECUTE_EXTERNAL'
  | 'IRREVERSIBLE'
  | 'CANON';

export interface SfiCognitivePassport {
  id: string;
  version: string;
  name: string;
  purpose: string;
  epistemicMode: SfiCognitivePassportEpistemicMode;
  input: {
    required: string[];
    optional: string[];
    acceptedEvidenceClasses: string[];
    requiredEvidenceClasses: string[];
    sourcePolicies: string[];
  };
  output: {
    allowedEpistemicClasses: string[];
    schemaRef: string | null;
    confidencePolicy: string;
    missingPolicy: string;
    contradictionPolicy: string;
  };
  tools: {
    allowedToolClasses: string[];
    allowedResources: string[];
    forbiddenResources: string[];
  };
  modelRequirements: SfiOperationModelRequirements;
  authority: {
    ceiling: SfiAuthorityClass;
    confirmationRequirement: 'NONE' | 'POLICY' | 'HUMAN';
  };
  orchestration: {
    mayRequestCapabilities: boolean;
    requestableCapabilityIds: string[];
    requestableCapabilityClasses: string[];
    maxDepth: number;
    maxChildren: number;
    stopConditions: string[];
  };
  return: {
    required: boolean;
    condition: string | null;
    falsificationCondition: string | null;
  };
  security: {
    defaultTtlSeconds: number;
    sensitivityClass: string;
    loggingRequired: boolean;
  };
}

const EPISTEMIC_MODE_BY_LAYER: Record<SfiRegisteredCognitiveAgent['layer'], SfiCognitivePassportEpistemicMode> = {
  observe: 'OBSERVE',
  reconstruct: 'RECONSTRUCT',
  simulate: 'SIMULATE',
  understand: 'INFER',
  project: 'PROJECT',
  decide: 'DECIDE',
  act: 'DECIDE',
  learn: 'LEARN',
};

const AUTHORITY_CEILING_BY_LEGACY_LEVEL: Record<SfiRegisteredCognitiveAgent['authorityLevel'], SfiAuthorityClass> = {
  observer: 'READ',
  analyst: 'RECOMMEND',
  advisor: 'RECOMMEND',
  executor: 'RECOMMEND',
};

const RETURN_REQUIRED_IDS = new Set([
  'trajectory_agent',
  'project_execution_manager',
]);

const ACCEPTED_EVIDENCE_CLASSES = ['OBSERVATION', 'EVIDENCE', 'SOURCE_CANDIDATE', 'RETURN', 'CONTRAST'];
const SOURCE_POLICIES = [
  'EVIDENCE_BEFORE_INFERENCE',
  'MODEL_OUTPUT_NEVER_OBSERVATION_BY_INHERITANCE',
  'MISSING_REMAINS_MISSING',
];
const FORBIDDEN_RESOURCES = [
  'service_role',
  'raw_secrets',
  'unscoped_external_execution',
];
const MISSING_POLICY = 'PRESERVE_MISSING_AND_NOT_OBSERVED';
const CONTRADICTION_POLICY = 'PRESERVE_AND_SURFACE_CONTRADICTIONS';

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort();
}

function requiredEvidenceClassesFor(agent: SfiRegisteredCognitiveAgent): string[] {
  if (agent.id === 'reality_calibration') return ['RETURN'];
  return [];
}

function outputContractFor(agent: SfiRegisteredCognitiveAgent): SfiCognitivePassport['output'] {
  const executionContract = executionContractForAgent(agent.id);
  return {
    allowedEpistemicClasses: uniqueSorted((executionContract?.requestedOutputs ?? []).map(String)),
    schemaRef: null,
    confidencePolicy: agent.confidenceModel.method,
    missingPolicy: MISSING_POLICY,
    contradictionPolicy: CONTRADICTION_POLICY,
  };
}

function returnContractFor(agent: SfiRegisteredCognitiveAgent): SfiCognitivePassport['return'] {
  const required = RETURN_REQUIRED_IDS.has(agent.id);
  return {
    required,
    condition: required ? 'REAL_WORLD_OUTCOME_OR_AUTHORIZED_EXTERNAL_SOURCE_OBSERVED' : null,
    falsificationCondition: required ? 'DECLARED_EXPECTATION_CONTRADICTED_BY_RETURN' : null,
  };
}

function sameSortedStrings(actual: string[], expected: string[]) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

function normalizedModelRequirements(value: SfiOperationModelRequirements) {
  return {
    reasoning: value.reasoning,
    structuredOutput: value.structuredOutput,
    web: value.web,
    multimodal: value.multimodal,
    computer: value.computer,
    code: value.code,
    minContextTokens: value.minContextTokens,
    latencyClass: value.latencyClass,
    costClass: value.costClass,
    privacyClass: value.privacyClass,
    providerAllowlist: value.providerAllowlist ? [...value.providerAllowlist].sort() : null,
    providerDenylist: value.providerDenylist ? [...value.providerDenylist].sort() : null,
  };
}

function sameModelRequirements(actual: SfiOperationModelRequirements, expected: SfiOperationModelRequirements) {
  return JSON.stringify(normalizedModelRequirements(actual)) === JSON.stringify(normalizedModelRequirements(expected));
}

export function projectCognitivePassport(agent: SfiRegisteredCognitiveAgent): SfiCognitivePassport {
  return {
    id: agent.id,
    version: SFI_COGNITIVE_PASSPORT_VERSION,
    name: agent.name,
    purpose: agent.purpose,
    epistemicMode: EPISTEMIC_MODE_BY_LAYER[agent.layer],
    input: {
      required: uniqueSorted(agent.sourceTables),
      optional: ['KernelContext.metadata', 'KernelContext.hypotheses', 'KernelContext.contradictions'],
      acceptedEvidenceClasses: [...ACCEPTED_EVIDENCE_CLASSES],
      requiredEvidenceClasses: requiredEvidenceClassesFor(agent),
      sourcePolicies: [...SOURCE_POLICIES],
    },
    output: outputContractFor(agent),
    tools: {
      allowedToolClasses: [],
      allowedResources: uniqueSorted(agent.readsMemory),
      forbiddenResources: [...FORBIDDEN_RESOURCES],
    },
    modelRequirements: operationModelRequirementsForAgent(agent.id),
    authority: {
      ceiling: AUTHORITY_CEILING_BY_LEGACY_LEVEL[agent.authorityLevel],
      confirmationRequirement: agent.humanApprovalRequired ? 'HUMAN' : 'NONE',
    },
    orchestration: {
      mayRequestCapabilities: false,
      requestableCapabilityIds: [],
      requestableCapabilityClasses: [],
      maxDepth: 0,
      maxChildren: 0,
      stopConditions: ['NO_NEW_INFORMATION_AND_NO_NEW_STATE'],
    },
    return: returnContractFor(agent),
    security: {
      defaultTtlSeconds: 600,
      sensitivityClass: 'INTERNAL',
      loggingRequired: true,
    },
  };
}

const EPISTEMIC_MODES = new Set<SfiCognitivePassportEpistemicMode>([
  'OBSERVE', 'RECONSTRUCT', 'INFER', 'SIMULATE', 'PROJECT', 'DECIDE', 'LEARN',
]);
const AUTHORITY_CLASSES = new Set<SfiAuthorityClass>([
  'READ', 'RECOMMEND', 'WRITE_INTERNAL', 'EXECUTE_REVERSIBLE', 'EXECUTE_EXTERNAL', 'IRREVERSIBLE', 'CANON',
]);
const CONFIRMATION_REQUIREMENTS = new Set(['NONE', 'POLICY', 'HUMAN']);

function duplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

export function validateCognitivePassport(passport: SfiCognitivePassport): string[] {
  const errors: string[] = [];
  const push = (code: string) => errors.push(`${passport.id || '<missing-id>'}:${code}`);

  if (!passport.id.trim()) push('ID_REQUIRED');
  if (!passport.version.trim()) push('VERSION_REQUIRED');
  else if (passport.version !== SFI_COGNITIVE_PASSPORT_VERSION) push(`VERSION_UNSUPPORTED:${passport.version}`);
  if (!passport.name.trim()) push('NAME_REQUIRED');
  if (!passport.purpose.trim()) push('PURPOSE_REQUIRED');
  if (!EPISTEMIC_MODES.has(passport.epistemicMode)) push('EPISTEMIC_MODE_INVALID');
  if (!AUTHORITY_CLASSES.has(passport.authority.ceiling)) push('AUTHORITY_CEILING_INVALID');
  if (!CONFIRMATION_REQUIREMENTS.has(passport.authority.confirmationRequirement)) push('CONFIRMATION_REQUIREMENT_INVALID');
  if (passport.security.defaultTtlSeconds <= 0 || passport.security.defaultTtlSeconds > 900) push('DEFAULT_TTL_OUT_OF_RANGE');
  if (!passport.security.sensitivityClass.trim()) push('SENSITIVITY_CLASS_REQUIRED');
  if (!passport.security.loggingRequired) push('LOGGING_REQUIRED');
  if (passport.orchestration.maxDepth < 0) push('MAX_DEPTH_INVALID');
  if (passport.orchestration.maxChildren < 0) push('MAX_CHILDREN_INVALID');
  if (!passport.output.confidencePolicy.trim()) push('CONFIDENCE_POLICY_REQUIRED');
  if (!passport.output.missingPolicy.trim()) push('MISSING_POLICY_REQUIRED');
  if (!passport.output.contradictionPolicy.trim()) push('CONTRADICTION_POLICY_REQUIRED');
  if (passport.output.allowedEpistemicClasses.length === 0) push('OUTPUT_EPISTEMIC_CLASSES_REQUIRED');
  if (!sameSortedStrings(passport.input.acceptedEvidenceClasses, ACCEPTED_EVIDENCE_CLASSES)) {
    push('ACCEPTED_EVIDENCE_CLASSES_CONTRACT_MISMATCH');
  }
  if (!sameSortedStrings(passport.input.sourcePolicies, SOURCE_POLICIES)) {
    push('SOURCE_POLICIES_CONTRACT_MISMATCH');
  }
  if (!sameSortedStrings(passport.tools.forbiddenResources, FORBIDDEN_RESOURCES)) {
    push('FORBIDDEN_RESOURCES_CONTRACT_MISMATCH');
  }

  for (const [field, values] of [
    ['INPUT_REQUIRED', passport.input.required],
    ['INPUT_OPTIONAL', passport.input.optional],
    ['ACCEPTED_EVIDENCE_CLASSES', passport.input.acceptedEvidenceClasses],
    ['REQUIRED_EVIDENCE_CLASSES', passport.input.requiredEvidenceClasses],
    ['SOURCE_POLICIES', passport.input.sourcePolicies],
    ['OUTPUT_EPISTEMIC_CLASSES', passport.output.allowedEpistemicClasses],
    ['TOOL_CLASSES', passport.tools.allowedToolClasses],
    ['ALLOWED_RESOURCES', passport.tools.allowedResources],
    ['FORBIDDEN_RESOURCES', passport.tools.forbiddenResources],
    ['REQUESTABLE_CAPABILITY_IDS', passport.orchestration.requestableCapabilityIds],
    ['REQUESTABLE_CAPABILITY_CLASSES', passport.orchestration.requestableCapabilityClasses],
    ['STOP_CONDITIONS', passport.orchestration.stopConditions],
  ] as const) {
    for (const duplicate of duplicateValues(values)) push(`${field}_DUPLICATE:${duplicate}`);
  }

  if (!passport.orchestration.mayRequestCapabilities) {
    if (passport.orchestration.requestableCapabilityIds.length > 0) push('REQUEST_IDS_REQUIRE_CAPABILITY_REQUEST_AUTHORITY');
    if (passport.orchestration.requestableCapabilityClasses.length > 0) push('REQUEST_CLASSES_REQUIRE_CAPABILITY_REQUEST_AUTHORITY');
    if (passport.orchestration.maxDepth !== 0) push('MAX_DEPTH_MUST_BE_ZERO_WHEN_REQUESTS_DISABLED');
    if (passport.orchestration.maxChildren !== 0) push('MAX_CHILDREN_MUST_BE_ZERO_WHEN_REQUESTS_DISABLED');
  }

  return errors.sort();
}

export function validateCognitivePassportAgainstSource(
  passport: SfiCognitivePassport,
  source: SfiRegisteredCognitiveAgent,
): string[] {
  const errors = [...validateCognitivePassport(passport)];
  const expectedEpistemicMode = EPISTEMIC_MODE_BY_LAYER[source.layer];
  const expectedCeiling = AUTHORITY_CEILING_BY_LEGACY_LEVEL[source.authorityLevel];
  const expectedConfirmation = source.humanApprovalRequired ? 'HUMAN' : 'NONE';
  const expectedRequiredInputs = uniqueSorted(source.sourceTables);
  const expectedOutput = outputContractFor(source);
  const expectedRequiredEvidence = requiredEvidenceClassesFor(source);
  const expectedAllowedResources = uniqueSorted(source.readsMemory);
  const expectedModelRequirements = operationModelRequirementsForAgent(source.id);
  const expectedReturn = returnContractFor(source);

  if (passport.id !== source.id) errors.push(`${passport.id}:SOURCE_ID_MISMATCH:${source.id}`);
  if (passport.name !== source.name) errors.push(`${passport.id}:SOURCE_NAME_MISMATCH`);
  if (passport.purpose !== source.purpose) errors.push(`${passport.id}:SOURCE_PURPOSE_MISMATCH`);
  if (passport.epistemicMode !== expectedEpistemicMode) {
    errors.push(`${passport.id}:EPISTEMIC_MODE_MISMATCH:${passport.epistemicMode}:${expectedEpistemicMode}`);
  }
  if (passport.authority.ceiling !== expectedCeiling) {
    errors.push(`${passport.id}:AUTHORITY_EXPANSION:${passport.authority.ceiling}:${expectedCeiling}`);
  }
  if (passport.authority.confirmationRequirement !== expectedConfirmation) {
    errors.push(`${passport.id}:CONFIRMATION_REQUIREMENT_MISMATCH:${passport.authority.confirmationRequirement}:${expectedConfirmation}`);
  }
  if (!sameSortedStrings(passport.input.required, expectedRequiredInputs)) {
    errors.push(`${passport.id}:INPUT_REQUIRED_CONTRACT_MISMATCH`);
  }
  if (!sameSortedStrings(passport.output.allowedEpistemicClasses, expectedOutput.allowedEpistemicClasses)) {
    errors.push(`${passport.id}:OUTPUT_CONTRACT_MISMATCH`);
  }
  if (
    passport.output.schemaRef !== expectedOutput.schemaRef
    || passport.output.confidencePolicy !== expectedOutput.confidencePolicy
    || passport.output.missingPolicy !== expectedOutput.missingPolicy
    || passport.output.contradictionPolicy !== expectedOutput.contradictionPolicy
  ) {
    errors.push(`${passport.id}:OUTPUT_POLICY_CONTRACT_MISMATCH`);
  }
  if (!sameSortedStrings(passport.input.requiredEvidenceClasses, expectedRequiredEvidence)) {
    errors.push(`${passport.id}:REQUIRED_EVIDENCE_CONTRACT_MISMATCH`);
  }
  if (!sameSortedStrings(passport.tools.allowedResources, expectedAllowedResources)) {
    errors.push(`${passport.id}:ALLOWED_RESOURCES_CONTRACT_MISMATCH`);
  }
  if (!sameModelRequirements(passport.modelRequirements, expectedModelRequirements)) {
    errors.push(`${passport.id}:MODEL_REQUIREMENTS_CONTRACT_MISMATCH`);
  }
  if (
    passport.return.required !== expectedReturn.required
    || passport.return.condition !== expectedReturn.condition
    || passport.return.falsificationCondition !== expectedReturn.falsificationCondition
  ) {
    errors.push(`${passport.id}:RETURN_CONTRACT_MISMATCH`);
  }
  if (passport.tools.allowedToolClasses.length > 0) errors.push(`${passport.id}:UNGRANTED_TOOL_AUTHORITY`);
  if (passport.orchestration.mayRequestCapabilities) errors.push(`${passport.id}:ADAPTIVE_REQUEST_AUTHORITY_PREMATURE`);

  return errors.sort();
}

export function validateCognitivePassportProjection(
  passports: SfiCognitivePassport[],
  sources: SfiRegisteredCognitiveAgent[],
): string[] {
  const errors: string[] = [];
  const sourceById = new Map(sources.map((source) => [source.id, source] as const));
  const passportIds = passports.map((passport) => passport.id);
  const sourceIds = sources.map((source) => source.id);

  if (passportIds.length !== sourceIds.length) {
    errors.push(`REGISTRY_COUNT_MISMATCH:${passportIds.length}:${sourceIds.length}`);
  }
  for (const duplicate of duplicateValues(passportIds)) errors.push(`REGISTRY_DUPLICATE_ID:${duplicate}`);

  const passportSet = new Set(passportIds);
  const sourceSet = new Set(sourceIds);
  for (const id of [...sourceSet].filter((value) => !passportSet.has(value)).sort()) errors.push(`REGISTRY_MISSING_ID:${id}`);
  for (const id of [...passportSet].filter((value) => !sourceSet.has(value)).sort()) errors.push(`REGISTRY_UNKNOWN_ID:${id}`);

  for (const passport of passports) {
    const source = sourceById.get(passport.id);
    if (!source) {
      errors.push(...validateCognitivePassport(passport));
      continue;
    }
    errors.push(...validateCognitivePassportAgainstSource(passport, source));
  }

  return errors.sort();
}
