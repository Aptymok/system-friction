import type { SfiRegisteredCognitiveAgent } from './types';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';

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

export interface SfiOperationModelRequirements {
  reasoning: 'LOW' | 'MEDIUM' | 'HIGH' | 'FRONTIER';
  structuredOutput: boolean;
  web: boolean;
  multimodal: boolean;
  computer: boolean;
  code: boolean;
  minContextTokens: number;
  latencyClass: 'INTERACTIVE' | 'NORMAL' | 'BATCH';
  costClass: 'ECONOMY' | 'STANDARD' | 'QUALITY' | 'FRONTIER' | 'PRIVATE_LOCAL' | 'SPECIALIST';
  privacyClass: string;
  providerAllowlist?: string[];
  providerDenylist?: string[];
}

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
  // Existing "executor" means the automation can execute its bounded in-process
  // function. It does not confer external action authority. A later governed
  // capability grant must explicitly authorize any higher authority class.
  executor: 'RECOMMEND',
};

const OUTPUT_CLASSES_BY_MODE: Record<SfiCognitivePassportEpistemicMode, string[]> = {
  OBSERVE: ['OBSERVATION', 'SOURCE_CANDIDATE', 'MISSING', 'NOT_OBSERVED'],
  RECONSTRUCT: ['INFERENCE', 'HYPOTHESIS', 'MISSING', 'NOT_OBSERVED'],
  INFER: ['INFERENCE', 'HYPOTHESIS', 'MISSING'],
  SIMULATE: ['SIMULATION', 'INFERENCE', 'HYPOTHESIS', 'MISSING'],
  PROJECT: ['PROJECTION', 'PREDICTION', 'INFERENCE', 'MISSING'],
  DECIDE: ['INFERENCE', 'HYPOTHESIS', 'MISSING'],
  LEARN: ['CONTRAST', 'LEARNING_CANDIDATE', 'INFERENCE', 'MISSING'],
};

const QUALITY_REASONING_IDS = new Set([
  'risk_agent',
  'economic_field_simulator',
  'cross_impact',
  'trajectory_agent',
  'reality_calibration',
  'phenotype_resolver',
  'friction_field_simulator',
  'temporal_resolver',
]);

const STANDARD_LONG_CONTEXT_IDS = new Set([
  'opportunity_agent',
  'historical_scout',
  'context_builder',
]);

const INTERACTIVE_STRUCTURED_IDS = new Set([
  'evidence_hunter',
  'field_observer',
  'project_execution_manager',
]);

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

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort();
}

function modelRequirementsFor(agent: SfiRegisteredCognitiveAgent): SfiOperationModelRequirements {
  if (QUALITY_REASONING_IDS.has(agent.id)) {
    return {
      reasoning: 'HIGH',
      structuredOutput: true,
      web: false,
      multimodal: false,
      computer: false,
      code: false,
      minContextTokens: 100_000,
      latencyClass: 'NORMAL',
      costClass: 'QUALITY',
      privacyClass: 'INTERNAL',
    };
  }

  if (STANDARD_LONG_CONTEXT_IDS.has(agent.id)) {
    return {
      reasoning: 'MEDIUM',
      structuredOutput: true,
      web: false,
      multimodal: false,
      computer: false,
      code: false,
      minContextTokens: 100_000,
      latencyClass: 'NORMAL',
      costClass: 'STANDARD',
      privacyClass: 'INTERNAL',
    };
  }

  if (INTERACTIVE_STRUCTURED_IDS.has(agent.id)) {
    return {
      reasoning: 'LOW',
      structuredOutput: true,
      web: false,
      multimodal: false,
      computer: false,
      code: false,
      minContextTokens: 0,
      latencyClass: 'INTERACTIVE',
      costClass: 'ECONOMY',
      privacyClass: 'INTERNAL',
    };
  }

  return {
    reasoning: 'MEDIUM',
    structuredOutput: true,
    web: false,
    multimodal: false,
    computer: false,
    code: false,
    minContextTokens: 0,
    latencyClass: 'NORMAL',
    costClass: 'STANDARD',
    privacyClass: 'INTERNAL',
  };
}

