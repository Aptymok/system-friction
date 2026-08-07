import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { streamRecentEpistemicEvents } from '@/lib/events/eventStore';
import {
  SFI_COGNITIVE_AGENT_REGISTRY,
  SFI_COGNITIVE_RUNTIME_MODES,
  SFI_LAYER_QUESTIONS,
  SFI_RUNTIME_SOURCE_TABLES,
} from './registry';
import type {
  SfiCognitiveAgentState,
  SfiCognitiveRuntimeLayer,
  SfiCognitiveRuntimeSnapshot,
  SfiCognitiveRuntimeStatus,
  SfiMemoryAccess,
} from './types';

const freshnessHours = Math.max(1, Number(process.env.SFI_AGENT_EXECUTION_FRESHNESS_HOURS ?? 24));
const freshnessMs = freshnessHours * 60 * 60 * 1000;

function contractEventName(value: unknown) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const eventName = (value as Record<string, unknown>).eventName;
    return typeof eventName === 'string' ? eventName : 'UNNAMED_EVENT_CONTRACT';
  }
  return 'UNNAMED_EVENT_CONTRACT';
}

function sourceId(row: Record<string, unknown>) {
  const source = row.source;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const id = (source as Record<string, unknown>).sourceId;
  return typeof id === 'string' ? id : null;
}

function occurredAt(row: Record<string, unknown>) {
  const value = row.occurred_at ?? row.occurredAt ?? row.created_at;
  if (typeof value !== 'string') return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function isFresh(value: string | null) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() <= freshnessMs;
}

async function probeTables() {
  const db = createServiceSupabaseClient();
  const entries = await Promise.all(SFI_RUNTIME_SOURCE_TABLES.map(async (table) => {
    const result = await db.from(table).select('*', { count: 'exact', head: true });
    return [table, {
      available: !result.error,
      count: result.error ? null : result.count ?? 0,
      error: result.error?.message ?? null,
    }] as const;
  }));
  return new Map(entries);
}

function memoryAccess(memory: string, mode: 'read' | 'write', tableState: Map<string, { available: boolean; count: number | null; error: string | null }>): SfiMemoryAccess {
  const state = tableState.get(memory);
  if (!state) return { memory, mode, status: 'missing', warning: 'Fuente no registrada en el inventario del runtime.' };
  if (!state.available) return { memory, mode, status: 'missing', warning: state.error ?? 'Fuente no disponible.' };
  return { memory, mode, status: 'operational', warning: null };
}

function aggregateStatus(statuses: SfiCognitiveRuntimeStatus[]): SfiCognitiveRuntimeStatus {
  if (!statuses.length) return 'missing';
  if (statuses.some((status) => status === 'missing')) return statuses.some((status) => status === 'operational') ? 'degraded' : 'missing';
  if (statuses.some((status) => status === 'degraded')) return 'degraded';
  if (statuses.some((status) => status === 'operational')) return 'operational';
  return 'gated';
}

