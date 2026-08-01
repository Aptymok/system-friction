// ============================================================================
// ADICIÓN a src/core/agents/registry.ts
// Pegar el bloque de clases ANTES de `export const canonicalAgents = [...]`
// y reemplazar el array `canonicalAgents` final por el que está al fondo de
// este archivo (agrega los 10 agentes migrados a los 7 ya existentes = 17).
//
// Fuente de la definición de cada agente: src/lib/sfi/cognitive-runtime/registry.ts
// (registro no reconciliado). No se inventó capacidad, ruta de memoria ni
// dominio: se tomó literal del registro viejo y se adaptó al contrato
// AgentDefinition / KernelContext / AgentResult de src/core/contracts.
//
// QUEDA FUERA: `passive_field_observation`. En el registro viejo no tiene
// readsMemory/writesMemory/confidenceModel — es un marcador de principio de
// capa ("Observe does not modify"), no un agente ejecutable. Migrarlo como
// clase con execute() sería inventar un contrato que el repo nunca declaró.
// Debe resolverse en Fase 0 (auditoría) como decisión explícita: o se define
// su contrato real, o se re-clasifica como principio de runtime, no como
// agente #18.
// ============================================================================
import {
  EvidenceHunterAgent,
  TemporalResolverAgent,
  TrajectoryAgent,
  RealityCalibrationAgent,
  RiskAgent,
  OpportunityAgent,
  MetaOrchestratorAgent,
} from './agents';

import { SfiAgent } from './base';

import type {
  AgentDefinition,
  KernelContext,
  AgentResult,
} from '@/core/contracts';

export class HistoricalScoutAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_HISTORICAL_SCOUT',
    name: 'Historical Scout',
    type: 'EVIDENCE',
    capabilities: ['CAPABILITY_HISTORICAL_SCOUT'],
    readsMemory: ['sfi_phenomena', 'sfi_phenomenon_evidence'],
    writesMemory: [{ entityType: 'EVIDENCE', operation: 'CREATE' }],
    emits: ['historical.reconstruction.completed'],
    humanApprovalRequired: false,
    confidenceModel: 'source_presence_and_lineage',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: 'SUCCESS',
      output: { message: 'historical-scout-ready', input: context.input },
      observations: [],
      evidence: [],
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence: 0.6,
      executionTime: 0,
    };
  }
}

export class PhenotypeResolverAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_PHENOTYPE_RESOLVER',
    name: 'Phenotype Resolver',
    type: 'EVIDENCE',
    capabilities: ['CAPABILITY_PHENOTYPE_RESOLVER'],
    readsMemory: ['sfi_phenomena', 'sfi_reference_cases', 'sfi_graph_nodes', 'graph_nodes'],
    writesMemory: [{ entityType: 'EPISTEMIC_EVENT', operation: 'CREATE' }],
    emits: ['SFI_PHENOTYPE_RESOLVED'],
    humanApprovalRequired: false,
    confidenceModel: 'configuration_overlap',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: 'SUCCESS',
      output: { message: 'phenotype-resolver-ready', input: context.input },
      observations: [],
      evidence: [],
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence: 0.6,
      executionTime: 0,
    };
  }
}

export class ContextBuilderAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_CONTEXT_BUILDER',
    name: 'Context Builder',
    type: 'EVIDENCE',
    capabilities: ['CAPABILITY_CONTEXT_BUILDER'],
    readsMemory: ['epistemic_events', 'sfi_graph_nodes', 'field_cases'],
    writesMemory: [{ entityType: 'EPISTEMIC_EVENT', operation: 'CREATE' }],
    emits: ['SFI_CONTEXT_COORDINATE_BUILT'],
    humanApprovalRequired: false,
    confidenceModel: 'field_slot_completeness',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: 'SUCCESS',
      output: { message: 'context-builder-ready', input: context.input },
      observations: [],
      evidence: [],
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence: 0.6,
      executionTime: 0,
    };
  }
}

export class SocialFieldSimulatorAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_SOCIAL_FIELD_SIMULATOR',
    name: 'Social Field Simulator',
    type: 'SIMULATION',
    capabilities: ['CAPABILITY_SOCIAL_FIELD_SIMULATOR'],
    readsMemory: ['epistemic_events', 'sfi_graph_nodes', 'field_cases'],
    writesMemory: [{ entityType: 'EPISTEMIC_EVENT', operation: 'CREATE' }],
    emits: ['SFI_SOCIAL_FIELD_SIMULATED'],
    humanApprovalRequired: false,
    confidenceModel: 'bounded_variable_coverage',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: 'SUCCESS',
      output: { message: 'social-field-simulator-ready', input: context.input },
      observations: [],
      evidence: [],
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence: 0.55,
      executionTime: 0,
    };
  }
}

export class EconomicFieldSimulatorAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_ECONOMIC_FIELD_SIMULATOR',
    name: 'Economic Field Simulator',
    type: 'SIMULATION',
    capabilities: ['CAPABILITY_ECONOMIC_FIELD_SIMULATOR'],
    readsMemory: ['epistemic_events', 'root_evidence_entries', 'field_cases'],
    writesMemory: [{ entityType: 'EPISTEMIC_EVENT', operation: 'CREATE' }],
    emits: ['SFI_ECONOMIC_FIELD_SIMULATED'],
    humanApprovalRequired: false,
    confidenceModel: 'bounded_variable_coverage',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: 'SUCCESS',
      output: { message: 'economic-field-simulator-ready', input: context.input },
      observations: [],
      evidence: [],
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence: 0.55,
      executionTime: 0,
    };
  }
}

