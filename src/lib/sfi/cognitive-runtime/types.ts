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

/** Whole-trajectory capability invocation ceiling; persisted consumption cannot reset on checkpoint continuation. */
export const SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS = 25 as const;
/** Frozen Cognitive Passport depth ceiling. A runtime may tighten but never expand it. */
export const SFI_ADAPTIVE_MAX_TRAJECTORY_DEPTH = 2 as const;
/** Operation-level model-call ceiling for one adaptive trajectory. */
export const SFI_ADAPTIVE_MAX_MODEL_CALLS = 25 as const;
/** Maximum wall-clock execution window for newly created adaptive trajectory work. */
export const SFI_ADAPTIVE_EXECUTION_DEADLINE_MS = 5 * 60_000;

export type SfiRuntimeObservationState = 'OBSERVED' | 'NOT_OBSERVED';

export type SfiRuntimeBoundOverrides = {
  maxDepth?: number;
  maxCapabilityInvocations?: number;
  maxModelCalls?: number;
  deadlineMs?: number;
  maxObservedTokens?: number | null;
  maxObservedProviderCost?: { amount: number; currency: string } | null;
};

export type SfiRuntimeStopCostControls = {
  contract: 'SFI-RUNTIME-STOP-COST-CONTROLS-1.0';
  bounds: {
    maxDepth: number;
    maxCapabilityInvocations: number;
    maxModelCalls: number;
    maxObservedTokens: number | null;
    maxObservedProviderCost: { amount: number; currency: string } | null;
    startedAt: string;
    deadlineAt: string;
    maxDurationMs: number;
  };
  usage: {
    modelCalls: {
      used: number;
      remaining: number;
      observation: 'OBSERVED';
    };
    tokens: {
      used: number | null;
      remaining: number | null;
      observation: SfiRuntimeObservationState;
      unobservedCalls: number;
    };
    providerCost: {
      used: number | null;
      remaining: number | null;
      currency: string | null;
      observation: SfiRuntimeObservationState;
      unobservedCalls: number;
    };
  };
  observabilityBoundary: 'UNAVAILABLE_NOT_ZERO_NO_ESTIMATION';
};

export type SfiTaskGraphNodeState =
  | 'PLANNED'
  | 'ADMITTED'
  | 'RUNNING'
  | 'WAITING_EVIDENCE'
  | 'WAITING_AUTHORITY'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'FAILED'
  | 'SUPERSEDED';

export type SfiTaskGraphEdgeRelation =
  | 'REQUIRES'
  | 'SUPPLIES'
  | 'CONTRADICTS'
  | 'CALIBRATES'
  | 'GOVERNS'
  | 'FALSIFIES';

export type SfiTaskGraphNode = {
  /** compatibility aliases retained for existing readers */
  id: string;
  agentId: string;
  label: string;
  requiresEvidence: string[];
  authorityLevel: SfiRegisteredCognitiveAgent['authorityLevel'];
  humanApprovalRequired: boolean;

  /** SFI-PROGRAM-CONTRACT-LOCK-1.0 adaptive node contract */
  nodeId: string;
  capabilityId: string;
  state: SfiTaskGraphNodeState;
  prerequisites: string[];
  reason: string;
  requestedBy: string | null;
  inputRefs: string[];
  outputRefs: string[];
  modelExecutionRef: string | null;

  /** bounded lineage/runtime extension */
  requestId: string | null;
  requestHash: string | null;
  requiredInputs: string[];
  requestedOutputs: string[];
  urgency: 'LOW' | 'NORMAL' | 'HIGH' | 'BLOCKING' | null;
  parentNodeId: string | null;
  ancestorNodeIds: string[];
  brokerDisposition: string | null;
  requestEventId: string | null;
  dispositionEventId: string | null;
  executionReceiptRef: string | null;
  supersedesNodeId: string | null;
  supersededByNodeId: string | null;
  depth: number;
};

export type SfiTaskGraphEdge = {
  from: string;
  to: string;
  relation: SfiTaskGraphEdgeRelation;
};

export type SfiTaskGraphMutationKind =
  | 'NODE_ADDED'
  | 'NODE_STATE_CHANGED'
  | 'EDGE_ADDED'
  | 'BROKER_DISPOSITION'
  | 'REQUEST_REUSED'
  | 'NODE_SUPERSEDED'
  | 'LIMIT_BLOCKED'
  | 'STOPPED';

export type SfiTaskGraphMutation = {
  mutationId: string;
  occurredAt: string;
  kind: SfiTaskGraphMutationKind;
  nodeId: string | null;
  requestId: string | null;
  detail: Record<string, unknown>;
};

export type SfiTaskGraph = {
  id: string;
  question: string;
  status: 'planned' | 'persisted' | 'blocked' | 'running' | 'waiting' | 'completed' | 'paused' | 'failed' | 'stopped' | 'degraded';
  eventName: 'SFI_TASK_CREATED';
  mode: 'ADAPTIVE';
  initialSelectionMode: 'explicit' | 'auto';
  nodes: SfiTaskGraphNode[];
  edges: SfiTaskGraphEdge[];
  minimumEvidence: string[];
  blockedReason: string | null;
  invocationBudget: {
    max: number;
    used: number;
    remaining: number;
  };
  runtimeControls: SfiRuntimeStopCostControls;
  stop: {
    stopped: boolean;
    reason: string | null;
    evaluatedAt: string | null;
  };
  mutations: SfiTaskGraphMutation[];
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
