export type SfiEntityType =
  | 'OBSERVATION'
  | 'EVIDENCE'
  | 'EVENT'
  | 'AGENT'
  | 'AGENT_EXECUTION'
  | 'CAPABILITY'
  | 'PHENOMENON'
  | 'PREDICTION'
  | 'FORMULA'
  | 'MEMORY'
  | 'STATE'
  | 'ERROR'
  | 'OPERATION'
  | 'REQUEST'
  | 'GOVERNANCE_DECISION';

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

export type SfiEventSource = 'AMV' | 'RUNTIME' | 'AGENT' | 'GOVERNANCE' | 'VERIFICATION' | 'SYSTEM';

export interface SfiEvent {
  id: SfiEntityId;
  version: string;
  type: string;
  logbookId: string;
  source: SfiEventSource;
  agentId?: SfiEntityId;
  payload: unknown;
  timestamp: string;
  sequence: number;
}

export type SfiPermission =
  | 'OBSERVATION_READ'
  | 'EVIDENCE_CREATE'
  | 'MEMORY_PROPOSE'
  | 'MODEL_EXECUTE'
  | 'GOVERNANCE_APPROVAL'
  | 'SYSTEM_ADMIN';

export interface Capability {
  id: SfiEntityId;
  version: string;
  name: string;
  inputSchema: SfiEntityId;
  outputSchema: SfiEntityId;
  executor: string;
  permissions: SfiPermission[];
}

export interface Observation {
  id: SfiEntityId;
  phenomenonId: SfiEntityId;
  source: string;
  signal: unknown;
  observedAt: string;
  confidence?: number;
  trace: SfiTraceContext;
  createdAt: string;
}

export interface Evidence {
  id: SfiEntityId;
  observationIds: SfiEntityId[];
  evaluatorId: SfiEntityId;
  confidence: number;
  assessment: string;
  trace: SfiTraceContext;
  createdAt: string;
}

export interface MemoryWriteDefinition {
  entityType: string;
  operation: 'CREATE' | 'UPDATE' | 'ARCHIVE';
}

export interface AgentDefinition {
  id: SfiEntityId;
  name: string;
  type: string;
  capabilities: SfiEntityId[];
  readsMemory: string[];
  writesMemory: MemoryWriteDefinition[];
  emits: string[];
  humanApprovalRequired: boolean;
  confidenceModel: string;
  status: LifecycleState;
}

export interface AgentExecution {
  id: SfiEntityId;
  agentId: SfiEntityId;
  capabilityId: SfiEntityId;
  trace: SfiTraceContext;
  startedAt: string;
  completedAt?: string;
  status: RuntimeState;
  result?: AgentResult;
}

export interface AgentResult {
  trace: SfiTraceContext;
  agentId: SfiEntityId;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  output: unknown;
  observations: SfiEntityId[];
  evidence: SfiEntityId[];
  events: SfiEntityId[];
  memoryWrites: MemoryWriteDefinition[];
  confidence: number;
  executionTime: number;
}

export interface InstitutionalMemory {
  id: SfiEntityId;
  evidenceIds: SfiEntityId[];
  phenomenonId: SfiEntityId;
  knowledge: string;
  confidence: number;
  trace: SfiTraceContext;
  createdAt: string;
}

export interface SfiOperation {
  id: SfiEntityId;
  trace: SfiTraceContext;
  capabilityId: SfiEntityId;
  actorId: SfiEntityId;
  input: unknown;
  startedAt: string;
  completedAt?: string;
  status: 'REQUESTED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
}

export interface KernelContext {
  trace: SfiTraceContext;
  capabilityId: SfiEntityId;
  actor: { id: SfiEntityId; type: string };
  stateSnapshot: StateSnapshot;
  permissions: SfiPermission[];
  input: unknown;
}

export interface GovernanceDecision {
  id: SfiEntityId;
  targetId: SfiEntityId;
  decision: 'APPROVED' | 'REJECTED' | 'OVERRIDDEN';
  authority: string;
  reason: string;
  trace: SfiTraceContext;
  timestamp: string;
}

export interface VariableDefinition {
  name: string;
  type: string;
  description?: string;
}

export interface FormulaDefinition {
  id: SfiEntityId;
  version: string;
  owner: 'SFI' | 'MIHM' | 'MOPH';
  inputs: VariableDefinition[];
  output: VariableDefinition;
  implementation: string;
}

export interface Repository<T> {
  save(entity: T): Promise<void>;
  findById(id: SfiEntityId): Promise<T | null>;
}

export interface ObservationRepository extends Repository<Observation> {
  findByPhenomenon(phenomenonId: SfiEntityId): Promise<Observation[]>;
}

export interface EvidenceRepository extends Repository<Evidence> {
  findByObservationIds(observationIds: SfiEntityId[]): Promise<Evidence[]>;
}

export interface PredictionRepository extends Repository<unknown> {
  findByStatus(status: PredictionStatus): Promise<unknown[]>;
}

export interface MemoryRepository extends Repository<InstitutionalMemory> {
  findByPhenomenon(phenomenonId: SfiEntityId): Promise<InstitutionalMemory[]>;
}

export interface EventRepository extends Repository<SfiEvent> {
  findByLogbookId(logbookId: string): Promise<SfiEvent[]>;
  findSequenceRange(start: number, end: number): Promise<SfiEvent[]>;
}

export type LifecycleState = 'CREATED' | 'VALIDATING' | 'ACTIVE' | 'ARCHIVED' | 'RETIRED';
export type RuntimeState = 'READY' | 'RUNNING' | 'FAILED' | 'BLOCKED' | 'DISABLED';
export type PredictionStatus = 'PENDING' | 'ACTIVE' | 'VERIFIED' | 'ARCHIVED';

export interface StateSnapshot {
  state: SfiState;
  generatedAt: string;
  sourceMemoryVersion: number;
  hash: string;
}

export type SfiState = 'CREATED' | 'VALIDATING' | 'ACTIVE' | 'ARCHIVED' | 'RETIRED';
