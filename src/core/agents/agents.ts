import { SfiAgent } from './base';

import type {
  AgentDefinition,
  AgentResult,
  KernelContext,
  KernelEvidence,
  MemoryWriteDefinition,
} from '@/core/contracts';

import { EvidenceHunterAgent as runEvidenceHunter } from './evidenceHunter';
import { TemporalResolverAgent as runTemporalResolver } from './temporalResolver';
import { TrajectoryAgent as runTrajectoryAgent } from './trajectoryAgent';
import { RealityCalibrationAgent as runRealityCalibration } from './realityCalibrationAgent';
import { RiskAgent as runRiskAgent } from './riskAgent';
import { OpportunityDiscoveryAgent as runOpportunityDiscovery } from './opportunityDiscovery';
import { HistoricalScoutAgent as runHistoricalScout } from './historicalscout';
import { PhenotypeResolverAgent as runPhenotypeResolver } from './phenotypeResolver';
import { ContextBuilderAgent as runContextBuilder } from './contextBuilder';
import { SocialFieldSimulatorAgent as runSocialFieldSimulator } from './socialFieldSimulator';
import { EconomicFieldSimulatorAgent as runEconomicFieldSimulator } from './economicFieldSimulator';
import { PolicyFieldSimulatorAgent as runPolicyFieldSimulator } from './policyFieldSimulator';
import { CulturalFieldSimulatorAgent as runCulturalFieldSimulator } from './culturalFieldSimulator';
import { PsychologicalFieldSimulatorAgent as runPsychologicalFieldSimulator } from './psychologicalFieldSimulator';
import { MultiStakeholderBootstrapAgent as runMultiStakeholderBootstrap } from './multiStakeholderBootstrap';
import { ProjectExecutionManagerAgent as runProjectExecutionManager } from './projectExecutionManager';

export { SfiAgent } from './base';

type AgentExecutor = (context: KernelContext) => KernelContext;

type CoreAgentConfig = {
  id: string;
  name: string;
  type: string;
  capabilities: string[];
  readsMemory: string[];
  writesMemory: MemoryWriteDefinition[];
  emits: string[];
  humanApprovalRequired: boolean;
  confidenceModel: string;
  executor: AgentExecutor;
  evidenceSource: string;
  assessExecution?: (input: {
    context: KernelContext;
    before: ContextCounts;
    after: ContextCounts;
    change: ContextCounts;
    producedEvidence: KernelEvidence[];
  }) => {
    operational: boolean;
    reason: string;
    confidence?: number;
  };
};

type ContextCounts = {
  evidence: number;
  hypotheses: number;
  contradictions: number;
  simulations: number;
  risks: number;
  opportunities: number;
  predictions: number;
};

const EPISTEMIC_WRITE: MemoryWriteDefinition = {
  entityType: 'EPISTEMIC_EVENT',
  operation: 'CREATE',
};

function counts(context: KernelContext): ContextCounts {
  return {
    evidence: context.evidence.length,
    hypotheses: context.hypotheses.length,
    contradictions: context.contradictions.length,
    simulations: context.simulations.length,
    risks: context.risks.length,
    opportunities: context.opportunities.length,
    predictions: context.predictions.length,
  };
}

function delta(before: ContextCounts, after: ContextCounts): ContextCounts {
  return {
    evidence: after.evidence - before.evidence,
    hypotheses: after.hypotheses - before.hypotheses,
    contradictions: after.contradictions - before.contradictions,
    simulations: after.simulations - before.simulations,
    risks: after.risks - before.risks,
    opportunities: after.opportunities - before.opportunities,
    predictions: after.predictions - before.predictions,
  };
}

function hasOperationalDelta(change: ContextCounts) {
  return Object.values(change).some((value) => value > 0);
}

function clampConfidence(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;
}

function confidenceFromEvidence(evidence: KernelEvidence[], fallback: number) {
  if (evidence.length === 0) return fallback;
  const total = evidence.reduce((sum, item) => sum + clampConfidence(item.confidence, 0), 0);
  return clampConfidence(total / evidence.length, fallback);
}

