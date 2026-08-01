import {
  FieldObserverAgent,
  EvidenceHunterAgent,
  HistoricalScoutAgent,
  PhenotypeResolverAgent,
  ContextBuilderAgent,
  TemporalResolverAgent,
  MetaOrchestratorAgent,
  SocialFieldSimulatorAgent,
  EconomicFieldSimulatorAgent,
  CulturalFieldSimulatorAgent,
  PsychologicalFieldSimulatorAgent,
  PolicyFieldSimulatorAgent,
  FrictionFieldSimulatorAgent,
  MultiStakeholderBootstrapAgent,
  CrossImpactAgent,
  EntropyRedistributionAgent,
  ProjectExecutionManagerAgent,
  RealityCalibrationAgent,
  RiskAgent,
  OpportunityDiscoveryAgent,
  TrajectoryAgent,
} from "./agents";


import type {
  KernelContext
} from "./kernelContext";


export type CognitiveAgentExecutor =
(
  context: KernelContext
) => KernelContext;


export const SFI_AGENT_EXECUTION_MAP:
Record<string, CognitiveAgentExecutor> = {

  meta_orchestrator:
    MetaOrchestratorAgent,

  evidence_hunter:
    EvidenceHunterAgent,

  historical_scout:
    HistoricalScoutAgent,

  phenotype_resolver:
    PhenotypeResolverAgent,

  context_builder:
    ContextBuilderAgent,

  temporal_resolver:
    TemporalResolverAgent,

  social_field_simulator:
    SocialFieldSimulatorAgent,

  economic_field_simulator:
    EconomicFieldSimulatorAgent,

  cultural_simulator:
    CulturalFieldSimulatorAgent,

  psychological_simulator:
    PsychologicalFieldSimulatorAgent,

  policy_simulator:
    PolicyFieldSimulatorAgent,

  friction_field_simulator:
    FrictionFieldSimulatorAgent,

  multi_stakeholder_bootstrap:
    MultiStakeholderBootstrapAgent,

  cross_impact:
    CrossImpactAgent,

  entropy_redistribution:
    EntropyRedistributionAgent,

  project_execution_manager:
    ProjectExecutionManagerAgent,

  reality_calibration:
    RealityCalibrationAgent,

  risk_agent:
    RiskAgent,

  opportunity_agent:
    OpportunityDiscoveryAgent,

  trajectory_agent:
    TrajectoryAgent,
};


export function executeRegisteredAgent(
  agentId: string,
  context: KernelContext
): KernelContext {


  const executor =
    SFI_AGENT_EXECUTION_MAP[agentId];


  if (!executor) {

    return context;

  }


  return executor(
    context
  );

}
