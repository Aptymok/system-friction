import type { CognitiveTaskPlan } from './agents/metaOrchestrator';
import {
  SFI_ADAPTIVE_EXECUTION_DEADLINE_MS,
  SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS,
  SFI_ADAPTIVE_MAX_MODEL_CALLS,
  SFI_ADAPTIVE_MAX_TRAJECTORY_DEPTH,
  type SfiRuntimeBoundOverrides,
  type SfiRuntimeStopCostControls,
  type SfiTaskGraph,
  type SfiTaskGraphEdge,
  type SfiTaskGraphNode,
} from './types';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';

function getAgentContract(agentId: string) {
  return SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((agent) => agent.id === agentId);
}

function initialReason(plan: CognitiveTaskPlan, capabilityId: string) {
  if (capabilityId === 'meta_orchestrator') return 'Initial governed orchestration root.';
  const reasons = plan.selectionReasons[capabilityId] ?? [];
  return reasons.length > 0
    ? `Initial ${plan.selectionMode} selection: ${reasons.join(', ')}`
    : `Initial ${plan.selectionMode} cognitive capability selection.`;
}

function createNode(
  plan: CognitiveTaskPlan,
  capabilityId: string,
  parentNodeId: string | null,
  depth: number,
): SfiTaskGraphNode {
  const contract = getAgentContract(capabilityId);
  const nodeId = crypto.randomUUID();
  const sourceTables = contract?.sourceTables ?? [];
  return {
    id: nodeId,
    agentId: capabilityId,
    label: contract?.name ?? capabilityId,
    requiresEvidence: sourceTables,
    authorityLevel: contract?.authorityLevel ?? 'analyst',
    humanApprovalRequired: contract?.humanApprovalRequired ?? false,
    nodeId,
    capabilityId,
    state: 'PLANNED',
    prerequisites: parentNodeId ? [parentNodeId] : [],
    reason: initialReason(plan, capabilityId),
    requestedBy: parentNodeId ? 'meta_orchestrator' : null,
    inputRefs: [...sourceTables],
    outputRefs: [],
    modelExecutionRef: null,
    requestId: null,
    requestHash: null,
    requiredInputs: [],
    requestedOutputs: [],
    urgency: null,
    parentNodeId,
    ancestorNodeIds: parentNodeId ? [parentNodeId] : [],
    brokerDisposition: null,
    requestEventId: null,
    dispositionEventId: null,
    executionReceiptRef: null,
    supersedesNodeId: null,
    supersededByNodeId: null,
    depth,
  };
}

function relationFor(capabilityId: string): SfiTaskGraphEdge['relation'] {
  if (capabilityId === 'reality_calibration') return 'CALIBRATES';
  if (['risk_agent', 'opportunity_agent', 'multi_stakeholder_bootstrap', 'project_execution_manager'].includes(capabilityId)) return 'GOVERNS';
  if (['field_observer', 'evidence_hunter', 'temporal_resolver', 'historical_scout', 'phenotype_resolver', 'context_builder'].includes(capabilityId)) return 'REQUIRES';
  return 'SUPPLIES';
}

function boundedInteger(value: number | undefined, fallback: number, absoluteMax: number, name: string, allowZero = false) {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1) || value > absoluteMax) {
    throw new Error(`RUNTIME_LIMIT_INVALID:${name}:${String(value)}:MAX_${absoluteMax}`);
  }
  return value;
}

function optionalPositiveInteger(value: number | null | undefined, name: string) {
  if (value === undefined || value === null) return null;
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`RUNTIME_LIMIT_INVALID:${name}:${String(value)}`);
  return value;
}

function optionalCost(value: SfiRuntimeBoundOverrides['maxObservedProviderCost']) {
  if (value === undefined || value === null) return null;
  if (!Number.isFinite(value.amount) || value.amount <= 0 || !value.currency.trim()) {
    throw new Error('RUNTIME_LIMIT_INVALID:maxObservedProviderCost');
  }
  return { amount: value.amount, currency: value.currency.trim().toUpperCase() };
}

