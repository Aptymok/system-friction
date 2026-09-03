import {
  SFI_EPISTEMIC_OUTPUT_RELATIONS,
  type SfiEpistemicOutputRelation,
} from '@/core/contracts/sfi';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';

export const SFI_EXECUTION_CONTRACT_VERSION = 'SFI-EXECUTION-CONTRACT-1.0' as const;

export type SfiExecutionTargetKind = 'CASE' | 'PROJECT' | 'EVIDENCE' | 'CYCLE' | 'NODE';
export type SfiExecutionAnchorKind = 'CASE' | 'PROJECT' | 'CYCLE' | 'NODE' | 'ANALYSIS_SESSION';
export type SfiExecutionDirection = 'A_TO_B' | 'B_TO_A' | 'BIDIRECTIONAL' | 'EXPLORE';
export type SfiExecutionOutputClass = SfiEpistemicOutputRelation;

export type SfiExecutionObjectRef<K extends string = string> = {
  kind: K;
  id: string;
  label?: string | null;
};

export type SfiExecutionTimeRange = {
  from: string | null;
  to: string | null;
  timezone: string | null;
};

export type SfiExecutionGovernanceContext = {
  subjectType: 'SYSTEM' | 'ORGANIZATION' | 'PERSON' | 'GROUP' | 'MIXED' | 'NOT_DECLARED';
  jurisdiction: string | null;
  containsPersonalData: boolean | null;
  containsSensitiveData: boolean | null;
  affectsDecisionAboutPersons: boolean | null;
  declaredPurposeBasis: string | null;
};

export type SfiExecutionRequest = {
  executionId: string;
  agentId: string;
  purpose: string;
  anchors: Array<SfiExecutionObjectRef<SfiExecutionAnchorKind>>;
  targets: Array<SfiExecutionObjectRef<SfiExecutionTargetKind>>;
  evidenceIds: string[];
  sourceUrls: string[];
  timeRange: SfiExecutionTimeRange | null;
  direction: SfiExecutionDirection | null;
  parameters: Record<string, unknown>;
  requestedOutputs: SfiExecutionOutputClass[];
  governanceContext: SfiExecutionGovernanceContext;
  legacyCompatibilityUsed: boolean;
};

export type SfiExecutionContract = {
  version: typeof SFI_EXECUTION_CONTRACT_VERSION;
  agentId: string;
  agentName: string;
  purpose: string;
  minTargets: number;
  maxTargets: number;
  allowedTargetKinds: SfiExecutionTargetKind[];
  allowedAnchorKinds: SfiExecutionAnchorKind[];
  acceptsEvidenceRefs: boolean;
  acceptsSourceUrls: boolean;
  timeRange: 'OPTIONAL' | 'REQUIRED' | 'NOT_APPLICABLE';
  allowedDirections: SfiExecutionDirection[];
  requiredParameters: string[];
  optionalParameters: string[];
  requestedOutputs: SfiExecutionOutputClass[];
  governanceProfile: 'STANDARD' | 'SIMULATION' | 'SENSITIVE_POSSIBLE' | 'ORCHESTRATION' | 'CALIBRATION';
  forbiddenClaims: string[];
};

type Row = Record<string, unknown>;

const TARGET_KINDS: SfiExecutionTargetKind[] = ['CASE', 'PROJECT', 'EVIDENCE', 'CYCLE', 'NODE'];
const ANCHOR_KINDS: SfiExecutionAnchorKind[] = ['CASE', 'PROJECT', 'CYCLE', 'NODE', 'ANALYSIS_SESSION'];
const DIRECTIONS: SfiExecutionDirection[] = ['A_TO_B', 'B_TO_A', 'BIDIRECTIONAL', 'EXPLORE'];
const OUTPUT_CLASSES: SfiExecutionOutputClass[] = [...SFI_EPISTEMIC_OUTPUT_RELATIONS];

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, max = 4_000): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function bool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function uniqueStrings(value: unknown, max = 50): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => text(item, 2_000)).filter((item): item is string => Boolean(item)))].slice(0, max);
}