function metadataFor(context: KernelContext, evidenceSource: string) {
  const candidates = [
    evidenceSource.charAt(0).toLowerCase() + evidenceSource.slice(1),
    evidenceSource.replace(/Agent$/, ''),
    evidenceSource.replace(/Agent$/, '').charAt(0).toLowerCase() +
      evidenceSource.replace(/Agent$/, '').slice(1),
  ];

  for (const key of candidates) {
    const value = context.metadata[key];
    if (value !== undefined) return value;
  }

  return null;
}

function buildOutput(
  context: KernelContext,
  config: CoreAgentConfig,
  change: ContextCounts,
  producedEvidence: KernelEvidence[],
  status: AgentResult['status'],
  reason: string
) {
  return {
    agent: config.name,
    status,
    reason,
    delta: change,
    metadata: metadataFor(context, config.evidenceSource),
    evidenceIds: producedEvidence.map((item) => item.id),
  };
}

class CoreFunctionAgent extends SfiAgent {
  definition: AgentDefinition;

  private readonly executor: AgentExecutor;
  private readonly evidenceSource: string;
  private readonly assessExecution?: CoreAgentConfig['assessExecution'];

  constructor(config: CoreAgentConfig) {
    super();
    this.executor = config.executor;
    this.evidenceSource = config.evidenceSource;
    this.assessExecution = config.assessExecution;
    this.definition = {
      id: config.id,
      name: config.name,
      type: config.type,
      capabilities: config.capabilities,
      readsMemory: config.readsMemory,
      writesMemory: config.writesMemory,
      emits: config.emits,
      humanApprovalRequired: config.humanApprovalRequired,
      confidenceModel: config.confidenceModel,
      status: 'ACTIVE',
    };
  }

  async execute(context: KernelContext): Promise<AgentResult> {
    const started = Date.now();
    const before = counts(context);
    this.executor(context);
    const after = counts(context);
    const change = delta(before, after);
    const producedEvidence = context.evidence
      .slice(before.evidence)
      .filter((item) => item.source === this.evidenceSource);

    const assessment = this.assessExecution?.({
      context,
      before,
      after,
      change,
      producedEvidence,
    });
    const operational = assessment?.operational ?? hasOperationalDelta(change);
    const status: AgentResult['status'] = operational ? 'SUCCESS' : 'PARTIAL';
    const reason = assessment?.reason ?? (operational
      ? 'canonical_executor_produced_structured_runtime_state'
      : 'executor_ran_without_new_structured_signal_for_current_input');
    const confidence = confidenceFromEvidence(
      producedEvidence,
      assessment?.confidence ?? (operational ? 0.55 : 0.2)
    );

    return {
      trace: context.trace,
      agentId: this.definition.id,
      status,
      output: buildOutput(context, {
        ...this.definition,
        executor: this.executor,
        evidenceSource: this.evidenceSource,
      }, change, producedEvidence, status, reason),
      observations: [],
      evidence: producedEvidence,
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence,
      executionTime: Date.now() - started,
    };
  }
}

export class EvidenceHunterAgent extends CoreFunctionAgent {
  constructor() {
    super({
      id: 'AGENT_EVIDENCE_HUNTER',
      name: 'Evidence Hunter',
      type: 'EVIDENCE',
      capabilities: ['CAPABILITY_EVIDENCE_DISCOVERY'],
      readsMemory: [],
      writesMemory: [EPISTEMIC_WRITE],
      emits: ['SFI_EVIDENCE_REQUIREMENTS_DECLARED'],
      humanApprovalRequired: false,
      confidenceModel: 'source_validation',
      executor: runEvidenceHunter,
      evidenceSource: 'EvidenceHunterAgent',
      assessExecution: ({ context, before }) => {
        const metadata = context.metadata.evidenceHunter;
        const record = metadata && typeof metadata === 'object'
          ? metadata as Record<string, unknown>
          : {};
        const missingEvidenceDetected = record.missingEvidenceDetected;
        const evaluated = typeof missingEvidenceDetected === 'number';

        if (evaluated && before.hypotheses > 0) {
          return {
            operational: true,
            reason: missingEvidenceDetected > 0
              ? 'evidence_hunter_declared_missing_evidence_requirements'
              : 'evidence_hunter_evaluated_hypotheses_and_found_no_missing_evidence',
            confidence: missingEvidenceDetected > 0 ? 0.55 : 0.7,
          };
        }

        return {
          operational: false,
          reason: 'evidence_hunter_requires_at_least_one_hypothesis_to_evaluate_missing_evidence',
          confidence: 0.2,
        };
      },
    });
  }
}

