import type { EpistemicClass } from '../../../../packages/events/src/schema';
import type { SFI_AgentContract } from '@/agents/runtime/agentContract';

export type SfiCognitiveRuntimeLayer =
  | 'observe'
  | 'reconstruct'
  | 'simulate'
  | 'understand'
  | 'project'
  | 'decide'
  | 'act'
  | 'learn';

export type SfiCognitiveRuntimeStatus = 'operational' | 'degraded' | 'missing' | 'gated';

export type SfiMemoryAccess = {
  memory: string;
  mode: 'read' | 'write';
  status: SfiCognitiveRuntimeStatus;
  warning: string | null;
};

export type SfiRegisteredCognitiveAgent = SFI_AgentContract & {
  name: string;
  layer: SfiCognitiveRuntimeLayer;
  sourceTables: string[];
  route: string | null;
  operationalMode: boolean;
  missingCapability: boolean;
};

export type SfiCognitiveAgentState = {
  id: string;
  name: string;
  layer: SfiCognitiveRuntimeLayer;
  domain: SfiRegisteredCognitiveAgent['domain'];
  authorityLevel: SfiRegisteredCognitiveAgent['authorityLevel'];
  status: SfiCognitiveRuntimeStatus;
  purpose: string;
  route: string | null;
  listensTo: string[];
  emits: string[];
  readsMemory: SfiMemoryAccess[];
  writesMemory: SfiMemoryAccess[];
  confidenceModel: SfiRegisteredCognitiveAgent['confidenceModel'];
  simulationAllowed: boolean;
  humanApprovalRequired: boolean;
  evidence: {
    sourceTables: string[];
    observedTables: string[];
    missingTables: string[];
    warnings: string[];
  };
};

export type SfiRuntimeModeState = {
  id: string;
  name: string;
  principle: string;
  status: SfiCognitiveRuntimeStatus;
  readsMemory: SfiMemoryAccess[];
  writesMemory: SfiMemoryAccess[];
  emits: string[];
  warning: string | null;
};

export type SfiTaskGraphNode = {
  id: string;
  agentId: string;
  label: string;
  requiresEvidence: string[];
  authorityLevel: SfiRegisteredCognitiveAgent['authorityLevel'];
  humanApprovalRequired: boolean;
};

export type SfiTaskGraphEdge = {
  from: string;
  to: string;
  relation: 'requires' | 'feeds' | 'calibrates' | 'governs';
};

export type SfiTaskGraph = {
  id: string;
  question: string;
  status: 'planned' | 'persisted' | 'blocked';
  eventName: 'SFI_TASK_CREATED';
  nodes: SfiTaskGraphNode[];
  edges: SfiTaskGraphEdge[];
  minimumEvidence: string[];
  blockedReason: string | null;
};

export type SfiCognitiveRuntimeSnapshot = {
  generatedAt: string;
  schemaVersion: string;
  status: SfiCognitiveRuntimeStatus;
  summary: string;
  contract: {
    registeredAgents: number;
    operationalModes: number;
    executorAgents: number;
    humanApprovalAgents: number;
  };
  eventGraph: {
    source: string;
    status: SfiCognitiveRuntimeStatus;
    recentEvents: Array<{
      eventId: string;
      eventName: string;
      epistemicClass: EpistemicClass | string;
      confidence: number | null;
      occurredAt: string | null;
      sourceId: string | null;
    }>;
    warnings: string[];
  };
  layers: Array<{
    id: SfiCognitiveRuntimeLayer;
    question: string;
    agents: string[];
    status: SfiCognitiveRuntimeStatus;
    warnings: string[];
  }>;
  agents: SfiCognitiveAgentState[];
  modes: SfiRuntimeModeState[];
  orchestrationPolicy: {
    principle: string;
    taskCreatedEvent: 'SFI_TASK_CREATED';
    executionRule: string;
    memoryRule: string;
    simulationRule: string;
    calibrationRule: string;
  };
};
