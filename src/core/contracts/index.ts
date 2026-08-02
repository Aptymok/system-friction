export type SfiEntityType =
  | "OBSERVATION"
  | "EVIDENCE"
  | "EVENT"
  | "AGENT"
  | "AGENT_EXECUTION"
  | "CAPABILITY"
  | "PHENOMENON"
  | "HYPOTHESIS"
  | "PREDICTION"
  | "FORMULA"
  | "MEMORY"
  | "ORGANIZATION"
  | "REPORT"
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
  verification?: {
    id: string;
    status: string;
    observedValue?: unknown;
    verifiedAt?: string;
    evidenceIds: string[];
    error?: string | null;
    learningEventIds: string[];
  };
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

  evidence: KernelEvidence[];

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


/*
  Entity Graph
*/


export type EntityRelationType =
  | "OBSERVES"
  | "SUPPORTS"
  | "DERIVED_FROM"
  | "VERIFIED_BY"
  | "GENERATED_BY"
  | "IMPACTS"
  | "EXECUTES"
  | "EXECUTED_BY"
  | "PRODUCES"
  | "APPROVES"
  | "REJECTS"
  | "UPDATES"
  | "INFLUENCES"
  | "PROJECTS"
  | "CONTAINS";


export interface SfiEntity {
  entityId: SfiEntityId;
  type: SfiEntityType;
  label: string;
  trace?: SfiTraceContext;
  logbookId?: string;
  sourceTable?: string;
  sourceId?: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  confidence?: number;
  publicable?: boolean;
}


export interface EntityRelationship {
  sourceId: SfiEntityId;
  targetId: SfiEntityId;
  relationType: EntityRelationType;
  weight: number;
  confidence: number;
  evidenceIds: string[];
  trace?: SfiTraceContext;
  derivationRule: string;
  sourceTable: string;
}


export interface EntityGraphLimitation {
  code: string;
  scope: string;
  source?: string;
  severity: "INFO" | "WARNING" | "ERROR";
  message: string;
  recoverable: boolean;
  requirement?: string;
}


export interface TrajectoryPoint {
  timestamp: string;
  sourceEntityId: SfiEntityId;
  sourceType: string;
  position: number;
  confidence: number;
  payload?: Record<string, unknown>;
}


export interface Trajectory {
  entityId: SfiEntityId;
  trajectoryKind?: "system_state_trajectory" | "institutional_record_timeline";
  timeline: TrajectoryPoint[];
  currentPosition: TrajectoryPoint | null;
  projected: TrajectoryPoint[];
  velocity: number;
  velocityUnit: string;
  acceleration: number;
  accelerationUnit: string;
  deviation: number;
  deviationDefinition: string;
  projectionMethod: string;
  confidence: number;
  evidenceIds: string[];
  status: "OPERATIONAL" | "PARTIAL";
  limitations: EntityGraphLimitation[];
}


export interface GovernanceDecision {
  id: string;
  targetId: SfiEntityId;
  decision: "APPROVED" | "REJECTED" | "OVERRIDDEN" | "PENDING" | "UNKNOWN";
  authority: string;
  reason: string;
  trace?: SfiTraceContext;
  timestamp: string;
}


export interface GovernanceState {
  entityId: SfiEntityId;
  decisions: GovernanceDecision[];
  status: "APPROVED" | "REJECTED" | "PENDING" | "UNKNOWN";
  limitations: EntityGraphLimitation[];
}


export interface EntityContextProvenance {
  sourceTable: string;
  sourceId: string;
  entityId: SfiEntityId;
  matchedBy: string;
  confidence: number;
  payloadKeys: string[];
}


export interface EntityContext {
  entity: SfiEntity;
  observations: Observation[];
  evidence: Evidence[];
  predictions: KernelPrediction[];
  decisions: GovernanceDecision[];
  memory: InstitutionalMemory[];
  agents: AgentDefinition[];
  events: SfiEvent[];
  trajectory: Trajectory;
  governance: GovernanceState;
  relationships: EntityRelationship[];
  provenance: EntityContextProvenance[];
  limitations: EntityGraphLimitation[];
}
