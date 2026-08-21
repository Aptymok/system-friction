import type { KernelContext } from './kernelContext';
import { runCognitiveAgent } from './runtimeAgentExecutor';

export interface CognitiveCycleResult {
  context: KernelContext;
  executedAgents: string[];
  missingAgents: string[];
  completed: boolean;
}

function plannedAgents(context: KernelContext) {
  const plan = context.metadata?.cognitivePlan;
  const required = plan && typeof plan === 'object' && !Array.isArray(plan)
    ? (plan as Record<string, unknown>).requiredAgents
    : null;
  return Array.isArray(required)
    ? required.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
}

export async function executeCognitiveCycle(context: KernelContext): Promise<CognitiveCycleResult> {
  const executedAgents: string[] = [];
  let currentContext = context;
  const queue: string[] = ['meta_orchestrator'];
  const processedAgents = new Set<string>();

  while (queue.length > 0) {
    const agentId = queue.shift()!;
    if (processedAgents.has(agentId)) continue;
    processedAgents.add(agentId);

    const result = await runCognitiveAgent(agentId, currentContext);
    currentContext = result.context;
    if (result.executed) executedAgents.push(agentId);

    const executionOrder = currentContext.metadata?.cognitivePlan?.executionOrder;
    if (Array.isArray(executionOrder)) {
      for (const nextAgent of executionOrder) {
        if (typeof nextAgent === 'string' && !processedAgents.has(nextAgent)) queue.push(nextAgent);
      }
    }
  }

  const requiredAgents = plannedAgents(currentContext);
  const missingAgents = requiredAgents.filter((agentId) => !executedAgents.includes(agentId));
  const metaExecuted = executedAgents.includes('meta_orchestrator');
  const completed = metaExecuted && missingAgents.length === 0;
  const taskGraph = currentContext.metadata?.taskGraph;

  currentContext.metadata = {
    ...currentContext.metadata,
    taskGraph: taskGraph && typeof taskGraph === 'object' && !Array.isArray(taskGraph)
      ? { ...taskGraph, status: completed ? 'completed' : 'degraded' }
      : undefined,
    taskGraphExecution: {
      status: completed ? 'completed' : 'degraded',
      executedAgents,
      missingAgents,
      completedAt: new Date().toISOString(),
    },
    cognitiveCycle: {
      completed,
      executedAgents,
      missingAgents,
      finishedAt: new Date().toISOString(),
    },
  };

  return { context: currentContext, executedAgents, missingAgents, completed };
}
