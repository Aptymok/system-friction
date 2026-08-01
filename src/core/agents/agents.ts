// src/core/agents/agents.ts
//
// Adaptadores del Cognitive Runtime viejo hacia el contrato canónico SFI Core.

export { SfiAgent } from './base';

import { SfiAgent } from './base';

import type {
  AgentDefinition,
  KernelContext,
  AgentResult,
} from '@/core/contracts';

import {
  EvidenceHunterAgent as executeEvidenceHunter,
} from '@/lib/sfi/cognitive-runtime/agents/evidenceHunter';

import {
  MetaOrchestratorAgent as executeMetaOrchestrator,
} from '@/lib/sfi/cognitive-runtime/agents/metaOrchestrator';


// ------------------------------------------------------------
// Normalizador común
// ------------------------------------------------------------

function normalizeResult(
  context: KernelContext,
  agentId: string,
  output: unknown,
  confidence = 0.6
): AgentResult {

  return {
    trace: context.trace,
    agentId,
    status: 'SUCCESS',
    output,
    observations: [],
    evidence: (context.evidence ?? []).map(
  item => String(item)
),
    events: [],
    memoryWrites: [],
    confidence,
    executionTime: 0,
  };
}



// ------------------------------------------------------------
// Evidence Hunter
// ------------------------------------------------------------

export class EvidenceHunterAgent extends SfiAgent {

  definition: AgentDefinition = {

    id: 'AGENT_EVIDENCE_HUNTER',

    name: 'Evidence Hunter',

    type: 'EVIDENCE',

    capabilities: [
      'CAPABILITY_EVIDENCE_DISCOVERY'
    ],

    readsMemory: [],

    writesMemory: [],

    emits: [
      'evidence.discovery.completed'
    ],

    humanApprovalRequired: false,

    confidenceModel: 'source_validation',

    status: 'ACTIVE',

  };


  async execute(
    context: KernelContext
  ): Promise<AgentResult> {


    const result =
      await executeEvidenceHunter(
        context as never
      );


    return normalizeResult(
      context,
      this.definition.id,
      result
    );

  }

}



// ------------------------------------------------------------
// Meta Orchestrator
// ------------------------------------------------------------

export class MetaOrchestratorAgent extends SfiAgent {


  definition: AgentDefinition = {

    id: 'AGENT_META_ORCHESTRATOR',

    name: 'Meta Orchestrator',

    type: 'ORCHESTRATION',

    capabilities: [
      'CAPABILITY_ORCHESTRATION'
    ],

    readsMemory: [],

    writesMemory: [],

    emits: [
      'orchestration.completed'
    ],

    humanApprovalRequired: false,

    confidenceModel: 'runtime_alignment',

    status: 'ACTIVE',

  };


  async execute(
    context: KernelContext
  ): Promise<AgentResult> {


    const result =
      await executeMetaOrchestrator(
        context as never
      );


    return normalizeResult(
      context,
      this.definition.id,
      result
    );

  }

}



// ------------------------------------------------------------
// Placeholder base
// ------------------------------------------------------------

abstract class PlaceholderAgent extends SfiAgent {


  async execute(
    context: KernelContext
  ): Promise<AgentResult> {


    return normalizeResult(
      context,
      this.definition.id,
      {
        message: 'adapter-placeholder',
        input: context.input
      },
      0.5
    );

  }

}



// ------------------------------------------------------------
// Temporal Resolver
// ------------------------------------------------------------

export class TemporalResolverAgent extends PlaceholderAgent {

  definition: AgentDefinition = {

    id:'AGENT_TEMPORAL_RESOLVER',

    name:'Temporal Resolver',

    type:'ANALYSIS',

    capabilities:[],

    readsMemory:[],

    writesMemory:[],

    emits:[],

    humanApprovalRequired:false,

    confidenceModel:'temporal_alignment',

    status:'ACTIVE'

  };

}



// ------------------------------------------------------------
// Trajectory
// ------------------------------------------------------------

export class TrajectoryAgent extends PlaceholderAgent {

  definition: AgentDefinition = {

    id:'AGENT_TRAJECTORY',

    name:'Trajectory Agent',

    type:'ANALYSIS',

    capabilities:[],

    readsMemory:[],

    writesMemory:[],

    emits:[],

    humanApprovalRequired:false,

    confidenceModel:'trajectory_alignment',

    status:'ACTIVE'

  };

}



// ------------------------------------------------------------
// Reality Calibration
// ------------------------------------------------------------

export class RealityCalibrationAgent extends PlaceholderAgent {

  definition: AgentDefinition = {

    id:'AGENT_REALITY_CALIBRATION',

    name:'Reality Calibration',

    type:'CALIBRATION',

    capabilities:[],

    readsMemory:[],

    writesMemory:[],

    emits:[],

    humanApprovalRequired:false,

    confidenceModel:'reality_consistency',

    status:'ACTIVE'

  };

}



// ------------------------------------------------------------
// Risk
// ------------------------------------------------------------

export class RiskAgent extends PlaceholderAgent {

  definition: AgentDefinition = {

    id:'AGENT_RISK',

    name:'Risk Agent',

    type:'RISK',

    capabilities:[],

    readsMemory:[],

    writesMemory:[],

    emits:[],

    humanApprovalRequired:false,

    confidenceModel:'risk_surface',

    status:'ACTIVE'

  };

}



// ------------------------------------------------------------
// Opportunity
// ------------------------------------------------------------

export class OpportunityAgent extends PlaceholderAgent {

  definition: AgentDefinition = {

    id:'AGENT_OPPORTUNITY',

    name:'Opportunity Agent',

    type:'OPPORTUNITY',

    capabilities:[],

    readsMemory:[],

    writesMemory:[],

    emits:[],

    humanApprovalRequired:false,

    confidenceModel:'opportunity_surface',

    status:'ACTIVE'

  };

}