export class TemporalResolverAgent extends CoreFunctionAgent {
  constructor() {
    super({
      id: 'AGENT_TEMPORAL_RESOLVER',
      name: 'Temporal Resolver',
      type: 'TEMPORAL',
      capabilities: ['CAPABILITY_TEMPORAL_RESOLUTION'],
      readsMemory: ['epistemic_events', 'sfi_predictive_runs', 'field_returns'],
      writesMemory: [EPISTEMIC_WRITE],
      emits: ['SFI_TEMPORAL_RESOLUTION_COMPLETED'],
      humanApprovalRequired: false,
      confidenceModel: 'temporal_alignment',
      executor: runTemporalResolver,
      evidenceSource: 'TemporalResolverAgent',
    });
  }
}

export class TrajectoryAgent extends CoreFunctionAgent {
  constructor() {
    super({
      id: 'AGENT_TRAJECTORY',
      name: 'Trajectory Agent',
      type: 'TRAJECTORY',
      capabilities: ['CAPABILITY_TRAJECTORY_MODELING'],
      readsMemory: ['sfi_predictive_runs', 'sfi_predictive_learning_events', 'epistemic_events'],
      writesMemory: [EPISTEMIC_WRITE],
      emits: ['SFI_TRAJECTORY_ASSESSED'],
      humanApprovalRequired: false,
      confidenceModel: 'trajectory_alignment',
      executor: runTrajectoryAgent,
      evidenceSource: 'TrajectoryAgent',
    });
  }
}

export class RealityCalibrationAgent extends CoreFunctionAgent {
  constructor() {
    super({
      id: 'AGENT_REALITY_CALIBRATION',
      name: 'Reality Calibration',
      type: 'CALIBRATION',
      capabilities: ['CAPABILITY_REALITY_CALIBRATION'],
      readsMemory: ['sfi_predictive_runs', 'sfi_predictive_learning_events', 'epistemic_events'],
      writesMemory: [EPISTEMIC_WRITE],
      emits: ['SFI_REALITY_CALIBRATION_COMPLETED'],
      humanApprovalRequired: false,
      confidenceModel: 'reality_consistency',
      executor: runRealityCalibration,
      evidenceSource: 'RealityCalibrationAgent',
    });
  }
}

export class RiskAgent extends CoreFunctionAgent {
  constructor() {
    super({
      id: 'AGENT_RISK',
      name: 'Risk Agent',
      type: 'RISK',
      capabilities: ['CAPABILITY_RISK_ASSESSMENT'],
      readsMemory: ['action_proposals', 'sfi_evidence_ledger', 'root_audit_events'],
      writesMemory: [EPISTEMIC_WRITE],
      emits: ['SFI_RISK_SURFACE_DECLARED'],
      humanApprovalRequired: false,
      confidenceModel: 'risk_surface',
      executor: runRiskAgent,
      evidenceSource: 'RiskAgent',
    });
  }
}

export class OpportunityAgent extends CoreFunctionAgent {
  constructor() {
    super({
      id: 'AGENT_OPPORTUNITY',
      name: 'Opportunity Agent',
      type: 'OPPORTUNITY',
      capabilities: ['CAPABILITY_OPPORTUNITY_DISCOVERY'],
      readsMemory: ['action_proposals', 'field_cases', 'epistemic_events'],
      writesMemory: [EPISTEMIC_WRITE],
      emits: ['SFI_OPPORTUNITY_SURFACE_DECLARED'],
      humanApprovalRequired: false,
      confidenceModel: 'opportunity_surface',
      executor: runOpportunityDiscovery,
      evidenceSource: 'OpportunityDiscoveryAgent',
    });
  }
}

