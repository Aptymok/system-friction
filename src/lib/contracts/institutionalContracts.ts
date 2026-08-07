import { z } from 'zod';

const IsoDate = z.string().datetime();
const Id = z.string().min(1);
const EvidenceRefs = z.array(z.string().min(1)).default([]);
const EpistemicClass = z.enum(['observed', 'declared', 'derived', 'inferred', 'simulated', 'fixture', 'missing']);

export const ObservationContract = z.object({ observationId: Id, subjectId: Id, sourceId: Id, observedAt: IsoDate, epistemicClass: EpistemicClass, confidence: z.number().min(0).max(1), payload: z.unknown(), evidenceRefs: EvidenceRefs });
export const EvidenceContract = z.object({ evidenceId: Id, source: Id, capturedAt: IsoDate, hash: z.string().min(16), epistemicClass: EpistemicClass, confidence: z.number().min(0).max(1), lineage: EvidenceRefs, payload: z.unknown() });
export const EventContract = z.object({ eventId: Id, eventName: Id, occurredAt: IsoDate, epistemicClass: EpistemicClass, confidence: z.number().min(0).max(1), payload: z.unknown(), evidenceRefs: EvidenceRefs });
export const AgentContract = z.object({ id: Id, purpose: Id, domain: Id, authorityLevel: z.enum(['observer', 'analyst', 'advisor', 'executor']), listensTo: z.array(z.unknown()), emits: z.array(z.unknown()), readsMemory: z.array(Id), writesMemory: z.array(Id), simulationAllowed: z.boolean(), humanApprovalRequired: z.boolean() });
export const AgentExecutionContract = z.object({ executionId: Id, agentId: Id, taskId: Id.nullable(), startedAt: IsoDate, completedAt: IsoDate.nullable(), status: z.enum(['PLANNED', 'RUNNING', 'COMPLETED', 'SKIPPED', 'FAILED', 'BLOCKED']), inputEvidenceRefs: EvidenceRefs, outputEvidenceRefs: EvidenceRefs, warnings: z.array(z.string()).default([]) });
export const CapabilityContract = z.object({ capabilityId: Id, owner: Id, authorityLevel: z.enum(['A0', 'A1', 'A2', 'A3']), state: z.enum(['REGISTERED', 'AVAILABLE', 'OPERATIONAL', 'DEGRADED', 'FAILED', 'BLOCKED']), reversible: z.boolean(), evidenceRefs: EvidenceRefs });
export const PhenomenonContract = z.object({ phenomenonId: Id, name: Id, registeredAt: IsoDate, status: z.enum(['REGISTERED', 'OBSERVING', 'HYPOTHESIZED', 'CALIBRATING', 'CLOSED']), observationRefs: EvidenceRefs, evidenceRefs: EvidenceRefs, attributes: z.record(z.string(), z.unknown()).default({}) });
export const PredictionContract = z.object({ predictionId: Id, subjectId: Id, createdAt: IsoDate, dueAt: IsoDate, predictedValue: z.number().nullable(), lowerBound: z.number().nullable(), upperBound: z.number().nullable(), confidence: z.number().min(0).max(1), evidenceRefs: EvidenceRefs, status: z.enum(['OPEN', 'WAITING_EVIDENCE', 'DUE', 'CLOSED', 'UNVERIFIABLE']) });
export const FormulaContract = z.object({ formulaId: Id, version: Id, expression: Id, variables: z.array(Id), scope: Id, status: z.enum(['LAB', 'CANONICAL', 'DEPRECATED', 'REJECTED']), evidenceRefs: EvidenceRefs });
export const MemoryContract = z.object({ memoryId: Id, namespace: Id, createdAt: IsoDate, epistemicClass: EpistemicClass, content: z.unknown(), evidenceRefs: z.array(z.string().min(1)).min(1), status: z.enum(['CANDIDATE', 'ACTIVE', 'SUPERSEDED', 'REJECTED']) });
export const StateContract = z.object({ stateId: Id, subjectId: Id, observedAt: IsoDate, state: Id, epistemicClass: EpistemicClass, evidenceRefs: EvidenceRefs, previousStateId: z.string().nullable() });
export const ErrorContract = z.object({ errorId: Id, code: Id, occurredAt: IsoDate, severity: z.enum(['P0', 'P1', 'P2', 'P3']), component: Id, message: Id, recoverable: z.boolean(), evidenceRefs: EvidenceRefs });
export const OperationContract = z.object({ operationId: Id, capabilityId: Id, actorId: Id, requestedAt: IsoDate, state: z.enum(['REQUESTED', 'AUTHORIZED', 'EXECUTING', 'COMPLETED', 'FAILED', 'BLOCKED', 'ROLLED_BACK']), reversible: z.boolean(), evidenceRefs: EvidenceRefs });
export const RequestContract = z.object({ requestId: Id, requesterId: Id, requestedAt: IsoDate, intent: Id, authorityRequired: z.enum(['A0', 'A1', 'A2', 'A3']), input: z.unknown(), evidenceRefs: EvidenceRefs });
export const GovernanceDecisionContract = z.object({ decisionId: Id, authority: Id, decidedAt: IsoDate, action: Id, outcome: z.enum(['APPROVED', 'REJECTED', 'DEFERRED', 'SUPERSEDED']), rationale: Id, evidenceRefs: z.array(z.string().min(1)).min(1), auditRef: Id });