function targetKind(value: unknown): SfiExecutionTargetKind | null {
  const candidate = text(value, 40)?.toUpperCase();
  return candidate && TARGET_KINDS.includes(candidate as SfiExecutionTargetKind)
    ? candidate as SfiExecutionTargetKind
    : null;
}

function anchorKind(value: unknown): SfiExecutionAnchorKind | null {
  const candidate = text(value, 40)?.toUpperCase();
  return candidate && ANCHOR_KINDS.includes(candidate as SfiExecutionAnchorKind)
    ? candidate as SfiExecutionAnchorKind
    : null;
}

function direction(value: unknown): SfiExecutionDirection | null {
  const candidate = text(value, 40)?.toUpperCase();
  return candidate && DIRECTIONS.includes(candidate as SfiExecutionDirection)
    ? candidate as SfiExecutionDirection
    : null;
}

function outputClass(value: unknown): SfiExecutionOutputClass | null {
  const candidate = text(value, 50)?.toUpperCase();
  return candidate && OUTPUT_CLASSES.includes(candidate as SfiExecutionOutputClass)
    ? candidate as SfiExecutionOutputClass
    : null;
}

function objectRef<K extends string>(value: unknown, parseKind: (candidate: unknown) => K | null): SfiExecutionObjectRef<K> | null {
  const source = row(value);
  const kind = parseKind(source.kind);
  const id = text(source.id, 500);
  if (!kind || !id) return null;
  return { kind, id, label: text(source.label, 500) };
}

