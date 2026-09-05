import { createHash } from 'node:crypto';

import { SFI_AGENT_EXECUTION_MAP } from './agentExecutionMap';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';
import {
  projectCognitivePassport,
  validateCognitivePassportAgainstSource,
  type SfiAuthorityClass,
  type SfiCognitivePassport,
} from './cognitivePassportRegistry';
import type { KernelContext } from './kernelContext';

export const SFI_CAPABILITY_REQUEST_CONTRACT = 'SFI-CAPABILITY-REQUEST-1.0' as const;
export const SFI_RUNTIME_ADAPTIVE_CAPABILITY_GATE = 'SFI-RUNTIME-ADAPTIVE-CAPABILITY-1.0' as const;
export const SFI_CAPABILITY_AUTHORITY_GATE = 'SFI-CAPABILITY-AUTHORITY-1.0' as const;

export type SfiCapabilityRequestUrgency = 'LOW' | 'NORMAL' | 'HIGH' | 'BLOCKING';
export type SfiCapabilityDisposition =
  | 'ADMIT'
  | 'DENY'
  | 'DEFER'
  | 'ALREADY_SATISFIED'
  | 'HUMAN_AUTHORITY_REQUIRED'
  | 'EVIDENCE_REQUIRED';

export interface SfiCapabilityRequest {
  requestId: string;
  trajectoryId: string;
  parentStepId: string | null;
  requestedByCapabilityId: string;
  requestedCapabilityId: string;
  reason: string;
  requiredInputs: string[];
  availableEvidenceRefs: string[];
  requestedOutputs: string[];
  urgency: SfiCapabilityRequestUrgency;
  requestedAt: string;
}

export interface SfiCapabilityHistoryEntry {
  eventId: string | null;
  eventName: string;
  payload: unknown;
}

export interface SfiCapabilityBrokerInput {
  request: SfiCapabilityRequest;
  context: KernelContext;
  history?: SfiCapabilityHistoryEntry[];
  depth?: number;
  remainingInvocationBudget?: number;
  alreadySatisfiedCapabilityIds?: string[];
}

export interface SfiCapabilityBrokerDecision {
  contract: typeof SFI_CAPABILITY_REQUEST_CONTRACT;
  disposition: SfiCapabilityDisposition;
  requestHash: string;
  executionAllowed: boolean;
  deduplicated: boolean;
  reasons: string[];
  requesterPassportId: string | null;
  requestedPassportId: string | null;
  authorityBoundary: 'CAPABILITY_REQUEST_IS_NOT_AUTHORIZATION';
  lineage: string[];
}

type Row = Record<string, unknown>;

const AUTHORITY_ORDER: Record<SfiAuthorityClass, number> = {
  READ: 0,
  RECOMMEND: 1,
  WRITE_INTERNAL: 2,
  EXECUTE_REVERSIBLE: 3,
  EXECUTE_EXTERNAL: 4,
  IRREVERSIBLE: 5,
  CANON: 6,
};

const TERMINAL_DISPOSITIONS = new Set<SfiCapabilityDisposition>([
  'DENY',
  'DEFER',
  'ALREADY_SATISFIED',
  'HUMAN_AUTHORITY_REQUIRED',
  'EVIDENCE_REQUIRED',
]);

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))].sort();
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function sourceFor(capabilityId: string) {
  return SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((item) => item.id === capabilityId) ?? null;
}

export function cognitivePassportForCapability(capabilityId: string): SfiCognitivePassport | null {
  const source = sourceFor(capabilityId);
  if (!source) return null;
  const passport = projectCognitivePassport(source);
  return validateCognitivePassportAgainstSource(passport, source).length === 0 ? passport : null;
}

function canonicalHashMaterial(request: SfiCapabilityRequest) {
  return {
    trajectoryId: request.trajectoryId,
    parentStepId: request.parentStepId,
    requestedByCapabilityId: request.requestedByCapabilityId,
    requestedCapabilityId: request.requestedCapabilityId,
    requiredInputs: strings(request.requiredInputs),
    availableEvidenceRefs: strings(request.availableEvidenceRefs),
    requestedOutputs: strings(request.requestedOutputs),
  };
}

export function capabilityRequestHash(request: SfiCapabilityRequest) {
  return createHash('sha256').update(JSON.stringify(canonicalHashMaterial(request))).digest('hex');
}