export class HistoricalScoutAgent extends CoreFunctionAgent {
  constructor() {
    super({
      id: 'AGENT_HISTORICAL_SCOUT',
      name: 'Historical Scout',
      type: 'EVIDENCE',
      capabilities: ['CAPABILITY_HISTORICAL_SCOUT'],
      readsMemory: ['sfi_phenomena', 'sfi_phenomenon_evidence'],
      writesMemory: [EPISTEMIC_WRITE],
      emits: ['SFI_HISTORICAL_RECONSTRUCTION_COMPLETED'],
      humanApprovalRequired: false,
      confidenceModel: 'source_presence_and_lineage',
      executor: runHistoricalScout,
      evidenceSource: 'HistoricalScoutAgent',
    });
  }
}

export class PhenotypeResolverAgent extends CoreFunctionAgent {
  constructor() {
    super({
      id: 'AGENT_PHENOTYPE_RESOLVER',
      name: 'Phenotype Resolver',
      type: 'EVIDENCE',
      capabilities: ['CAPABILITY_PHENOTYPE_RESOLVER'],
      readsMemory: ['sfi_phenomena', 'sfi_reference_cases', 'sfi_graph_nodes', 'graph_nodes'],
      writesMemory: [EPISTEMIC_WRITE],
      emits: ['SFI_PHENOTYPE_RESOLVED'],
      humanApprovalRequired: false,
      confidenceModel: 'configuration_overlap',
      executor: runPhenotypeResolver,
      evidenceSource: 'PhenotypeResolverAgent',
    });
  }
}

export class ContextBuilderAgent extends CoreFunctionAgent {
  constructor() {
    super({
      id: 'AGENT_CONTEXT_BUILDER',
      name: 'Context Builder',
      type: 'EVIDENCE',
      capabilities: ['CAPABILITY_CONTEXT_BUILDER'],
      readsMemory: ['epistemic_events', 'sfi_graph_nodes', 'field_cases'],
      writesMemory: [EPISTEMIC_WRITE],
      emits: ['SFI_CONTEXT_COORDINATE_BUILT'],
      humanApprovalRequired: false,
      confidenceModel: 'field_slot_completeness',
      executor: runContextBuilder,
      evidenceSource: 'ContextBuilderAgent',
    });
  }
}

export class SocialFieldSimulatorAgent extends CoreFunctionAgent {
  constructor() {
    super({
      id: 'AGENT_SOCIAL_FIELD_SIMULATOR',
      name: 'Social Field Simulator',
      type: 'SIMULATION',
      capabilities: ['CAPABILITY_SOCIAL_FIELD_SIMULATOR'],
      readsMemory: ['epistemic_events', 'sfi_graph_nodes', 'field_cases'],
      writesMemory: [EPISTEMIC_WRITE],
      emits: ['SFI_SOCIAL_FIELD_SIMULATED'],
      humanApprovalRequired: false,
      confidenceModel: 'bounded_variable_coverage',
      executor: runSocialFieldSimulator,
      evidenceSource: 'SocialFieldSimulatorAgent',
    });
  }
}

export class EconomicFieldSimulatorAgent extends CoreFunctionAgent {
  constructor() {
    super({
      id: 'AGENT_ECONOMIC_FIELD_SIMULATOR',
      name: 'Economic Field Simulator',
      type: 'SIMULATION',
      capabilities: ['CAPABILITY_ECONOMIC_FIELD_SIMULATOR'],
      readsMemory: ['epistemic_events', 'root_evidence_entries', 'field_cases'],
      writesMemory: [EPISTEMIC_WRITE],
      emits: ['SFI_ECONOMIC_FIELD_SIMULATED'],
      humanApprovalRequired: false,
      confidenceModel: 'bounded_variable_coverage',
      executor: runEconomicFieldSimulator,
      evidenceSource: 'EconomicFieldSimulatorAgent',
    });
  }
}

