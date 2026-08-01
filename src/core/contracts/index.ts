export type SfiEntityType =
  | "OBSERVATION"
  | "EVIDENCE"
  | "EVENT"
  | "AGENT"
  | "AGENT_EXECUTION"
  | "CAPABILITY"
  | "PHENOMENON"
  | "PREDICTION"
  | "FORMULA"
  | "MEMORY"
  | "STATE"
  | "ERROR"
  | "OPERATION"
  | "REQUEST"
  | "GOVERNANCE_DECISION";


export type SfiEntityId = string;


export interface SfiEntityVersion {
  entityId: SfiEntityId;
  version: number;
  previousVersion?: number;
  createdAt: string;
  changedBy: SfiEntityId;
  changeReason: string;
}


export interface SfiTraceContext {
  logbookId: string;
  correlationId: string;
  initiatedBy: SfiEntityId;
  createdAt: string;
}


export type SfiEventSource =
  | "AMV"
  | "RUNTIME"
  | "AGENT"
  | "GOVERNANCE"
  | "VERIFICATION"
  | "SYSTEM";


export interface SfiEvent {
  id: string;
  version: string;
  type: string;
  logbookId: string;
  source: SfiEventSource;
  agentId?: string;
  payload: unknown;
  timestamp: string;
  sequence: number;
}


export type SfiPermission =
  | "OBSERVATION_READ"
  | "EVIDENCE_CREATE"
  | "MEMORY_PROPOSE"
  | "MODEL_EXECUTE"
  | "GOVERNANCE_APPROVAL"
  | "SYSTEM_ADMIN";


export interface Capability {
  id: string;
  version: string;
  name: string;
  inputSchema: string;
  outputSchema: string;
  executor: string;
  permissions: SfiPermission[];
}


export interface Observation {
  id: string;
  phenomenonId: string;
  source: string;
  signal: unknown;
  observedAt: string;
  confidence?: number;
  trace: SfiTraceContext;
  createdAt: string;
}


export interface Evidence {
  id: string;
  observationIds: string[];
  evaluatorId: string;
  confidence: number;
  assessment: string;
  trace: SfiTraceContext;
  createdAt: string;
}


/*
  Runtime Kernel
*/


export interface KernelEvidence {
  id: string;
  source: string;
  confidence: number;
  payload: unknown;
}


export interface KernelHypothesis {
  id?: string;
  statement: string;
  confidence: number;
}


export interface KernelSimulation {
  id?: string;
  type?: string;
  simulator?: string;
  confidence?: number;
  payload?: unknown;
  output?: unknown;
}


export interface KernelRisk {
  id?: string;
  description: string;
  severity: number;
  confidence?: number;
  payload?: unknown;
}


export interface KernelOpportunity {
  id?: string;
  description: string;
  value?: number;
  score?: number;
}


export interface KernelPrediction {
  id?: string;
  statement: string;
  description?: string;
  confidence: number;
}


export interface KernelContradiction {
  id?: string;
  description: string;
  severity?: number;
  payload?: unknown;
  confidence?: number;
}



export interface KernelContext {

  trace: SfiTraceContext;

  input: unknown;

  taskId?: string;

  capabilityId?: string;

  currentEvent?: string;

  stateSnapshot?: unknown;

  permissions?: SfiPermission[];

  evidence: KernelEvidence[];

  hypotheses: KernelHypothesis[];

  contradictions: KernelContradiction[];

  simulations: KernelSimulation[];

  risks: KernelRisk[];

  opportunities: KernelOpportunity[];

  predictions: KernelPrediction[];

  metadata: Record<string, unknown>;

  actor?: {
    id?: string;
    role?: string;
    type?: string;
  };

}




/*
 Agent Runtime
*/


export interface MemoryWriteDefinition {

  entityType: string;

  operation:
    | "CREATE"
    | "UPDATE"
    | "ARCHIVE";

}



export type LifecycleState =
  | "CREATED"
  | "VALIDATING"
  | "ACTIVE"
  | "ARCHIVED"
  | "RETIRED";


export type RuntimeState =
  | "READY"
  | "RUNNING"
  | "FAILED"
  | "BLOCKED"
  | "DISABLED";



export interface AgentDefinition {

  id: string;

  name: string;

  type: string;

  capabilities: string[];

  readsMemory: string[];

  writesMemory: MemoryWriteDefinition[];

  emits: string[];

  humanApprovalRequired: boolean;

  confidenceModel: string;

  status: LifecycleState;

}



export interface AgentResult {

  trace: SfiTraceContext;

  agentId: string;

  status:
    | "SUCCESS"
    | "PARTIAL"
    | "FAILED";

  output: unknown;

  observations: string[];

  evidence: string[];

  events: string[];

  memoryWrites: MemoryWriteDefinition[];

  confidence: number;

  executionTime: number;

}



export interface AgentExecution {

  id: string;

  agentId: string;

  capabilityId: string;

  trace: SfiTraceContext;

  startedAt: string;

  completedAt?: string;

  status: RuntimeState;

  result?: AgentResult;

}



export interface InstitutionalMemory {

  id: string;

  evidenceIds: string[];

  phenomenonId: string;

  knowledge: string;

  confidence: number;

  trace: SfiTraceContext;

  createdAt: string;

}



export type PredictionStatus =
  | "PENDING"
  | "ACTIVE"
  | "VERIFIED"
  | "ARCHIVED";


export interface Repository<T> {

  save(entity: T): Promise<void>;

  findById(id: string): Promise<T | null>;

}


export interface PredictionRepository
extends Repository<unknown> {

  findByStatus(
    status: PredictionStatus
  ): Promise<unknown[]>;

}



export type SfiState =
  | "CREATED"
  | "VALIDATING"
  | "ACTIVE"
  | "ARCHIVED"
  | "RETIRED";


export interface StateSnapshot {

  state: SfiState;

  generatedAt: string;

  sourceMemoryVersion: number;

  hash: string;

}