export async function readObservedSfiCognitiveRuntime(): Promise<SfiCognitiveRuntimeSnapshot> {
  const [tableState, eventStream] = await Promise.all([
    probeTables(),
    streamRecentEpistemicEvents(300),
  ]);

  const eventRows = (eventStream.data ?? []) as Array<Record<string, unknown>>;
  const executionEvents = eventRows.filter((row) => String(row.event_name ?? '') === 'SFI_AGENT_EXECUTED');

  const agents: SfiCognitiveAgentState[] = SFI_COGNITIVE_AGENT_REGISTRY.map((agent) => {
    const sourceStates = agent.sourceTables.map((table) => [table, tableState.get(table)] as const);
    const observedTables = sourceStates.filter(([, state]) => state?.available).map(([table]) => table);
    const missingTables = sourceStates.filter(([, state]) => !state?.available).map(([table]) => table);
    const latestExecution = executionEvents.find((row) => sourceId(row) === agent.id) ?? null;
    const lastExecutedAt = latestExecution ? occurredAt(latestExecution) : null;

    let status: SfiCognitiveRuntimeStatus;
    if (agent.missingCapability) status = 'missing';
    else if (lastExecutedAt && isFresh(lastExecutedAt)) status = missingTables.length ? 'degraded' : 'operational';
    else if (!observedTables.length && agent.sourceTables.length) status = 'missing';
    else if (missingTables.length) status = 'degraded';
    else status = 'gated';

    const warnings = [
      ...missingTables.map((table) => `${table}: fuente no disponible`),
      ...(lastExecutedAt && !isFresh(lastExecutedAt) ? [`Última ejecución observada fuera de la ventana de ${freshnessHours} h: ${lastExecutedAt}`] : []),
      ...(!lastExecutedAt ? ['No existe una ejecución SFI_AGENT_EXECUTED reciente atribuible a este agente.'] : []),
    ];

    return {
      id: agent.id,
      name: agent.name,
      layer: agent.layer,
      domain: agent.domain,
      authorityLevel: agent.authorityLevel,
      status,
      purpose: agent.purpose,
      route: agent.route,
      listensTo: agent.listensTo.map(contractEventName),
      emits: agent.emits.map(contractEventName),
      readsMemory: agent.readsMemory.map((memory) => memoryAccess(memory, 'read', tableState)),
      writesMemory: agent.writesMemory.map((memory) => memoryAccess(memory, 'write', tableState)),
      confidenceModel: agent.confidenceModel,
      simulationAllowed: agent.simulationAllowed,
      humanApprovalRequired: agent.humanApprovalRequired,
      evidence: {
        sourceTables: agent.sourceTables,
        observedTables,
        missingTables,
        warnings,
      },
    };
  });

  const layerIds = Object.keys(SFI_LAYER_QUESTIONS) as SfiCognitiveRuntimeLayer[];
  const layers = layerIds.map((id) => {
    const layerAgents = agents.filter((agent) => agent.layer === id);
    return {
      id,
      question: SFI_LAYER_QUESTIONS[id],
      agents: layerAgents.map((agent) => agent.id),
      status: aggregateStatus(layerAgents.map((agent) => agent.status)),
      warnings: layerAgents.flatMap((agent) => agent.evidence.warnings).slice(0, 8),
    };
  });

  const modes = SFI_COGNITIVE_RUNTIME_MODES.map((mode) => {
    const observing = agents.filter((agent) => agent.layer === 'observe');
    const status = aggregateStatus(observing.map((agent) => agent.status));
    return {
      ...mode,
      status,
      readsMemory: observing.flatMap((agent) => agent.readsMemory),
      writesMemory: observing.flatMap((agent) => agent.writesMemory),
      warning: status === 'operational' ? null : 'El modo existe, pero no hay suficiente ejecución observada para declararlo plenamente operativo.',
    };
  });

  const recentEvents = eventRows.slice(0, 60).map((row) => ({
    eventId: String(row.event_id ?? row.id ?? ''),
    eventName: String(row.event_name ?? 'epistemic.event'),
    epistemicClass: String(row.epistemic_class ?? 'missing'),
    confidence: typeof row.confidence === 'number' ? row.confidence : Number.isFinite(Number(row.confidence)) ? Number(row.confidence) : null,
    occurredAt: occurredAt(row),
    sourceId: sourceId(row),
  }));

  const operationalAgents = agents.filter((agent) => agent.status === 'operational').length;
  const degradedAgents = agents.filter((agent) => agent.status === 'degraded').length;
  const missingAgents = agents.filter((agent) => agent.status === 'missing').length;
  const runtimeStatus: SfiCognitiveRuntimeStatus = operationalAgents
    ? (degradedAgents || missingAgents ? 'degraded' : 'operational')
    : agents.some((agent) => agent.status === 'gated') ? 'gated' : 'missing';

  const eventWarnings = 'warnings' in eventStream && Array.isArray(eventStream.warnings) ? eventStream.warnings : [];

  return {
    generatedAt: new Date().toISOString(),
    schemaVersion: '2026-08-07.observed-runtime.v1',
    status: runtimeStatus,
    summary: `${operationalAgents} de ${agents.length} agentes tienen ejecución observada dentro de las últimas ${freshnessHours} horas; ${degradedAgents} degradados; ${missingAgents} sin soporte suficiente.`,
    contract: {
      registeredAgents: agents.length,
      operationalModes: modes.filter((mode) => mode.status === 'operational').length,
      executorAgents: operationalAgents,
      humanApprovalAgents: agents.filter((agent) => agent.humanApprovalRequired).length,
    },
    eventGraph: {
      source: 'epistemic_events',
      status: eventWarnings.length ? 'degraded' : recentEvents.length ? 'operational' : 'gated',
      recentEvents,
      warnings: eventWarnings.map(String),
    },
    layers,
    agents,
    modes,
    orchestrationPolicy: {
      principle: 'La ejecución cognitiva se declara por evidencia observable, no por presencia del contrato.',
      taskCreatedEvent: 'SFI_TASK_CREATED',
      executionRule: 'Una capacidad sin ejecución atribuible permanece GATED o DEGRADED; acciones gobernadas requieren la autoridad correspondiente.',
      memoryRule: 'La memoria institucional debe persistir fuera del modelo y conservar procedencia.',
      simulationRule: 'Una simulación no modifica el estado observado ni se publica como observación.',
      calibrationRule: 'Las proyecciones deben regresar a evidencia observada antes de promover aprendizaje.',
    },
  };
}
