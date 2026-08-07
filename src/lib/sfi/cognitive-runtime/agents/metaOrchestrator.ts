import type { KernelContext, KernelEvidence } from '../kernelContext';
import { buildTaskGraph } from '../taskGraphBuilder';

export interface CognitiveTaskPlan {
  taskId: string;
  requiredAgents: string[];
  executionOrder: string[];
  missingInputs: string[];
  readiness: number;
}

/**
 * Complete in-process cognitive topology. These executors only mutate KernelContext
 * and persist runtime events; they do not publish, contact, spend, grant access or
 * perform irreversible external actions. Governed external action remains outside
 * this cycle and subject to the Cognitive Twin / ACP authority gate.
 */
const COGNITIVE_ORDER = [
  'field_observer',
  'evidence_hunter',
  'temporal_resolver',
  'historical_scout',
  'phenotype_resolver',
  'context_builder',
  'cross_impact',
  'friction_field_simulator',
  'social_field_simulator',
  'economic_field_simulator',
  'cultural_simulator',
  'psychological_simulator',
  'policy_simulator',
  'entropy_redistribution',
  'trajectory_agent',
  'risk_agent',
  'opportunity_agent',
  'multi_stakeholder_bootstrap',
  'project_execution_manager',
  'reality_calibration',
] as const;

export function MetaOrchestratorAgent(context: KernelContext): KernelContext {
  const missingInputs: string[] = [];
  if (!context.evidence.length) missingInputs.push('evidence');
  if (!context.hypotheses.length) missingInputs.push('hypothesis_or_observation_question');

  const executionOrder = ['meta_orchestrator', ...COGNITIVE_ORDER];
  const plan: CognitiveTaskPlan = {
    taskId: context.taskId ?? crypto.randomUUID(),
    requiredAgents: [...COGNITIVE_ORDER],
    executionOrder,
    missingInputs,
    readiness: 0,
  };

  const availableSignals = context.evidence.length + context.hypotheses.length + context.simulations.length + context.predictions.length;
  const readiness = Math.min(availableSignals / 10, 1);
  plan.readiness = readiness;

  const evidence: KernelEvidence = {
    id: crypto.randomUUID(),
    source: 'MetaOrchestratorAgent',
    confidence: readiness,
    payload: {
      kind: 'cognitive_plan',
      taskId: plan.taskId,
      missingInputs,
      plannedAgents: executionOrder,
      readiness,
    },
  };
  context.evidence.push(evidence);

  const taskGraph = buildTaskGraph(plan);
  context.metadata = {
    ...context.metadata,
    cognitivePlan: plan,
    taskGraph,
    metaOrchestrator: {
      executed: true,
      readiness,
      plannedAgents: executionOrder.length,
      taskGraphNodes: taskGraph.nodes.length,
      taskGraphEdges: taskGraph.edges.length,
      externalExecutionAllowed: false,
      executedAt: new Date().toISOString(),
    },
  };

  return context;
}
