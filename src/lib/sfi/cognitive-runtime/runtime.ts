import type { SfiCognitiveRuntimeSnapshot, SfiMemoryAccess } from './types';
import type { KernelContext } from './kernelContext';
import { executeCognitiveCycle } from './cognitiveCycle';
import { recordCognitiveCycleEvent } from './runtimeEventBridge';
import {
  SFI_COGNITIVE_AGENT_REGISTRY,
  SFI_COGNITIVE_RUNTIME_MODES,
  SFI_LAYER_QUESTIONS,
} from './registry';

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

/**
 * Declarative fallback only.
 * This function never claims that a registered capability is operational.
 * ROOT and governed APIs must use readObservedSfiCognitiveRuntime(), which
 * reconciles the registry against persisted events and persistence probes.
 */
export function readSfiCognitiveRuntime(): SfiCognitiveRuntimeSnapshot {
  const memory = (name: string, mode: 'read' | 'write'): SfiMemoryAccess => ({
    memory: name,
    mode,
    status: 'gated',
    warning: 'Estado declarativo: esta lectura no verifica disponibilidad ni ejecución.',
  });

  const agents = SFI_COGNITIVE_AGENT_REGISTRY.map((agent) => ({
    id: agent.id,
    name: agent.name,
    layer: agent.layer,
    domain: agent.domain,
    authorityLevel: agent.authorityLevel,
    status: agent.missingCapability ? 'missing' as const : 'gated' as const,
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
      warnings: ['Contrato registrado; ejecución no verificada por esta función.'],
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
    schemaVersion: '2026-08-07.declarative-runtime.v1',
    status: 'gated',
    summary: `${agents.length} agentes registrados. Esta vista no contiene evidencia suficiente para declarar ejecución.`,
    contract: {
      registeredAgents: agents.length,
      operationalModes: 0,
      executorAgents: 0,
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
