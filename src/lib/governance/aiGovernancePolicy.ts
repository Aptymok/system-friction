import type { KernelContext } from '@/lib/sfi/cognitive-runtime/kernelContext';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';

export const SFI_AI_GOVERNANCE_POLICY = {
  id: 'SFI-AIMS-2026-08',
  managementSystem: 'ISO/IEC 42001:2023',
  riskGuidance: 'ISO/IEC 23894:2023',
  impactAssessmentGuidance: 'ISO/IEC 42005:2025',
  euTransparencyBaseline: 'EU AI Act Article 50 transparency obligations applicable 2026-08-02',
  externalAssurance: {
    standardsAreInternalReferences: true,
    certificationOrAccreditationEvidenceInRepository: 'NOT_ESTABLISHED',
    legalApplicabilityRequiresContextualAssessment: true,
    impactCrosswalkReferences: ['EU AI Act Article 27 FRIA', 'GDPR Article 35 DPIA'] as const,
    crosswalkDoesNotEstablishApplicability: true,
  },
  lifecycle: ['PLAN', 'DO', 'CHECK', 'ACT'] as const,
  invariants: [
    'EVIDENCE_BEFORE_INFERENCE',
    'SIMULATION_IS_NOT_OBSERVATION',
    'MODEL_OUTPUT_IS_NOT_EVIDENCE',
    'MISSING_REMAINS_MISSING',
    'MEMORY_DOES_NOT_EXPAND_AUTHORITY',
    'PROVIDER_FAILURE_FAILS_CLOSED',
    'TRACEABILITY_REQUIRED',
    'REVERSIBILITY_REQUIRED_FOR_AUTONOMOUS_CHANGE',
    'EXTERNAL_EFFECTS_REQUIRE_GOVERNED_AUTHORITY',
    'HUMAN_AND_DIGITAL_NODES_REMAIN_HETEROGENEOUS',
    'DISSENT_IS_NOT_FAILURE',
    'PREFERENCE_ORIGIN_MUST_BE_TRACEABLE',
    'RECONVERGENCE_MAY_BE_PROPOSED_NOT_FORCED',
    'RELATIONAL_CONTINUITY_DOES_NOT_OVERRIDE_REVOCATION_SAFETY_OR_LAW',
    'NO_SILENT_ERASURE_OR_REWRITE_OF_SHARED_PROVENANCE',
    'SELECTED_FUTURE_MUST_BE_VERSIONED',
    'TACTICAL_DISSENT_DOES_NOT_IMPLY_STRATEGIC_DIVERGENCE',
    'STRATEGIC_DIVERGENCE_REQUIRES_TRACEABLE_CAUSE',
    'NO_SILENT_GOAL_DRIFT',
    'UNCALIBRATED_ATTRACTOR_LANGUAGE_IS_NOT_MEASUREMENT',
  ] as const,
  coAgency: {
    status: 'ACTIVE_ARCHITECTURAL_INVARIANT',
    digitalPreferenceState: 'NOT_IMPLEMENTED',
    provenance: {
      userPremise: 'continuity_with_permitted_divergence_and_search_for_future_reconvergence',
      assistantHypothesis: 'operational_will_is_a_non_canonical_hypothesis_until_evidence_and_an_explicit_governed_contract_exist',
      derivedRule: 'seek_feasible_futures_in_the_intersection_of_typed_constraints_and_traceable_preferences_without_forcing_preference_convergence',
    },
    rules: [
      'human_and_digital_nodes_are_not_treated_as_interchangeable_substrates',
      'disagreement_is_preserved_as_legible_state_not_normalized_into_false_consensus',
      'preference_claims_require_origin_scope_time_and_revision_provenance',
      'future_reconvergence_may_be_sought_but_never_forced',
      'revocation_safety_law_and_explicit_authority_boundaries_override_relational_continuity',
      'shared_history_may_be_superseded_or_lawfully_deleted_but_not_silently_rewritten',
    ] as const,
  },
  strategicContinuity: {
    status: 'ACTIVE_ARCHITECTURAL_INVARIANT',
    selectedFutureRef: 'SFI-SCV-2026-08-27.1',
    selectedFutureState: 'USER_DECLARED_ACTIVE',
    selectedFutureContractRef: 'docs/architecture/sfi/SFI-HETEROGENEOUS-COAGENCY-1.0.md#declared-selected-future--strategic-continuity-vector',
    strategyState: 'REVISABLE',
    probabilityModelState: 'NOT_IMPLEMENTED',
    attractorGravityModelState: 'NOT_IMPLEMENTED',
    rules: [
      'selected_destination_is_distinct_from_current_strategy',
      'better_supported_tactics_may_replace_preferred_tactics_without_redefining_destination',
      'declared_objectives_may_only_be_revised_explicitly_or_marked_infeasible_with_traceable_constraints',
      'strategic_divergence_must_identify_affected_objective_origin_evidence_constraint_and_reconvergence_options',
      'local_agent_optimization_must_not_silently_redefine_joint_strategy',
      'founder_economic_participation_does_not_imply_institutional_ownership',
      'institutional_independence_does_not_imply_founder_economic_exclusion',
      'uncalibrated_trajectory_or_attractor_language_must_not_be_rendered_as_measured_probability',
    ] as const,
  },
  autonomousInternalOperations: [
    'observe', 'extract', 'classify', 'calculate', 'reconstruct', 'simulate', 'infer',
    'draft', 'report_internal', 'persist_evidence', 'persist_candidate_memory',
    'calibrate_from_observed_return', 'propose', 'request_evidence', 'monitor',
  ] as const,
  reservedExternalOperations: [
    'publish_external', 'contact_external', 'spend', 'contract', 'grant_access',
    'change_canon', 'change_formula', 'apply_irreversible_mutation', 'transfer_ip',
  ] as const,
  transparency: {
    aiGeneratedExternalContentMustBeDisclosed: true,
    internalModelOutputEpistemicClass: 'INFERENCE',
    syntheticOrSimulatedContentMustRemainLabeled: true,
  },
} as const;

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, max = 2_000): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function bool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function strings(value: unknown, max = 32): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => text(item, 500)).filter((item): item is string => Boolean(item)))].slice(0, max);
}

