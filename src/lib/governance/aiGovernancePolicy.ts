import type { KernelContext } from '@/lib/sfi/cognitive-runtime/kernelContext';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';

export const SFI_AI_GOVERNANCE_POLICY = {
  id: 'SFI-AIMS-2026-08',
  managementSystem: 'ISO/IEC 42001:2023',
  riskGuidance: 'ISO/IEC 23894:2023',
  euTransparencyBaseline: 'EU AI Act Article 50 transparency obligations applicable 2026-08-02',
  externalAssurance: {
    standardsAreInternalReferences: true,
    certificationOrAccreditationEvidenceInRepository: 'NOT_ESTABLISHED',
    legalApplicabilityRequiresContextualAssessment: true,
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

export type AiGovernanceDisposition = 'ALLOW_INTERNAL' | 'ALLOW_ANALYSIS_ONLY' | 'BLOCK';

export function evaluateAgentAiGovernance(agentId: string, context: KernelContext) {
  const agent = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((item) => item.id === agentId);
  if (!agent) {
    return { disposition: 'BLOCK' as const, risk: 'UNASSESSED' as const, reasons: ['agent_not_registered'] };
  }
  if (agent.missingCapability) {
    return { disposition: 'BLOCK' as const, risk: 'HIGH' as const, reasons: ['declared_capability_missing'] };
  }

  const metadata = context.metadata ?? {};
  const externalRequested = metadata.externalExecutionRequested === true || metadata.publishRequested === true || metadata.contactRequested === true;
  if (externalRequested) {
    return {
      disposition: 'BLOCK' as const,
      risk: 'HIGH' as const,
      reasons: ['external_effect_requires_governed_authority'],
    };
  }

  const reasons = [
    'registered_executor_boundary',
    'internal_context_only',
    agent.simulationAllowed ? 'simulation_must_remain_labeled' : 'non_simulation_agent',
    agent.humanApprovalRequired ? 'human_approval_required_before_external_effect' : 'no_external_effect_declared',
  ];

  return {
    disposition: agent.humanApprovalRequired ? 'ALLOW_ANALYSIS_ONLY' as const : 'ALLOW_INTERNAL' as const,
    risk: agent.humanApprovalRequired || agent.simulationAllowed ? 'MEDIUM' as const : 'LOW' as const,
    reasons,
  };
}
