import type { KernelContext, KernelEvidence } from '../kernelContext';
import { buildTaskGraph } from '../taskGraphBuilder';
import {
  selectCognitiveAutomations,
  type CognitiveAutomationSelectionMode,
} from '../automationSelector';

export interface CognitiveTaskPlan {
  taskId: string;
  requiredAgents: string[]; // compatibility name: these IDs now denote cognitive automations
  executionOrder: string[];
  missingInputs: string[];
  readiness: number;
  selectionMode: CognitiveAutomationSelectionMode;
  selectionReasons: Record<string, string[]>;
}

/**
 * Complete in-process cognitive topology. Registry IDs are compatibility
 * identifiers for punctual cognitive automations, not autonomous institutional
 * actors. Automations mutate KernelContext and persist runtime traces only; they
 * do not publish, contact, spend, grant access or perform irreversible external
 * actions. Governed external action remains outside this cycle and subject to
 * the Cognitive Twin / ACP authority gate.
 *
 * Selection is explicit when the caller requests automations. Otherwise the
 * system deterministically auto-elects the minimum relevant set from the
 * current context and records why each automation was selected. Selection never
 * grants additional authority.
 */
export function MetaOrchestratorAgent(context: KernelContext): KernelContext {
  const missingInputs: string[] = [];
  if (!context.evidence.length) missingInputs.push('evidence');
  if (!context.hypotheses.length && context.metadata?.studioAction === 'verify') missingInputs.push('hypothesis');

  const selection = selectCognitiveAutomations(context);
  const requiredAgents = selection.automationIds;
  const executionOrder = ['meta_orchestrator', ...requiredAgents];
  const plan: CognitiveTaskPlan = {
    taskId: context.taskId ?? crypto.randomUUID(),
    requiredAgents,
    executionOrder,
    missingInputs,
    readiness: 0,
    selectionMode: selection.mode,
    selectionReasons: selection.reasons,
  };

  const availableSignals = context.evidence.length + context.hypotheses.length + context.simulations.length + context.predictions.length;
  const minimumSignalTarget = Math.max(2, Math.min(8, requiredAgents.length));
  const readiness = Math.min(availableSignals / minimumSignalTarget, 1);
  plan.readiness = readiness;

  const evidence: KernelEvidence = {
    id: crypto.randomUUID(),
    source: 'MetaOrchestratorAutomation',
    confidence: readiness,
    payload: {
      kind: 'cognitive_automation_plan',
      taskId: plan.taskId,
      missingInputs,
      selectedAutomations: executionOrder,
      selectionMode: selection.mode,
      selectionReasons: selection.reasons,
      requestedAutomationCount: Array.isArray(context.metadata?.requestedAutomations)
        ? context.metadata.requestedAutomations.length
        : Array.isArray(context.metadata?.requestedAgents)
          ? context.metadata.requestedAgents.length
          : null,
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
      executionKind: 'cognitive_automation',
      selectionMode: selection.mode,
      selectionReasons: selection.reasons,
      readiness,
      selectedAutomations: executionOrder.length,
      taskGraphNodes: taskGraph.nodes.length,
      taskGraphEdges: taskGraph.edges.length,
      externalExecutionAllowed: false,
      authorityEscalationAllowed: false,
      executedAt: new Date().toISOString(),
    },
  };

  return context;
}
