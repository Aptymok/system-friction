import type { KernelContext } from '@/lib/sfi/cognitive-runtime/kernelContext';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';

export const SFI_AI_GOVERNANCE_POLICY = {
  id: 'SFI-AIMS-2026-08',
  managementSystem: 'ISO/IEC 42001:2023',
  riskGuidance: 'ISO/IEC 23894:2023',
  euTransparencyBaseline: 'EU AI Act Article 50 transparency obligations applicable 2026-08-02',
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
  ] as const,
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
