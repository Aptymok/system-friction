import type { SfiCognitiveRuntimeSnapshot, SfiMemoryAccess } from './types';
import type { KernelContext } from './kernelContext';
import { executeCognitiveCycle } from './cognitiveCycle';
import { recordCognitiveCycleEvent } from './runtimeEventBridge';
import { SFI_COGNITIVE_RUNTIME_MODES, SFI_LAYER_QUESTIONS } from './registry';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';
import { SFI_AGENT_EXECUTION_MAP } from './agentExecutionMap';

function contractEventName(value: unknown) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const eventName = (value as Record<string, unknown>).eventName;
    return typeof eventName === 'string' ? eventName : 'UNNAMED_EVENT_CONTRACT';
  }
  return 'UNNAMED_EVENT_CONTRACT';
}

export async function executeSfiRuntime(context: KernelContext) {
  const result = await executeCognitiveCycle(context);
  await recordCognitiveCycleEvent({
    cycleId: context.cycleId,
    logbookId: context.logbookId,
    taskId: context.taskId,
    phenomenonId: context.phenomenonId,
    executedAgents: result.executedAgents,
  });
  return result;
}

/** Declarative fallback only. Presence of a contract never constitutes execution. */
export function readSfiCognitiveRuntime(): SfiCognitiveRuntimeSnapshot {
  const memory = (name: string, mode: 'read' | 'write'): SfiMemoryAccess => ({
    memory: name,
    mode,
    status: 'gated',
    warning: 'Estado declarativo: esta lectura no verifica disponibilidad ni ejecución.',
  });

  const agents = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((agent) => ({
    id: agent.id,
    name: agent.name,
    layer: agent.layer,
    domain: agent.domain,
    authorityLevel: agent.authorityLevel,
    status: agent.missingCapability || !SFI_AGENT_EXECUTION_MAP[agent.id] ? 'missing' as const : 'gated' as const,
    purpose: agent.purpose,
    route: agent.route,
    listensTo: agent.listensTo.map(contractEventName),
    emits: agent.emits.map(contractEventName),
    readsMemory: agent.readsMemory.map((item) => memory(item, 'read')),
    writesMemory: agent.writesMemory.map((item) => memory(item, 'write')),
    confidenceModel: agent.confidenceModel,
    simulationAllowed: agent.simulationAllowed,
    humanApprovalRequired: agent.humanApprovalRequired,
    evidence: {
      sourceTables: agent.sourceTables,
      observedTables: [],
      missingTables: [],
      warnings: ['Contrato y executor registrados; ejecución no verificada por esta función.'],
    },
  }));

  const layers = (Object.keys(SFI_LAYER_QUESTIONS) as Array<keyof typeof SFI_LAYER_QUESTIONS>).map((id) => ({
    id,
    question: SFI_LAYER_QUESTIONS[id],
    agents: agents.filter((agent) => agent.layer === id).map((agent) => agent.id),
    status: 'gated' as const,
    warnings: ['Capa registrada; use la lectura observada para determinar su estado operativo.'],
  }));

  return {
    generatedAt: new Date().toISOString(),
    schemaVersion: '2026-08-07.declarative-runtime.v2',
    status: 'gated',
    summary: `${agents.length} agentes cognitivos registrados y ${Object.keys(SFI_AGENT_EXECUTION_MAP).length} executors enlazados. La ejecución sólo se declara desde evidencia persistida.`,
    contract: {
      registeredAgents: agents.length,
      operationalModes: 0,
      executorAgents: Object.keys(SFI_AGENT_EXECUTION_MAP).length,
      humanApprovalAgents: agents.filter((agent) => agent.humanApprovalRequired).length,
    },
    eventGraph: {
      source: 'declarative_registry_only',
      status: 'gated',
      recentEvents: [],
      warnings: ['Los eventos requieren la lectura observada respaldada por epistemic_events.'],
    },
    layers,
    agents,
    modes: SFI_COGNITIVE_RUNTIME_MODES.map((mode) => ({
      ...mode,
      status: 'gated' as const,
      readsMemory: [],
      writesMemory: [],
      warning: 'Modo registrado; ejecución no verificada.',
    })),
    orchestrationPolicy: {
      principle: 'La presencia del contrato no constituye ejecución.',
      taskCreatedEvent: 'SFI_TASK_CREATED',
      executionRule: 'Sólo la evidencia persistida puede elevar una capacidad a estado operativo.',
      memoryRule: 'La memoria institucional debe vivir fuera del modelo.',
      simulationRule: 'La simulación no modifica el estado observado.',
      calibrationRule: 'Toda proyección debe regresar a evidencia antes de producir aprendizaje.',
    },
  };
}