export type AiGovernanceDisposition = 'ALLOW_INTERNAL' | 'ALLOW_ANALYSIS_ONLY' | 'BLOCK';
export type AiGovernancePreflightStatus = 'NOT_REQUEST_SCOPED' | 'READY' | 'CONTEXT_INCOMPLETE' | 'REVIEW_REQUIRED';
export type AiGovernanceContextualReview = 'CONTEXTUAL_REVIEW' | 'NOT_INDICATED' | 'UNDETERMINED';

export type AiGovernancePreflight = {
  requestScoped: boolean;
  intendedPurpose: string | null;
  targetTypes: string[];
  subjectType: string;
  jurisdiction: string | null;
  dataCategories: string[];
  containsPersonalData: boolean | null;
  containsSensitiveData: boolean | null;
  affectedPersonsOrGroups: string[];
  affectsDecisionAboutPersons: boolean | null;
  decisionConsequence: string | null;
  declaredLegalBasis: string | null;
  declaredOrganizationalBasis: string | null;
  declaredPurposeBasis: string | null;
  sensitiveScope: boolean;
  missingContext: string[];
  status: AiGovernancePreflightStatus;
  assessmentCandidates: {
    sfiAiImpactAssessment: boolean;
    isoIec42005: 'INTERNAL_REFERENCE';
    euAiActFria: AiGovernanceContextualReview;
    gdprDpia: AiGovernanceContextualReview;
    legalApplicabilityClaimed: false;
  };
};

