import type { AgentDefinition, KernelContext, AgentResult } from '@/core/contracts';

export abstract class SfiAgent {
  abstract definition: AgentDefinition;
  abstract execute(context: KernelContext): Promise<AgentResult>;
}

export class EvidenceHunterAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_EVIDENCE_HUNTER',
    name: 'Evidence Hunter',
    type: 'EVIDENCE',
    capabilities: ['CAPABILITY_EVIDENCE_HUNTER'],
    readsMemory: ['evidence', 'observations'],
    writesMemory: [{ entityType: 'EVIDENCE', operation: 'CREATE' }],
    emits: ['EVIDENCE_HUNTER_READY'],
    humanApprovalRequired: false,
    confidenceModel: 'source_presence_and_lineage',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: 'SUCCESS',
      output: { message: 'evidence-hunter-ready', input: context.input },
      observations: [],
      evidence: [],
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence: 0.75,
      executionTime: 0,
    };
  }
}

export class TemporalResolverAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_TEMPORAL_RESOLVER',
    name: 'Temporal Resolver',
    type: 'TEMPORAL',
    capabilities: ['CAPABILITY_TEMPORAL_RESOLVER'],
    readsMemory: ['predictions', 'events'],
    writesMemory: [{ entityType: 'STATE', operation: 'UPDATE' }],
    emits: ['TEMPORAL_RESOLVER_READY'],
    humanApprovalRequired: false,
    confidenceModel: 'timestamp_coverage',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: 'SUCCESS',
      output: { message: 'temporal-resolver-ready' },
      observations: [],
      evidence: [],
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence: 0.7,
      executionTime: 0,
    };
  }
}

export class TrajectoryAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_TRAJECTORY',
    name: 'Trajectory Agent',
    type: 'TRAJECTORY',
    capabilities: ['CAPABILITY_TRAJECTORY'],
    readsMemory: ['predictions', 'events'],
    writesMemory: [{ entityType: 'PREDICTION', operation: 'UPDATE' }],
    emits: ['TRAJECTORY_ASSESSED'],
    humanApprovalRequired: false,
    confidenceModel: 'time_series_and_residual_coverage',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: 'SUCCESS',
      output: { message: 'trajectory-ready' },
      observations: [],
      evidence: [],
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence: 0.68,
      executionTime: 0,
    };
  }
}

export class RealityCalibrationAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_REALITY_CALIBRATION',
    name: 'Reality Calibration',
    type: 'CALIBRATION',
    capabilities: ['CAPABILITY_REALITY_CALIBRATION'],
    readsMemory: ['predictions', 'events'],
    writesMemory: [{ entityType: 'PREDICTION', operation: 'UPDATE' }],
    emits: ['REALITY_CALIBRATED'],
    humanApprovalRequired: false,
    confidenceModel: 'absolute_error',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: 'SUCCESS',
      output: { message: 'reality-calibration-ready' },
      observations: [],
      evidence: [],
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence: 0.72,
      executionTime: 0,
    };
  }
}

export class RiskAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_RISK',
    name: 'Risk Agent',
    type: 'RISK',
    capabilities: ['CAPABILITY_RISK'],
    readsMemory: ['evidence', 'governance'],
    writesMemory: [{ entityType: 'EVENT', operation: 'CREATE' }],
    emits: ['RISK_DECLARED'],
    humanApprovalRequired: false,
    confidenceModel: 'blocker_count_and_severity',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: 'SUCCESS',
      output: { message: 'risk-ready' },
      observations: [],
      evidence: [],
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence: 0.66,
      executionTime: 0,
    };
  }
}

export class OpportunityAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_OPPORTUNITY',
    name: 'Opportunity Discovery',
    type: 'OPPORTUNITY',
    capabilities: ['CAPABILITY_OPPORTUNITY'],
    readsMemory: ['evidence', 'governance'],
    writesMemory: [{ entityType: 'EVENT', operation: 'CREATE' }],
    emits: ['OPPORTUNITY_DECLARED'],
    humanApprovalRequired: false,
    confidenceModel: 'evidence_supported_windowing',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: 'SUCCESS',
      output: { message: 'opportunity-ready' },
      observations: [],
      evidence: [],
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence: 0.64,
      executionTime: 0,
    };
  }
}

export class MetaOrchestratorAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_META_ORCHESTRATOR',
    name: 'Meta Orchestrator',
    type: 'ORCHESTRATOR',
    capabilities: ['CAPABILITY_ORCHESTRATOR'],
    readsMemory: ['events', 'governance', 'predictions'],
    writesMemory: [{ entityType: 'STATE', operation: 'UPDATE' }],
    emits: ['ORCHESTRATION_READY'],
    humanApprovalRequired: false,
    confidenceModel: 'contract_coverage',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: 'SUCCESS',
      output: { message: 'orchestrator-ready' },
      observations: [],
      evidence: [],
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence: 0.7,
      executionTime: 0,
    };
  }
}

export const canonicalAgents = [
  new EvidenceHunterAgent(),
  new TemporalResolverAgent(),
  new TrajectoryAgent(),
  new RealityCalibrationAgent(),
  new RiskAgent(),
  new OpportunityAgent(),
  new MetaOrchestratorAgent(),
];