function objectRefs<K extends string>(value: unknown, parseKind: (candidate: unknown) => K | null, max = 24) {
  if (!Array.isArray(value)) return [] as Array<SfiExecutionObjectRef<K>>;
  const seen = new Set<string>();
  const refs: Array<SfiExecutionObjectRef<K>> = [];
  for (const candidate of value) {
    const ref = objectRef(candidate, parseKind);
    if (!ref) continue;
    const key = `${ref.kind}:${ref.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push(ref);
    if (refs.length >= max) break;
  }
  return refs;
}

function normalizeTimeRange(value: unknown): SfiExecutionTimeRange | null {
  const source = row(value);
  const from = text(source.from, 120);
  const to = text(source.to, 120);
  const timezone = text(source.timezone, 120);
  return from || to || timezone ? { from, to, timezone } : null;
}

function normalizeGovernanceContext(value: unknown): SfiExecutionGovernanceContext {
  const source = row(value);
  const rawSubject = text(source.subjectType, 40)?.toUpperCase();
  const allowedSubjects: SfiExecutionGovernanceContext['subjectType'][] = ['SYSTEM', 'ORGANIZATION', 'PERSON', 'GROUP', 'MIXED', 'NOT_DECLARED'];
  const subjectType = rawSubject && allowedSubjects.includes(rawSubject as SfiExecutionGovernanceContext['subjectType'])
    ? rawSubject as SfiExecutionGovernanceContext['subjectType']
    : 'NOT_DECLARED';
  return {
    subjectType,
    jurisdiction: text(source.jurisdiction, 200),
    containsPersonalData: bool(source.containsPersonalData),
    containsSensitiveData: bool(source.containsSensitiveData),
    affectsDecisionAboutPersons: bool(source.affectsDecisionAboutPersons),
    declaredPurposeBasis: text(source.declaredPurposeBasis, 1_000),
  };
}

function defaultOutputs(agent: (typeof SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY)[number]): SfiExecutionOutputClass[] {
  if (agent.layer === 'observe') return ['OBSERVATION', 'INFERENCE', 'NOT_EXECUTED'];
  if (agent.layer === 'simulate') return ['INFERENCE', 'HYPOTHESIS', 'PROJECTION', 'RECOMMENDATION', 'NOT_EXECUTED'];
  if (agent.layer === 'project') return ['PROJECTION', 'INFERENCE', 'RECOMMENDATION', 'NOT_EXECUTED'];
  if (agent.layer === 'learn') return ['DERIVED', 'INFERENCE', 'RECOMMENDATION', 'NOT_EXECUTED'];
  return ['INFERENCE', 'HYPOTHESIS', 'RECOMMENDATION', 'NOT_EXECUTED'];
}

function defaultContract(agent: (typeof SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY)[number]): SfiExecutionContract {
  return {
    version: SFI_EXECUTION_CONTRACT_VERSION,
    agentId: agent.id,
    agentName: agent.name,
    purpose: agent.purpose,
    minTargets: 1,
    maxTargets: 8,
    allowedTargetKinds: [...TARGET_KINDS],
    allowedAnchorKinds: [...ANCHOR_KINDS],
    acceptsEvidenceRefs: true,
    acceptsSourceUrls: agent.domain === 'evidence',
    timeRange: 'OPTIONAL',
    allowedDirections: [],
    requiredParameters: [],
    optionalParameters: ['question', 'hypothesis', 'constraints'],
    requestedOutputs: defaultOutputs(agent),
    governanceProfile: agent.simulationAllowed ? 'SIMULATION' : 'STANDARD',
    forbiddenClaims: [
      'Do not convert context into admitted evidence by association.',
      'Do not claim an external effect, RETURN, learning or canon promotion that was not observed.',
      'Do not expand authority from model capability or confidence.',
    ],
  };
}

const SPECIFIC: Record<string, Partial<SfiExecutionContract>> = {
  evidence_hunter: {
    allowedTargetKinds: ['CASE', 'PROJECT', 'EVIDENCE', 'CYCLE', 'NODE'],
    acceptsEvidenceRefs: true,
    acceptsSourceUrls: true,
    optionalParameters: ['query', 'inclusionCriteria', 'exclusionCriteria', 'depth', 'sourcePolicy'],
    requestedOutputs: ['INFERENCE', 'RECOMMENDATION', 'NOT_EXECUTED'],
    governanceProfile: 'STANDARD',
    forbiddenClaims: [
      'A discovered source is a source candidate, not automatically admitted evidence.',
      'Do not claim that absence of search results proves absence in reality.',
    ],
  },
  cross_impact: {
    minTargets: 2,
    maxTargets: 12,
    allowedTargetKinds: ['NODE', 'EVIDENCE'],
    acceptsEvidenceRefs: true,
    acceptsSourceUrls: false,
    allowedDirections: [...DIRECTIONS],
    optionalParameters: ['baseline', 'horizon', 'hypothesis', 'interactionMetric', 'constraints'],
    requestedOutputs: ['DERIVED', 'INFERENCE', 'HYPOTHESIS', 'PROJECTION', 'RECOMMENDATION', 'NOT_EXECUTED'],
    governanceProfile: 'SIMULATION',
    forbiddenClaims: [
      'Do not declare causality solely from association or coupling.',
      'Do not render simulated interaction as observed interaction.',
    ],
  },
  risk_agent: {
    allowedTargetKinds: ['CASE', 'PROJECT', 'EVIDENCE', 'CYCLE', 'NODE'],
    acceptsEvidenceRefs: true,
    optionalParameters: ['horizon', 'tolerance', 'scenario', 'affectedParties', 'decisionConsequence'],
    requestedOutputs: ['DERIVED', 'INFERENCE', 'HYPOTHESIS', 'RECOMMENDATION', 'NOT_EXECUTED'],
    governanceProfile: 'SENSITIVE_POSSIBLE',
    forbiddenClaims: [
      'A risk estimate is not an executive decision.',
      'Do not infer personal risk attributes without an explicit legitimate context and governance review.',
    ],
  },
  temporal_resolver: {
    allowedTargetKinds: ['CASE', 'PROJECT', 'EVIDENCE', 'CYCLE', 'NODE'],
    acceptsEvidenceRefs: true,
    timeRange: 'OPTIONAL',
    optionalParameters: ['timezone', 'businessCalendar', 'sla', 'allowedPrecedence', 'observationWindow'],
    requestedOutputs: ['DERIVED', 'INFERENCE', 'NOT_EXECUTED'],
    forbiddenClaims: [
      'Do not invent a timestamp, ordering or duration that is not derivable from supplied records.',
    ],
  },
  trajectory_agent: {
    allowedTargetKinds: ['CASE', 'PROJECT', 'CYCLE', 'NODE', 'EVIDENCE'],
    acceptsEvidenceRefs: true,
    timeRange: 'OPTIONAL',
    optionalParameters: ['initialState', 'attractor', 'horizon', 'scenarios', 'knownPerturbations', 'worldVectorRef'],
    requestedOutputs: ['DERIVED', 'INFERENCE', 'HYPOTHESIS', 'PROJECTION', 'RECOMMENDATION', 'NOT_EXECUTED'],
    governanceProfile: 'SIMULATION',
    forbiddenClaims: [
      'A projected trajectory is not an observed future.',
      'Do not render uncalibrated attractor language as measured probability.',
    ],
  },
  reality_calibration: {
    allowedTargetKinds: ['CASE', 'CYCLE', 'EVIDENCE', 'NODE'],
    acceptsEvidenceRefs: true,
    sourceUrls: undefined,
    optionalParameters: ['predictionRef', 'returnRef', 'tolerance', 'comparisonPeriod'],
    requestedOutputs: ['DERIVED', 'INFERENCE', 'RECOMMENDATION', 'NOT_EXECUTED'],
    governanceProfile: 'CALIBRATION',
    forbiddenClaims: [
      'Do not claim calibration without a comparable observed RETURN/outcome.',
      'Do not treat a model restatement as RETURN evidence.',
    ],
  } as Partial<SfiExecutionContract>,
  policy_simulator: {
    allowedTargetKinds: ['CASE', 'PROJECT', 'CYCLE', 'NODE'],
    acceptsEvidenceRefs: true,
    optionalParameters: ['baseline', 'alternatives', 'constraints', 'jurisdiction', 'affectedParties', 'expectedEffects'],
    requestedOutputs: ['INFERENCE', 'HYPOTHESIS', 'PROJECTION', 'RECOMMENDATION', 'NOT_EXECUTED'],
    governanceProfile: 'SENSITIVE_POSSIBLE',
    forbiddenClaims: [
      'A simulated policy impact is not an observed impact.',
      'Do not bypass the intervention/governance authority boundary.',
    ],
  },
  social_field_simulator: {
    allowedTargetKinds: ['CASE', 'PROJECT', 'CYCLE', 'NODE'],
    acceptsEvidenceRefs: true,
    optionalParameters: ['cohortDefinition', 'aggregation', 'permittedVariables', 'purpose', 'legalBasisDeclared'],
    requestedOutputs: ['INFERENCE', 'HYPOTHESIS', 'PROJECTION', 'RECOMMENDATION', 'NOT_EXECUTED'],
    governanceProfile: 'SENSITIVE_POSSIBLE',
    forbiddenClaims: [
      'Do not silently convert system/cohort analysis into individual social scoring.',
      'Do not infer protected or sensitive personal attributes without an explicitly governed basis.',
    ],
  },
  psychological_simulator: {
    allowedTargetKinds: ['CASE', 'PROJECT', 'CYCLE', 'NODE'],
    acceptsEvidenceRefs: true,
    optionalParameters: ['cohortDefinition', 'aggregation', 'permittedVariables', 'purpose', 'legalBasisDeclared'],
    requestedOutputs: ['INFERENCE', 'HYPOTHESIS', 'PROJECTION', 'RECOMMENDATION', 'NOT_EXECUTED'],
    governanceProfile: 'SENSITIVE_POSSIBLE',
    forbiddenClaims: [
      'Do not infer hidden emotional or psychological state as fact from insufficient traces.',
      'Do not turn a simulation into an individual employment, education or rights decision.',
    ],
  },
  meta_orchestrator: {
    allowedTargetKinds: ['CASE', 'PROJECT', 'CYCLE', 'NODE'],
    acceptsEvidenceRefs: true,
    optionalParameters: ['allowedAgents', 'budget', 'deadline', 'constraints', 'stopConditions'],
    requestedOutputs: ['DERIVED', 'INFERENCE', 'RECOMMENDATION', 'NOT_EXECUTED'],
    governanceProfile: 'ORCHESTRATION',
    forbiddenClaims: [
      'Orchestration does not expand the authority of downstream agents.',
      'Do not bypass a downstream approval or evidence gate.',
    ],
  },
  context_builder: {
    allowedTargetKinds: ['CASE', 'PROJECT', 'CYCLE', 'NODE', 'EVIDENCE'],
    acceptsEvidenceRefs: true,
    acceptsSourceUrls: true,
    optionalParameters: ['dimensions', 'actors', 'forces', 'constraints', 'sourcePolicy'],
    requestedOutputs: ['DERIVED', 'INFERENCE', 'HYPOTHESIS', 'NOT_EXECUTED'],
    forbiddenClaims: [
      'Context adjacency does not promote a record or source candidate to admitted evidence.',
    ],
  },
  historical_scout: {
    allowedTargetKinds: ['CASE', 'PROJECT', 'CYCLE', 'NODE', 'EVIDENCE'],
    acceptsEvidenceRefs: true,
    acceptsSourceUrls: true,
    optionalParameters: ['period', 'sources', 'terms', 'entities', 'sourcePolicy'],
    requestedOutputs: ['DERIVED', 'INFERENCE', 'HYPOTHESIS', 'NOT_EXECUTED'],
    forbiddenClaims: [
      'Do not fabricate historical continuity across missing intervals.',
      'A structurally similar precedent is not proof of the same causal history.',
    ],
  },
  field_observer: {
    allowedTargetKinds: ['CASE', 'PROJECT', 'CYCLE', 'NODE', 'EVIDENCE'],
    acceptsEvidenceRefs: true,
    acceptsSourceUrls: true,
    optionalParameters: ['sourcePolicy', 'period', 'signalDefinition'],
    requestedOutputs: ['OBSERVATION', 'DERIVED', 'INFERENCE', 'NOT_EXECUTED'],
    forbiddenClaims: [
      'Do not infer meaning solely from a metric without the required evidence/context.',
      'A public source claim remains a candidate until admitted through evidence governance.',
    ],
  },
};

export function executionContractForAgent(agentId: string): SfiExecutionContract | null {
  const agent = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((item) => item.id === agentId);
  if (!agent) return null;
  const base = defaultContract(agent);
  const override = SPECIFIC[agentId] ?? {};
  return {
    ...base,
    ...override,
    version: SFI_EXECUTION_CONTRACT_VERSION,
    agentId: agent.id,
    agentName: agent.name,
    purpose: agent.purpose,
  };
}

export function listExecutionContracts(): SfiExecutionContract[] {
  return SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY
    .map((agent) => executionContractForAgent(agent.id))
    .filter((contract): contract is SfiExecutionContract => Boolean(contract));
}

export function normalizeExecutionRequest(agentId: string, value: unknown, executionId: string): SfiExecutionRequest {
  const source = row(value);
  const legacyTargetKind = targetKind(source.targetKind);
  const legacyTargetId = text(source.targetId, 500);
  const explicitTargets = objectRefs(source.targets, targetKind);
  const targets = explicitTargets.length
    ? explicitTargets
    : legacyTargetKind && legacyTargetId
      ? [{ kind: legacyTargetKind, id: legacyTargetId }]
      : [];

  const explicitAnchors = Array.isArray(source.anchors)
    ? objectRefs(source.anchors, anchorKind)
    : [];
  const anchors = explicitAnchors.length
    ? explicitAnchors
    : [{ kind: 'ANALYSIS_SESSION' as const, id: `analysis:${executionId}`, label: 'ROOT manual analysis session' }];

  const purpose = text(source.purpose, 5_000)
    ?? text(source.instruction, 5_000)
    ?? 'Observa los objetos seleccionados y devuelve únicamente lo que esta capacidad pueda sostener.';

  const legacyUrl = text(source.url, 2_000);
  const sourceUrls = [...new Set([
    ...uniqueStrings(source.sourceUrls, 20),
    ...(legacyUrl ? [legacyUrl] : []),
  ])];

  const legacyHypothesis = text(source.hypothesis, 3_000);
  const parameters = {
    ...row(source.parameters),
    ...(legacyHypothesis && row(source.parameters).hypothesis === undefined ? { hypothesis: legacyHypothesis } : {}),
  };

  const requestedOutputs = Array.isArray(source.requestedOutputs)
    ? source.requestedOutputs.map(outputClass).filter((item): item is SfiExecutionOutputClass => Boolean(item))
    : [];

  return {
    executionId,
    agentId,
    purpose,
    anchors,
    targets,
    evidenceIds: uniqueStrings(source.evidenceIds, 50),
    sourceUrls,
    timeRange: normalizeTimeRange(source.timeRange),
    direction: direction(source.direction),
    parameters,
    requestedOutputs,
    governanceContext: normalizeGovernanceContext(source.governanceContext),
    legacyCompatibilityUsed: explicitTargets.length === 0 && Boolean(legacyTargetKind && legacyTargetId),
  };
}

export function validateExecutionRequest(contract: SfiExecutionContract, request: SfiExecutionRequest) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!request.purpose.trim()) errors.push('purpose_required');
  if (!request.anchors.length) errors.push('context_anchor_required');
  if (request.targets.length < contract.minTargets) errors.push(`minimum_targets_required:${contract.minTargets}`);
  if (request.targets.length > contract.maxTargets) errors.push(`maximum_targets_exceeded:${contract.maxTargets}`);

  for (const anchor of request.anchors) {
    if (!contract.allowedAnchorKinds.includes(anchor.kind)) errors.push(`anchor_kind_not_allowed:${anchor.kind}`);
  }
  for (const target of request.targets) {
    if (!contract.allowedTargetKinds.includes(target.kind)) errors.push(`target_kind_not_allowed:${target.kind}`);
  }

  if (request.evidenceIds.length && !contract.acceptsEvidenceRefs) errors.push('evidence_refs_not_allowed');
  if (request.sourceUrls.length && !contract.acceptsSourceUrls) errors.push('source_urls_not_allowed');
  if (contract.timeRange === 'REQUIRED' && !request.timeRange) errors.push('time_range_required');
  if (contract.timeRange === 'NOT_APPLICABLE' && request.timeRange) warnings.push('time_range_ignored_by_contract');

  if (request.direction && !contract.allowedDirections.includes(request.direction)) errors.push(`direction_not_allowed:${request.direction}`);
  for (const key of contract.requiredParameters) {
    if (request.parameters[key] === undefined || request.parameters[key] === null || request.parameters[key] === '') {
      errors.push(`required_parameter_missing:${key}`);
    }
  }

  if (request.requestedOutputs.length) {
    for (const output of request.requestedOutputs) {
      if (!contract.requestedOutputs.includes(output)) errors.push(`output_class_not_allowed:${output}`);
    }
  }

  if (request.governanceContext.subjectType === 'PERSON' || request.governanceContext.subjectType === 'GROUP' || request.governanceContext.subjectType === 'MIXED') {
    if (contract.governanceProfile === 'SENSITIVE_POSSIBLE') warnings.push('sensitive_context_requires_contextual_governance_preflight');
  }
  if (request.governanceContext.containsSensitiveData === true) warnings.push('sensitive_data_declared');
  if (request.governanceContext.affectsDecisionAboutPersons === true) warnings.push('person_affecting_decision_declared');
  if (request.legacyCompatibilityUsed) warnings.push('legacy_single_target_request_normalized');

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
  };
}

export function compactExecutionContract(contract: SfiExecutionContract) {
  return {
    version: contract.version,
    agentId: contract.agentId,
    agentName: contract.agentName,
    purpose: contract.purpose,
    minTargets: contract.minTargets,
    maxTargets: contract.maxTargets,
    allowedTargetKinds: contract.allowedTargetKinds,
    allowedAnchorKinds: contract.allowedAnchorKinds,
    acceptsEvidenceRefs: contract.acceptsEvidenceRefs,
    acceptsSourceUrls: contract.acceptsSourceUrls,
    timeRange: contract.timeRange,
    allowedDirections: contract.allowedDirections,
    requiredParameters: contract.requiredParameters,
    optionalParameters: contract.optionalParameters,
    requestedOutputs: contract.requestedOutputs,
    governanceProfile: contract.governanceProfile,
    forbiddenClaims: contract.forbiddenClaims,
  };
}