function decision(
  input: SfiCapabilityBrokerInput,
  disposition: SfiCapabilityDisposition,
  reasons: string[],
  options: {
    deduplicated?: boolean;
    requesterPassport?: SfiCognitivePassport | null;
    requestedPassport?: SfiCognitivePassport | null;
    lineage?: string[];
  } = {},
): SfiCapabilityBrokerDecision {
  return {
    contract: SFI_CAPABILITY_REQUEST_CONTRACT,
    disposition,
    requestHash: capabilityRequestHash(input.request),
    executionAllowed: disposition === 'ADMIT',
    deduplicated: options.deduplicated ?? false,
    reasons: [...new Set(reasons)],
    requesterPassportId: options.requesterPassport?.id ?? null,
    requestedPassportId: options.requestedPassport?.id ?? null,
    authorityBoundary: 'CAPABILITY_REQUEST_IS_NOT_AUTHORIZATION',
    lineage: [...new Set([input.context.cycleId, input.request.parentStepId, ...(options.lineage ?? [])].filter((value): value is string => Boolean(value)))],
  };
}

function historyPayload(entry: SfiCapabilityHistoryEntry) {
  return row(entry.payload);
}

function historyRequest(entry: SfiCapabilityHistoryEntry) {
  return row(historyPayload(entry).request);
}

function matchingHistory(history: SfiCapabilityHistoryEntry[], requestHash: string) {
  return history.filter((entry) => text(historyPayload(entry).requestHash) === requestHash);
}

function priorDisposition(entries: SfiCapabilityHistoryEntry[]): { disposition: SfiCapabilityDisposition; eventId: string | null } | null {
  for (const entry of [...entries].reverse()) {
    const candidate = text(historyPayload(entry).disposition) as SfiCapabilityDisposition | null;
    if (candidate && (candidate === 'ADMIT' || TERMINAL_DISPOSITIONS.has(candidate))) {
      return { disposition: candidate, eventId: entry.eventId };
    }
  }
  return null;
}

function successfulExecutionReceipt(entries: SfiCapabilityHistoryEntry[]) {
  return [...entries].reverse().find((entry) => {
    if (entry.eventName !== 'SFI_CAPABILITY_EXECUTION_RECEIPT') return false;
    const payload = historyPayload(entry);
    return payload.executed === true && text(payload.executionStatus) === 'EXECUTED';
  }) ?? null;
}

function requestsByRequesterInTrajectory(history: SfiCapabilityHistoryEntry[], request: SfiCapabilityRequest) {
  return history.filter((entry) => {
    if (entry.eventName !== 'SFI_CAPABILITY_REQUESTED') return false;
    const persisted = historyRequest(entry);
    return text(persisted.trajectoryId) === request.trajectoryId
      && text(persisted.requestedByCapabilityId) === request.requestedByCapabilityId
      && (text(persisted.parentStepId) ?? null) === request.parentStepId;
  });
}

function evidenceClass(value: unknown) {
  const payload = row(value);
  return text(payload.epistemicClass)?.toUpperCase() ?? null;
}

function evidenceById(context: KernelContext) {
  return new Map((context.evidence ?? []).filter((item) => item && typeof item.id === 'string').map((item) => [item.id, item] as const));
}

function invalidScope(request: SfiCapabilityRequest, requestedPassport: SfiCognitivePassport) {
  const allowedInputs = new Set([
    ...requestedPassport.input.required,
    ...requestedPassport.input.optional,
    ...requestedPassport.tools.allowedResources,
  ]);
  const forbidden = new Set(requestedPassport.tools.forbiddenResources);
  const invalidInputs = request.requiredInputs.filter((item) => !allowedInputs.has(item) || forbidden.has(item));
  const allowedOutputs = new Set(requestedPassport.output.allowedEpistemicClasses);
  const invalidOutputs = request.requestedOutputs.filter((item) => !allowedOutputs.has(item));
  return { invalidInputs, invalidOutputs };
}