function projectPassport(agent: SfiRegisteredCognitiveAgent): SfiCognitivePassport {
  const epistemicMode = EPISTEMIC_MODE_BY_LAYER[agent.layer];
  const returnRequired = RETURN_REQUIRED_IDS.has(agent.id);

  return {
    id: agent.id,
    version: SFI_COGNITIVE_PASSPORT_VERSION,
    name: agent.name,
    purpose: agent.purpose,
    epistemicMode,
    input: {
      required: uniqueSorted(agent.sourceTables),
      optional: ['KernelContext.metadata', 'KernelContext.hypotheses', 'KernelContext.contradictions'],
      acceptedEvidenceClasses: [...ACCEPTED_EVIDENCE_CLASSES],
      requiredEvidenceClasses: [],
      sourcePolicies: [...SOURCE_POLICIES],
    },
    output: {
      allowedEpistemicClasses: [...OUTPUT_CLASSES_BY_MODE[epistemicMode]],
      schemaRef: null,
      confidencePolicy: agent.confidenceModel.method,
      missingPolicy: 'PRESERVE_MISSING_AND_NOT_OBSERVED',
      contradictionPolicy: 'PRESERVE_AND_SURFACE_CONTRADICTIONS',
    },
    tools: {
      // Slice A projects current execution contracts only. Tool authority remains
      // governed by existing runtime owners; passports do not mint tool access.
      allowedToolClasses: [],
      allowedResources: uniqueSorted(agent.readsMemory),
      forbiddenResources: [...FORBIDDEN_RESOURCES],
    },
    modelRequirements: modelRequirementsFor(agent),
    authority: {
      ceiling: AUTHORITY_CEILING_BY_LEGACY_LEVEL[agent.authorityLevel],
      confirmationRequirement: agent.humanApprovalRequired ? 'HUMAN' : 'NONE',
    },
    orchestration: {
      // Adaptive capability negotiation is introduced by a later broker slice.
      // The passport contract exists now, but no capability may self-expand.
      mayRequestCapabilities: false,
      requestableCapabilityIds: [],
      requestableCapabilityClasses: [],
      maxDepth: 0,
      maxChildren: 0,
      stopConditions: ['NO_NEW_INFORMATION_AND_NO_NEW_STATE'],
    },
    return: {
      required: returnRequired,
      condition: returnRequired ? 'REAL_WORLD_OUTCOME_OR_AUTHORIZED_EXTERNAL_SOURCE_OBSERVED' : null,
      falsificationCondition: returnRequired ? 'DECLARED_EXPECTATION_CONTRADICTED_BY_RETURN' : null,
    },
    security: {
      defaultTtlSeconds: 600,
      sensitivityClass: 'INTERNAL',
      loggingRequired: true,
    },
  };
}

export const SFI_COGNITIVE_PASSPORT_REGISTRY: SfiCognitivePassport[] =
  SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map(projectPassport);

const PASSPORT_BY_ID = new Map(
  SFI_COGNITIVE_PASSPORT_REGISTRY.map((passport) => [passport.id, passport] as const),
);

export function cognitivePassportFor(capabilityId: string): SfiCognitivePassport | null {
  return PASSPORT_BY_ID.get(capabilityId) ?? null;
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

export function validateCognitivePassportRegistry(): string[] {
  const errors: string[] = [];
  const sourceById = new Map(SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((agent) => [agent.id, agent] as const));
  const passportIds = SFI_COGNITIVE_PASSPORT_REGISTRY.map((passport) => passport.id);
  const sourceIds = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((agent) => agent.id);

  if (passportIds.length !== sourceIds.length) {
    errors.push(`REGISTRY_COUNT_MISMATCH:${passportIds.length}:${sourceIds.length}`);
  }

  for (const duplicate of duplicateValues(passportIds)) {
    errors.push(`REGISTRY_DUPLICATE_ID:${duplicate}`);
  }

  const passportSet = new Set(passportIds);
  const sourceSet = new Set(sourceIds);
  for (const id of [...sourceSet].filter((value) => !passportSet.has(value)).sort()) errors.push(`REGISTRY_MISSING_ID:${id}`);
  for (const id of [...passportSet].filter((value) => !sourceSet.has(value)).sort()) errors.push(`REGISTRY_UNKNOWN_ID:${id}`);

  for (const passport of SFI_COGNITIVE_PASSPORT_REGISTRY) {
    errors.push(...validateCognitivePassport(passport));
    const source = sourceById.get(passport.id);
    if (!source) continue;

    const expectedCeiling = AUTHORITY_CEILING_BY_LEGACY_LEVEL[source.authorityLevel];
    if (passport.authority.ceiling !== expectedCeiling) {
      errors.push(`${passport.id}:AUTHORITY_EXPANSION:${passport.authority.ceiling}:${expectedCeiling}`);
    }
    if (passport.tools.allowedToolClasses.length > 0) errors.push(`${passport.id}:UNGRANTED_TOOL_AUTHORITY`);
    if (passport.orchestration.mayRequestCapabilities) errors.push(`${passport.id}:ADAPTIVE_REQUEST_AUTHORITY_PREMATURE`);

    const sourceResources = new Set(source.readsMemory);
    for (const resource of passport.tools.allowedResources) {
      if (!sourceResources.has(resource)) errors.push(`${passport.id}:RESOURCE_NOT_IN_SOURCE_CONTRACT:${resource}`);
    }
  }

  return errors.sort();
}