export const SFI_INSTITUTIONAL_CONTRACTS = {
  Observation: ObservationContract, Evidence: EvidenceContract, Event: EventContract, Agent: AgentContract,
  AgentExecution: AgentExecutionContract, Capability: CapabilityContract, Phenomenon: PhenomenonContract,
  Prediction: PredictionContract, Formula: FormulaContract, Memory: MemoryContract, State: StateContract,
  Error: ErrorContract, Operation: OperationContract, Request: RequestContract, GovernanceDecision: GovernanceDecisionContract,
} as const;

export type SfiInstitutionalContractName = keyof typeof SFI_INSTITUTIONAL_CONTRACTS;

export const SFI_INSTITUTIONAL_CONTRACT_MANIFEST: Array<{ name: SfiInstitutionalContractName; runtimeAnchor: string; adoption: 'ACTIVE' }> = [
  { name: 'Observation', runtimeAnchor: 'world-observatory/worldCycle + cognitive-runtime/fieldObserver', adoption: 'ACTIVE' },
  { name: 'Evidence', runtimeAnchor: 'api/root/evidence + cognitive-twin/evidenceIngestion + events/eventStore', adoption: 'ACTIVE' },
  { name: 'Event', runtimeAnchor: 'packages/events/src/schema + events/eventStore', adoption: 'ACTIVE' },
  { name: 'Agent', runtimeAnchor: 'cognitive-runtime/convergedRegistry + agent passports', adoption: 'ACTIVE' },
  { name: 'AgentExecution', runtimeAnchor: 'cognitive-runtime/runtimeAgentExecutor + institutionalCycle', adoption: 'ACTIVE' },
  { name: 'Capability', runtimeAnchor: 'continuity/contracts + governed execution registry', adoption: 'ACTIVE' },
  { name: 'Phenomenon', runtimeAnchor: 'sfi_phenomena + phenomenonTrajectory + automatic PPOI reference cases', adoption: 'ACTIVE' },
  { name: 'Prediction', runtimeAnchor: 'predictive-engine + root/predictions + reality calibration', adoption: 'ACTIVE' },
  { name: 'Formula', runtimeAnchor: 'MIHM canonical variable registry + method selection + formula tests', adoption: 'ACTIVE' },
  { name: 'Memory', runtimeAnchor: 'cognitive-twin memory + AMV memory + evidence synchronization', adoption: 'ACTIVE' },
  { name: 'State', runtimeAnchor: 'epistemic events + continuity state + attractor/phenomenon trajectories', adoption: 'ACTIVE' },
  { name: 'Error', runtimeAnchor: 'continuity incidents + runtime warnings + fail-closed API errors', adoption: 'ACTIVE' },
  { name: 'Operation', runtimeAnchor: 'continuity runs + governed ROOT actions + institutional cognitive cycles', adoption: 'ACTIVE' },
  { name: 'Request', runtimeAnchor: 'ROOT action requests + cognitive task requests + authority gates', adoption: 'ACTIVE' },
  { name: 'GovernanceDecision', runtimeAnchor: 'ACP + root audit + cognitive twin decisions', adoption: 'ACTIVE' },
];