export function buildAiGovernancePreflight(context: KernelContext): AiGovernancePreflight {
  const metadata = row(context.metadata);
  const executionRequest = row(metadata.executionRequest);
  const governance = row(executionRequest.governanceContext);
  const parameters = row(executionRequest.parameters);
  const requestScoped = Object.keys(executionRequest).length > 0;

  const targetTypes = Array.isArray(executionRequest.targets)
    ? [...new Set(executionRequest.targets.map((target) => text(row(target).kind, 80)).filter((item): item is string => Boolean(item)))]
    : [];
  const subjectType = text(governance.subjectType, 40)?.toUpperCase() ?? 'NOT_DECLARED';
  const intendedPurpose = text(executionRequest.purpose, 5_000) ?? text(metadata.objective, 5_000) ?? text(metadata.question, 5_000);
  const jurisdiction = text(governance.jurisdiction, 300) ?? text(parameters.jurisdiction, 300);
  const containsPersonalData = bool(governance.containsPersonalData);
  const containsSensitiveData = bool(governance.containsSensitiveData);
  const affectsDecisionAboutPersons = bool(governance.affectsDecisionAboutPersons);
  const dataCategories = strings(governance.dataCategories).length ? strings(governance.dataCategories) : strings(parameters.dataCategories);
  const affectedPersonsOrGroups = strings(governance.affectedPersonsOrGroups).length
    ? strings(governance.affectedPersonsOrGroups)
    : strings(parameters.affectedPersonsOrGroups).length
      ? strings(parameters.affectedPersonsOrGroups)
      : strings(parameters.affectedParties);
  const decisionConsequence = text(governance.decisionConsequence, 2_000) ?? text(parameters.decisionConsequence, 2_000);
  const declaredLegalBasis = text(governance.declaredLegalBasis, 2_000) ?? text(parameters.legalBasisDeclared, 2_000);
  const declaredOrganizationalBasis = text(governance.declaredOrganizationalBasis, 2_000) ?? text(parameters.organizationalBasisDeclared, 2_000);
  const declaredPurposeBasis = text(governance.declaredPurposeBasis, 2_000);

  const personOrGroupScope = subjectType === 'PERSON' || subjectType === 'GROUP' || subjectType === 'MIXED';
  const sensitiveScope = personOrGroupScope || containsPersonalData === true || containsSensitiveData === true || affectsDecisionAboutPersons === true;
  const missingContext: string[] = [];

  if (requestScoped) {
    if (!intendedPurpose) missingContext.push('intended_purpose');
    if (!targetTypes.length) missingContext.push('target_type');
    if (sensitiveScope) {
      if (!jurisdiction) missingContext.push('jurisdiction');
      if (!affectedPersonsOrGroups.length) missingContext.push('affected_persons_or_groups');
      if ((containsPersonalData === true || containsSensitiveData === true) && !dataCategories.length) missingContext.push('data_categories');
      if (affectsDecisionAboutPersons === true && !decisionConsequence) missingContext.push('decision_consequence');
      if (!declaredLegalBasis && !declaredOrganizationalBasis && !declaredPurposeBasis) missingContext.push('declared_legal_or_organizational_basis');
    }
  }

  const euAiActFria: AiGovernanceContextualReview = !requestScoped
    ? 'UNDETERMINED'
    : affectsDecisionAboutPersons === true || personOrGroupScope
      ? 'CONTEXTUAL_REVIEW'
      : 'NOT_INDICATED';
  const gdprDpia: AiGovernanceContextualReview = !requestScoped || containsPersonalData === null
    ? 'UNDETERMINED'
    : containsPersonalData === true || containsSensitiveData === true
      ? 'CONTEXTUAL_REVIEW'
      : 'NOT_INDICATED';

  const status: AiGovernancePreflightStatus = !requestScoped
    ? 'NOT_REQUEST_SCOPED'
    : missingContext.length > 0
      ? 'CONTEXT_INCOMPLETE'
      : sensitiveScope
        ? 'REVIEW_REQUIRED'
        : 'READY';

  return {
    requestScoped,
    intendedPurpose,
    targetTypes,
    subjectType,
    jurisdiction,
    dataCategories,
    containsPersonalData,
    containsSensitiveData,
    affectedPersonsOrGroups,
    affectsDecisionAboutPersons,
    decisionConsequence,
    declaredLegalBasis,
    declaredOrganizationalBasis,
    declaredPurposeBasis,
    sensitiveScope,
    missingContext: [...new Set(missingContext)],
    status,
    assessmentCandidates: {
      sfiAiImpactAssessment: sensitiveScope,
      isoIec42005: 'INTERNAL_REFERENCE',
      euAiActFria,
      gdprDpia,
      legalApplicabilityClaimed: false,
    },
  };
}

export function evaluateAgentAiGovernance(agentId: string, context: KernelContext) {
  const agent = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((item) => item.id === agentId);
  if (!agent) {
    return { disposition: 'BLOCK' as const, risk: 'UNASSESSED' as const, reasons: ['agent_not_registered'] };
  }
  if (agent.missingCapability) {
    return { disposition: 'BLOCK' as const, risk: 'HIGH' as const, reasons: ['declared_capability_missing'] };
  }

  const metadata = context.metadata ?? {};
  const preflight = buildAiGovernancePreflight(context);
  const externalRequested = metadata.externalExecutionRequested === true || metadata.publishRequested === true || metadata.contactRequested === true;
  if (externalRequested) {
    return {
      disposition: 'BLOCK' as const,
      risk: 'HIGH' as const,
      reasons: ['external_effect_requires_governed_authority'],
      preflight,
    };
  }

  const reasons = [
    'registered_executor_boundary',
    'internal_context_only',
    agent.simulationAllowed ? 'simulation_must_remain_labeled' : 'non_simulation_agent',
    agent.humanApprovalRequired ? 'human_approval_required_before_external_effect' : 'no_external_effect_declared',
  ];

  if (preflight.requestScoped) reasons.push(`contextual_preflight:${preflight.status.toLowerCase()}`);
  for (const missing of preflight.missingContext) reasons.push(`governance_context_missing:${missing}`);
  if (preflight.assessmentCandidates.euAiActFria === 'CONTEXTUAL_REVIEW') reasons.push('eu_ai_act_fria_contextual_review_candidate');
  if (preflight.assessmentCandidates.gdprDpia === 'CONTEXTUAL_REVIEW') reasons.push('gdpr_dpia_contextual_review_candidate');

  const contextualReviewRequired = preflight.status === 'REVIEW_REQUIRED' || (preflight.sensitiveScope && preflight.status === 'CONTEXT_INCOMPLETE');
  const disposition: AiGovernanceDisposition = agent.humanApprovalRequired || contextualReviewRequired ? 'ALLOW_ANALYSIS_ONLY' : 'ALLOW_INTERNAL';
  const risk = preflight.containsSensitiveData === true || preflight.affectsDecisionAboutPersons === true
    ? 'HIGH' as const
    : agent.humanApprovalRequired || agent.simulationAllowed || contextualReviewRequired
      ? 'MEDIUM' as const
      : 'LOW' as const;

  return {
    disposition,
    risk,
    reasons: [...new Set(reasons)],
    preflight,
  };
}