export class PolicySimulatorAgent extends CoreFunctionAgent {
  constructor() {
    super({
      id: 'AGENT_POLICY_SIMULATOR',
      name: 'Policy Simulator',
      type: 'SIMULATION',
      capabilities: ['CAPABILITY_POLICY_SIMULATOR'],
      readsMemory: ['action_proposals', 'root_audit_events', 'epistemic_events'],
      writesMemory: [EPISTEMIC_WRITE],
      emits: ['SFI_POLICY_FIELD_SIMULATED'],
      humanApprovalRequired: false,
      confidenceModel: 'governance_constraint_coverage',
      executor: runPolicyFieldSimulator,
      evidenceSource: 'PolicyFieldSimulatorAgent',
    });
  }
}

export class CulturalSimulatorAgent extends CoreFunctionAgent {
  constructor() {
    super({
      id: 'AGENT_CULTURAL_SIMULATOR',
      name: 'Cultural Simulator',
      type: 'SIMULATION',
      capabilities: ['CAPABILITY_CULTURAL_SIMULATOR'],
      readsMemory: ['world_vector_observations', 'worldspect_snapshots', 'sfi_amv_memory'],
      writesMemory: [EPISTEMIC_WRITE],
      emits: ['SFI_CULTURAL_FIELD_SIMULATED'],
      humanApprovalRequired: false,
      confidenceModel: 'world_vector_alignment',
      executor: runCulturalFieldSimulator,
      evidenceSource: 'CulturalFieldSimulatorAgent',
    });
  }
}

export class PsychologicalSimulatorAgent extends CoreFunctionAgent {
  constructor() {
    super({
      id: 'AGENT_PSYCHOLOGICAL_SIMULATOR',
      name: 'Psychological Simulator',
      type: 'SIMULATION',
      capabilities: ['CAPABILITY_PSYCHOLOGICAL_SIMULATOR'],
      readsMemory: ['sfi_moph_sessions', 'sfi_amv_memory', 'epistemic_events'],
      writesMemory: [EPISTEMIC_WRITE],
      emits: ['SFI_PSYCHOLOGICAL_FIELD_SIMULATED'],
      humanApprovalRequired: false,
      confidenceModel: 'declared_object_and_trace_coverage',
      executor: runPsychologicalFieldSimulator,
      evidenceSource: 'PsychologicalFieldSimulatorAgent',
    });
  }
}

export class MultiStakeholderBootstrapAgent extends CoreFunctionAgent {
  constructor() {
    super({
      id: 'AGENT_MULTI_STAKEHOLDER_BOOTSTRAP',
      name: 'Multi Stakeholder Bootstrap',
      type: 'GOVERNANCE',
      capabilities: ['CAPABILITY_MULTI_STAKEHOLDER_BOOTSTRAP'],
      readsMemory: ['action_proposals', 'field_cases', 'sfi_moph_sessions', 'epistemic_events'],
      writesMemory: [EPISTEMIC_WRITE],
      emits: ['SFI_MULTI_STAKEHOLDER_SIMULATED'],
      humanApprovalRequired: true,
      confidenceModel: 'stakeholder_divergence_delta',
      executor: runMultiStakeholderBootstrap,
      evidenceSource: 'MultiStakeholderBootstrapAgent',
    });
  }
}

export class ProjectExecutionManagerAgent extends CoreFunctionAgent {
  constructor() {
    super({
      id: 'AGENT_PROJECT_EXECUTION_MANAGER',
      name: 'Project Execution Manager',
      type: 'GOVERNANCE',
      capabilities: ['CAPABILITY_PROJECT_EXECUTION_MANAGER'],
      readsMemory: ['action_proposals', 'logbook_mutations', 'root_audit_events', 'epistemic_events'],
      writesMemory: [EPISTEMIC_WRITE],
      emits: ['SFI_PROJECT_EXECUTION_STATE_DECLARED'],
      humanApprovalRequired: true,
      confidenceModel: 'dependency_and_blocker_coverage',
      executor: runProjectExecutionManager,
      evidenceSource: 'ProjectExecutionManagerAgent',
    });
  }
}
