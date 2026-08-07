import type { CognitiveTaskPlan } from './agents/metaOrchestrator';
import type { SfiTaskGraph, SfiTaskGraphNode, SfiTaskGraphEdge } from './types';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';

function getAgentContract(agentId: string) {
  return SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((agent) => agent.id === agentId);
}

function createNode(agentId: string): SfiTaskGraphNode {
  const contract = getAgentContract(agentId);
  return {
    id: crypto.randomUUID(),
    agentId,
    label: contract?.name ?? agentId,
    requiresEvidence: contract?.sourceTables ?? [],
    authorityLevel: contract?.authorityLevel ?? 'analyst',
    humanApprovalRequired: contract?.humanApprovalRequired ?? false,
  };
}

function relationFor(to: string): SfiTaskGraphEdge['relation'] {
  if (to === 'reality_calibration') return 'calibrates';
  if (['risk_agent', 'opportunity_agent', 'multi_stakeholder_bootstrap', 'project_execution_manager'].includes(to)) return 'governs';
  if (['field_observer', 'evidence_hunter', 'temporal_resolver', 'historical_scout', 'phenotype_resolver', 'context_builder'].includes(to)) return 'requires';
  return 'feeds';
}

function buildSequentialEdges(agentIds: string[]): SfiTaskGraphEdge[] {
  const edges: SfiTaskGraphEdge[] = [];
  for (let index = 1; index < agentIds.length; index += 1) {
    edges.push({ from: agentIds[index - 1], to: agentIds[index], relation: relationFor(agentIds[index]) });
  }
  return edges;
}

export function buildTaskGraph(plan: CognitiveTaskPlan): SfiTaskGraph {
  const agentIds = ['meta_orchestrator', ...plan.requiredAgents].filter((id, index, all) => all.indexOf(id) === index);
  const missingContracts = agentIds.filter((id) => !getAgentContract(id));
  return {
    id: crypto.randomUUID(),
    question: plan.taskId,
    status: missingContracts.length ? 'blocked' : 'planned',
    eventName: 'SFI_TASK_CREATED',
    nodes: agentIds.map(createNode),
    edges: buildSequentialEdges(agentIds),
    minimumEvidence: [...new Set([...plan.missingInputs, ...missingContracts.map((id) => `missing_agent_contract:${id}`)])],
    blockedReason: missingContracts.length ? `Missing cognitive agent contracts: ${missingContracts.join(', ')}` : null,
  };
}
