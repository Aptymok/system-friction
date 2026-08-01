import {
  MetaOrchestratorAgent
} from "./agents/metaOrchestrator";

import {
  EvidenceHunterAgent
} from "./agents/evidenceHunter";

import {
  HistoricalScoutAgent
} from "./agents/historicalscout";

import {
  FieldObserverAgent
} from "./agents/fieldObserver";

import {
  PhenotypeResolverAgent
} from "./agents/phenotypeResolver";

import {
  ContextBuilderAgent
} from "./agents/contextBuilder";

import {
  TemporalResolverAgent
} from "./agents/temporalResolver";

import {
  SocialFieldSimulatorAgent
} from "./agents/socialFieldSimulator";

import {
  EconomicFieldSimulatorAgent
} from "./agents/economicFieldSimulator";

import {
  PolicyFieldSimulatorAgent
} from "./agents/policyFieldSimulator";

import {
  CulturalFieldSimulatorAgent
} from "./agents/culturalFieldSimulator";

import {
  PsychologicalFieldSimulatorAgent
} from "./agents/psychologicalFieldSimulator";

import {
  FrictionFieldSimulatorAgent
} from "./agents/frictionFieldSimulator";

import {
  RealityCalibrationAgent
} from "./agents/realityCalibrationAgent";

import {
  RiskAgent
} from "./agents/riskAgent";

import {
  OpportunityDiscoveryAgent
} from "./agents/opportunityDiscovery";

import {
  CrossImpactAgent
} from "./agents/crossImpact";

import {
  TrajectoryAgent
} from "./agents/trajectoryAgent";

import {
  ProjectExecutionManagerAgent
} from "./agents/projectExecutionManager";

import {
  MultiStakeholderBootstrapAgent
} from "./agents/multiStakeholderBootstrap";


export const AGENT_LOADER = {

  meta_orchestrator:
    MetaOrchestratorAgent,

  evidence_hunter:
    EvidenceHunterAgent,

  historical_scout:
    HistoricalScoutAgent,

  field_observer:
    FieldObserverAgent,

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

  policy_simulator:
    PolicyFieldSimulatorAgent,

  cultural_simulator:
    CulturalFieldSimulatorAgent,

  psychological_simulator:
    PsychologicalFieldSimulatorAgent,

  friction_field_simulator:
    FrictionFieldSimulatorAgent,

  reality_calibration:
    RealityCalibrationAgent,

  risk_agent:
    RiskAgent,

  opportunity_agent:
    OpportunityDiscoveryAgent,

  cross_impact:
    CrossImpactAgent,

  trajectory_agent:
    TrajectoryAgent,

  project_execution_manager:
    ProjectExecutionManagerAgent,

  multi_stakeholder_bootstrap:
    MultiStakeholderBootstrapAgent

} as const;