function missingEvidencePrerequisites(request: SfiCapabilityRequest, context: KernelContext, requestedPassport: SfiCognitivePassport) {
  const byId = evidenceById(context);
  const missingRefs = request.availableEvidenceRefs.filter((ref) => !byId.has(ref));
  const referenced = request.availableEvidenceRefs.map((ref) => byId.get(ref)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const availableClasses = new Set(referenced.map((item) => evidenceClass(item.payload)).filter((item): item is string => Boolean(item)));
  const missingClasses = requestedPassport.input.requiredEvidenceClasses.filter((requiredClass) => !availableClasses.has(requiredClass));
  return { missingRefs, missingClasses };
}

function validateRequestShape(request: SfiCapabilityRequest) {
  const errors: string[] = [];
  if (!request.requestId.trim()) errors.push('REQUEST_ID_REQUIRED');
  if (!request.trajectoryId.trim()) errors.push('TRAJECTORY_ID_REQUIRED');
  if (!request.requestedByCapabilityId.trim()) errors.push('REQUESTER_CAPABILITY_REQUIRED');
  if (!request.requestedCapabilityId.trim()) errors.push('REQUESTED_CAPABILITY_REQUIRED');
  if (!request.reason.trim()) errors.push('REASON_REQUIRED');
  if (!['LOW', 'NORMAL', 'HIGH', 'BLOCKING'].includes(request.urgency)) errors.push('URGENCY_INVALID');
  if (!Number.isFinite(new Date(request.requestedAt).getTime())) errors.push('REQUESTED_AT_INVALID');
  return errors;
}

export function evaluateCapabilityRequest(input: SfiCapabilityBrokerInput): SfiCapabilityBrokerDecision {
  const request = input.request;
  const requestHash = capabilityRequestHash(request);
  const history = input.history ?? [];
  const requesterSource = sourceFor(request.requestedByCapabilityId);
  const requestedSource = sourceFor(request.requestedCapabilityId);
  const requesterPassport = requesterSource ? projectCognitivePassport(requesterSource) : null;
  const requestedPassport = requestedSource ? projectCognitivePassport(requestedSource) : null;

  const shapeErrors = validateRequestShape(request);
  if (shapeErrors.length > 0) {
    return decision(input, 'DENY', shapeErrors, { requesterPassport, requestedPassport });
  }
  if (request.trajectoryId !== input.context.cycleId) {
    return decision(input, 'DENY', ['TRAJECTORY_MISMATCH'], { requesterPassport, requestedPassport });
  }
  if (!requesterSource || !requesterPassport || requesterSource.missingCapability) {
    return decision(input, 'DENY', ['REQUESTER_PASSPORT_OR_SOURCE_CONTRACT_UNAVAILABLE'], { requesterPassport, requestedPassport });
  }
  if (!requestedSource || !requestedPassport || requestedSource.missingCapability || typeof SFI_AGENT_EXECUTION_MAP[request.requestedCapabilityId] !== 'function') {
    return decision(input, 'DENY', ['REQUESTED_CAPABILITY_NOT_EXECUTABLE_OR_CANONICAL'], { requesterPassport, requestedPassport });
  }

  const requesterErrors = validateCognitivePassportAgainstSource(requesterPassport, requesterSource);
  const requestedErrors = validateCognitivePassportAgainstSource(requestedPassport, requestedSource);
  if (requesterErrors.length > 0 || requestedErrors.length > 0) {
    return decision(input, 'DENY', ['CANONICAL_PASSPORT_SOURCE_CONTRACT_MISMATCH', ...requesterErrors, ...requestedErrors], { requesterPassport, requestedPassport });
  }

  if (request.requestedByCapabilityId === request.requestedCapabilityId) {
    return decision(input, 'DENY', ['SELF_CAPABILITY_REQUEST_FORBIDDEN'], { requesterPassport, requestedPassport });
  }
  if (!requesterPassport.orchestration.mayRequestCapabilities) {
    return decision(input, 'DENY', ['REQUESTER_CAPABILITY_REQUESTS_DISABLED'], { requesterPassport, requestedPassport });
  }
  if (!requesterPassport.orchestration.requestableCapabilityIds.includes(request.requestedCapabilityId)) {
    return decision(input, 'DENY', ['REQUESTED_CAPABILITY_OUTSIDE_PASSPORT_SCOPE'], { requesterPassport, requestedPassport });
  }

  const alreadySatisfied = new Set(input.alreadySatisfiedCapabilityIds ?? []);
  if (alreadySatisfied.has(request.requestedCapabilityId)) {
    return decision(input, 'ALREADY_SATISFIED', ['CAPABILITY_ALREADY_SATISFIED_IN_TRAJECTORY'], { requesterPassport, requestedPassport });
  }

  const prior = matchingHistory(history, requestHash);
  const successfulReceipt = successfulExecutionReceipt(prior);
  if (successfulReceipt) {
    return decision(input, 'ALREADY_SATISFIED', ['EQUIVALENT_REQUEST_ALREADY_EXECUTED'], {
      deduplicated: true,
      requesterPassport,
      requestedPassport,
      lineage: [successfulReceipt.eventId].filter((value): value is string => Boolean(value)),
    });
  }
  if (prior.some((entry) => entry.eventName === 'SFI_CAPABILITY_REQUESTED')) {
    const previousDisposition = priorDisposition(prior);
    if (!previousDisposition) {
      return decision(input, 'DEFER', ['DUPLICATE_IN_FLIGHT_REQUEST_TERMINATED'], {
        deduplicated: true,
        requesterPassport,
        requestedPassport,
        lineage: prior.map((entry) => entry.eventId).filter((value): value is string => Boolean(value)),
      });
    }
    if (previousDisposition.disposition === 'ADMIT') {
      return decision(input, 'DEFER', ['DUPLICATE_ADMITTED_REQUEST_WITHOUT_EXECUTION_RECEIPT'], {
        deduplicated: true,
        requesterPassport,
        requestedPassport,
        lineage: [previousDisposition.eventId].filter((value): value is string => Boolean(value)),
      });
    }
    return decision(input, previousDisposition.disposition, ['EQUIVALENT_REQUEST_REUSES_PRIOR_DISPOSITION'], {
      deduplicated: true,
      requesterPassport,
      requestedPassport,
      lineage: [previousDisposition.eventId].filter((value): value is string => Boolean(value)),
    });
  }

  const scope = invalidScope(request, requestedPassport);
  if (scope.invalidInputs.length > 0 || scope.invalidOutputs.length > 0) {
    return decision(input, 'DENY', [
      ...scope.invalidInputs.map((item) => `INPUT_OUTSIDE_CAPABILITY_SCOPE:${item}`),
      ...scope.invalidOutputs.map((item) => `OUTPUT_OUTSIDE_CAPABILITY_SCOPE:${item}`),
    ], { requesterPassport, requestedPassport });
  }

  if (AUTHORITY_ORDER[requestedPassport.authority.ceiling] > AUTHORITY_ORDER[requesterPassport.authority.ceiling]) {
    return decision(input, 'DENY', [
      `AUTHORITY_CEILING_EXCEEDED:${requesterPassport.authority.ceiling}:${requestedPassport.authority.ceiling}`,
    ], { requesterPassport, requestedPassport });
  }

  if (requestedPassport.authority.confirmationRequirement === 'HUMAN') {
    return decision(input, 'HUMAN_AUTHORITY_REQUIRED', ['REQUESTED_CAPABILITY_REQUIRES_HUMAN_CONFIRMATION'], { requesterPassport, requestedPassport });
  }

  const evidence = missingEvidencePrerequisites(request, input.context, requestedPassport);
  if (evidence.missingRefs.length > 0 || evidence.missingClasses.length > 0) {
    return decision(input, 'EVIDENCE_REQUIRED', [
      ...evidence.missingRefs.map((item) => `EVIDENCE_REF_NOT_AVAILABLE:${item}`),
      ...evidence.missingClasses.map((item) => `REQUIRED_EVIDENCE_CLASS_MISSING:${item}`),
    ], { requesterPassport, requestedPassport });
  }

  const depth = Math.max(0, Math.trunc(input.depth ?? 1));
  if (depth > requesterPassport.orchestration.maxDepth) {
    return decision(input, 'DEFER', [`MAX_DEPTH_REACHED:${depth}:${requesterPassport.orchestration.maxDepth}`], { requesterPassport, requestedPassport });
  }
  if ((input.remainingInvocationBudget ?? 1) <= 0) {
    return decision(input, 'DEFER', ['CAPABILITY_INVOCATION_BUDGET_EXHAUSTED'], { requesterPassport, requestedPassport });
  }
  const priorChildren = requestsByRequesterInTrajectory(history, request).length;
  if (priorChildren >= requesterPassport.orchestration.maxChildren) {
    return decision(input, 'DEFER', [`MAX_CHILDREN_REACHED:${priorChildren}:${requesterPassport.orchestration.maxChildren}`], { requesterPassport, requestedPassport });
  }

  return decision(input, 'ADMIT', [
    'CANONICAL_PASSPORT_VERIFIED',
    'SOURCE_CONTRACT_VERIFIED',
    'CAPABILITY_SCOPE_VERIFIED',
    'AUTHORITY_CEILING_VERIFIED',
    'EVIDENCE_PREREQUISITES_VERIFIED',
    'BOUNDED_REQUEST_VERIFIED',
  ], { requesterPassport, requestedPassport });
}