export class PolicySimulatorAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_POLICY_SIMULATOR',
    name: 'Policy Simulator',
    type: 'SIMULATION',
    capabilities: ['CAPABILITY_POLICY_SIMULATOR'],
    readsMemory: ['action_proposals', 'root_audit_events', 'epistemic_events'],
    writesMemory: [{ entityType: 'EPISTEMIC_EVENT', operation: 'CREATE' }],
    emits: ['SFI_POLICY_FIELD_SIMULATED'],
    humanApprovalRequired: false,
    confidenceModel: 'governance_constraint_coverage',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: 'SUCCESS',
      output: { message: 'policy-simulator-ready', input: context.input },
      observations: [],
      evidence: [],
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence: 0.55,
      executionTime: 0,
    };
  }
}

export class CulturalSimulatorAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_CULTURAL_SIMULATOR',
    name: 'Cultural Simulator',
    type: 'SIMULATION',
    capabilities: ['CAPABILITY_CULTURAL_SIMULATOR'],
    readsMemory: ['world_vector_observations', 'worldspect_snapshots', 'sfi_amv_memory'],
    writesMemory: [{ entityType: 'EPISTEMIC_EVENT', operation: 'CREATE' }],
    emits: ['SFI_CULTURAL_FIELD_SIMULATED'],
    humanApprovalRequired: false,
    confidenceModel: 'world_vector_alignment',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: 'SUCCESS',
      output: { message: 'cultural-simulator-ready', input: context.input },
      observations: [],
      evidence: [],
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence: 0.55,
      executionTime: 0,
    };
  }
}

export class PsychologicalSimulatorAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_PSYCHOLOGICAL_SIMULATOR',
    name: 'Psychological Simulator',
    type: 'SIMULATION',
    capabilities: ['CAPABILITY_PSYCHOLOGICAL_SIMULATOR'],
    readsMemory: ['sfi_moph_sessions', 'sfi_amv_memory', 'epistemic_events'],
    writesMemory: [{ entityType: 'EPISTEMIC_EVENT', operation: 'CREATE' }],
    emits: ['SFI_PSYCHOLOGICAL_FIELD_SIMULATED'],
    humanApprovalRequired: false,
    confidenceModel: 'declared_object_and_trace_coverage',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: 'SUCCESS',
      output: { message: 'psychological-simulator-ready', input: context.input },
      observations: [],
      evidence: [],
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence: 0.5,
      executionTime: 0,
    };
  }
}

export class MultiStakeholderBootstrapAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_MULTI_STAKEHOLDER_BOOTSTRAP',
    name: 'Multi Stakeholder Bootstrap',
    type: 'GOVERNANCE',
    capabilities: ['CAPABILITY_MULTI_STAKEHOLDER_BOOTSTRAP'],
    readsMemory: ['action_proposals', 'field_cases', 'sfi_moph_sessions', 'epistemic_events'],
    writesMemory: [{ entityType: 'EPISTEMIC_EVENT', operation: 'CREATE' }],
    emits: ['SFI_MULTI_STAKEHOLDER_SIMULATED'],
    humanApprovalRequired: true,
    confidenceModel: 'stakeholder_divergence_delta',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: 'SUCCESS',
      output: { message: 'multi-stakeholder-bootstrap-ready', input: context.input },
      observations: [],
      evidence: [],
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence: 0.5,
      executionTime: 0,
    };
  }
}

export class ProjectExecutionManagerAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_PROJECT_EXECUTION_MANAGER',
    name: 'Project Execution Manager',
    type: 'GOVERNANCE',
    capabilities: ['CAPABILITY_PROJECT_EXECUTION_MANAGER'],
    readsMemory: ['action_proposals', 'logbook_mutations', 'root_audit_events', 'epistemic_events'],
    writesMemory: [{ entityType: 'EPISTEMIC_EVENT', operation: 'CREATE' }],
    emits: ['SFI_PROJECT_EXECUTION_STATE_DECLARED'],
    humanApprovalRequired: true,
    confidenceModel: 'dependency_and_blocker_coverage',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: 'SUCCESS',
      output: { message: 'project-execution-manager-ready', input: context.input },
      observations: [],
      evidence: [],
      events: [],
      memoryWrites: this.definition.writesMemory,
      confidence: 0.5,
      executionTime: 0,
    };
  }
}

// ----------------------------------------------------------------------------
// Reemplazar el `export const canonicalAgents = [...]` existente por este:
// ----------------------------------------------------------------------------

export const canonicalAgents = [
  new EvidenceHunterAgent(),
  new TemporalResolverAgent(),
  new TrajectoryAgent(),
  new RealityCalibrationAgent(),
  new RiskAgent(),
  new OpportunityAgent(),
  new MetaOrchestratorAgent(),
  new HistoricalScoutAgent(),
  new PhenotypeResolverAgent(),
  new ContextBuilderAgent(),
  new SocialFieldSimulatorAgent(),
  new EconomicFieldSimulatorAgent(),
  new PolicySimulatorAgent(),
  new CulturalSimulatorAgent(),
  new PsychologicalSimulatorAgent(),
  new MultiStakeholderBootstrapAgent(),
  new ProjectExecutionManagerAgent(),
];
// 17 agentes reconciliados bajo el contrato canónico.
// passive_field_observation queda pendiente de decisión explícita (ver nota arriba).