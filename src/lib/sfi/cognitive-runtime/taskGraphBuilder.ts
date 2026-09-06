import type { CognitiveTaskPlan } from './agents/metaOrchestrator';
import { SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS, type SfiTaskGraph, type SfiTaskGraphEdge, type SfiTaskGraphNode } from './types';
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

export function buildTaskGraph(plan: CognitiveTaskPlan): SfiTaskGraph {
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
      max: SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS,
      used: 0,
      remaining: SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS,
    },
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