function runtimeControls(overrides: SfiRuntimeBoundOverrides = {}): SfiRuntimeStopCostControls {
  const maxDepth = boundedInteger(overrides.maxDepth, SFI_ADAPTIVE_MAX_TRAJECTORY_DEPTH, SFI_ADAPTIVE_MAX_TRAJECTORY_DEPTH, 'maxDepth', true);
  const maxCapabilityInvocations = boundedInteger(
    overrides.maxCapabilityInvocations,
    SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS,
    SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS,
    'maxCapabilityInvocations',
  );
  const maxModelCalls = boundedInteger(overrides.maxModelCalls, SFI_ADAPTIVE_MAX_MODEL_CALLS, SFI_ADAPTIVE_MAX_MODEL_CALLS, 'maxModelCalls');
  const maxDurationMs = boundedInteger(
    overrides.deadlineMs,
    SFI_ADAPTIVE_EXECUTION_DEADLINE_MS,
    SFI_ADAPTIVE_EXECUTION_DEADLINE_MS,
    'deadlineMs',
  );
  const startedAt = new Date().toISOString();
  const deadlineAt = new Date(new Date(startedAt).getTime() + maxDurationMs).toISOString();
  return {
    contract: 'SFI-RUNTIME-STOP-COST-CONTROLS-1.0',
    bounds: {
      maxDepth,
      maxCapabilityInvocations,
      maxModelCalls,
      maxObservedTokens: optionalPositiveInteger(overrides.maxObservedTokens, 'maxObservedTokens'),
      maxObservedProviderCost: optionalCost(overrides.maxObservedProviderCost),
      startedAt,
      deadlineAt,
      maxDurationMs,
    },
    usage: {
      modelCalls: { used: 0, remaining: maxModelCalls, observation: 'OBSERVED' },
      tokens: { used: null, remaining: null, observation: 'NOT_OBSERVED', unobservedCalls: 0 },
      providerCost: { used: null, remaining: null, currency: null, observation: 'NOT_OBSERVED', unobservedCalls: 0 },
    },
    observabilityBoundary: 'UNAVAILABLE_NOT_ZERO_NO_ESTIMATION',
  };
}

export function buildTaskGraph(plan: CognitiveTaskPlan, limits: SfiRuntimeBoundOverrides = {}): SfiTaskGraph {
  const agentIds = ['meta_orchestrator', ...plan.requiredAgents].filter((id, index, all) => all.indexOf(id) === index);
  const missingContracts = agentIds.filter((id) => !getAgentContract(id));
  const root = createNode(plan, 'meta_orchestrator', null, 0);
  const children = agentIds
    .filter((id) => id !== 'meta_orchestrator')
    .map((id) => createNode(plan, id, root.nodeId, 1));
  const nodes = [root, ...children];
  const edges: SfiTaskGraphEdge[] = children.map((node) => ({
    from: root.nodeId,
    to: node.nodeId,
    relation: relationFor(node.capabilityId),
  }));
  const controls = runtimeControls(limits);

  return {
    id: crypto.randomUUID(),
    question: plan.taskId,
    status: missingContracts.length ? 'blocked' : 'planned',
    eventName: 'SFI_TASK_CREATED',
    mode: 'ADAPTIVE',
    initialSelectionMode: plan.selectionMode,
    nodes,
    edges,
    minimumEvidence: [...new Set([...plan.missingInputs, ...missingContracts.map((id) => `missing_agent_contract:${id}`)])],
    blockedReason: missingContracts.length ? `Missing cognitive agent contracts: ${missingContracts.join(', ')}` : null,
    invocationBudget: {
      max: controls.bounds.maxCapabilityInvocations,
      used: 0,
      remaining: controls.bounds.maxCapabilityInvocations,
    },
    runtimeControls: controls,
    stop: { stopped: false, reason: null, evaluatedAt: null },
    mutations: nodes.map((node) => ({
      mutationId: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
      kind: 'NODE_ADDED' as const,
      nodeId: node.nodeId,
      requestId: null,
      detail: { capabilityId: node.capabilityId, state: node.state, initial: true },
    })),
  };
}
