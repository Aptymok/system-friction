import 'server-only';

import { createHash, randomUUID } from 'crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { appendEpistemicEvent, streamEpistemicEvents } from '@/lib/events/eventStore';
import {
  SFI_COGNITIVE_AGENT_REGISTRY,
  SFI_COGNITIVE_RUNTIME_MODES,
  SFI_FIELD_TABLES,
  SFI_LAYER_QUESTIONS,
  SFI_RUNTIME_SOURCE_TABLES,
} from './registry';
import type {
  SfiCognitiveAgentState,
  SfiCognitiveRuntimeLayer,
  SfiCognitiveRuntimeSnapshot,
  SfiCognitiveRuntimeStatus,
  SfiMemoryAccess,
  SfiTaskGraph,
  SfiTaskGraphEdge,
  SfiTaskGraphNode,
} from './types';

const schemaVersion = '2026-07-21.sfi-cognitive-runtime.v1';

type TableProbe = {
  table: string;
  ok: boolean;
  count: number | null;
  observedAt: string | null;
  warning: string | null;
};

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function asEventName(value: unknown) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'eventName' in value) {
    const eventName = (value as { eventName?: unknown }).eventName;
    if (typeof eventName === 'string') return eventName;
  }
  return 'UNKNOWN_EVENT';
}

async function probeTable(table: string): Promise<TableProbe> {
  try {
    const service = createServiceSupabaseClient();
    const { data, error } = await service.from(table).select('*').limit(1);
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined;
    const observedAt = typeof row?.updated_at === 'string'
      ? row.updated_at
      : typeof row?.observed_at === 'string'
        ? row.observed_at
        : typeof row?.created_at === 'string'
          ? row.created_at
          : null;
    return { table, ok: true, count: Array.isArray(data) ? data.length : 0, observedAt, warning: null };
  } catch (error) {
    return {
      table,
      ok: false,
      count: null,
      observedAt: null,
      warning: error instanceof Error ? error.message : 'table_probe_failed',
    };
  }
}

function statusForTables(tables: string[], probes: Map<string, TableProbe>, missingCapability: boolean): SfiCognitiveRuntimeStatus {
  if (missingCapability) return 'gated';
  if (!tables.length) return 'missing';
  const states = tables.map((table) => probes.get(table)).filter(Boolean) as TableProbe[];
  if (!states.length) return 'missing';
  if (states.some((probe) => probe.ok)) return states.some((probe) => !probe.ok) ? 'degraded' : 'operational';
  return 'missing';
}

function memoryAccess(memories: string[], mode: 'read' | 'write', probes: Map<string, TableProbe>): SfiMemoryAccess[] {
  return memories.map((memory) => {
    const probe = probes.get(memory);
    return {
      memory,
      mode,
      status: probe?.ok ? 'operational' : 'missing',
      warning: probe?.warning ?? null,
    };
  });
}

function layerStatus(agents: SfiCognitiveAgentState[]): SfiCognitiveRuntimeStatus {
  if (!agents.length) return 'missing';
  if (agents.every((agent) => agent.status === 'operational')) return 'operational';
  if (agents.some((agent) => agent.status === 'operational' || agent.status === 'degraded')) return 'degraded';
  if (agents.some((agent) => agent.status === 'gated')) return 'gated';
  return 'missing';
}

function runtimeStatus(agents: SfiCognitiveAgentState[], eventWarnings: string[]): SfiCognitiveRuntimeStatus {
  if (eventWarnings.length) return 'degraded';
  if (agents.some((agent) => agent.status === 'operational')) return 'degraded';
  return 'missing';
}

export function planCognitiveTaskGraph(question: string): SfiTaskGraph {
  const normalized = question.trim();
  const lower = normalized.toLowerCase();
  const needsHistory = /(hist|201|200|199|context|guadalajara|despues|after|junio|june)/.test(lower);
  const needsGovernance = /(debe|intervencion|aprobar|governance|riesgo|risk|hacer)/.test(lower);
  const needsSimulation = /(simul|variable|pasa|cambia|trajectory|trayectoria|perdio)/.test(lower);

  const requestedAgents = [
    'temporal_resolver',
    'evidence_hunter',
    ...(needsHistory ? ['historical_scout', 'phenotype_resolver', 'context_builder'] : ['context_builder']),
    ...(needsSimulation ? ['trajectory_agent', 'reality_calibration'] : ['reality_calibration']),
    ...(needsGovernance ? ['risk_agent', 'opportunity_agent', 'multi_stakeholder_bootstrap'] : ['risk_agent', 'opportunity_agent']),
  ];
  const nodes: SfiTaskGraphNode[] = [...new Set(requestedAgents)].map((agentId, index) => {
    const contract = SFI_COGNITIVE_AGENT_REGISTRY.find((agent) => agent.id === agentId);
    return {
      id: `task-${index + 1}`,
      agentId,
      label: contract?.name ?? agentId,
      requiresEvidence: contract?.readsMemory ?? [],
      authorityLevel: contract?.authorityLevel ?? 'observer',
      humanApprovalRequired: Boolean(contract?.humanApprovalRequired),
    };
  });
  const edges: SfiTaskGraphEdge[] = nodes.slice(1).map((node, index) => ({
    from: nodes[index].id,
    to: node.id,
    relation: node.agentId === 'reality_calibration'
      ? 'calibrates'
      : node.authorityLevel === 'advisor'
        ? 'governs'
        : 'feeds',
  }));

  return {
    id: `sfi-task-${hash(`${normalized}:${Date.now()}`)}`,
    question: normalized,
    status: normalized ? 'planned' : 'blocked',
    eventName: 'SFI_TASK_CREATED',
    nodes,
    edges,
    minimumEvidence: [...new Set(nodes.flatMap((node) => node.requiresEvidence))],
    blockedReason: normalized ? null : 'missing_question',
  };
}

export async function publishCognitiveTaskGraph(question: string) {
  const taskGraph = planCognitiveTaskGraph(question);
  if (taskGraph.status === 'blocked') return { ok: false as const, taskGraph, error: taskGraph.blockedReason };

  const result = await appendEpistemicEvent({
    eventId: randomUUID(),
    eventName: taskGraph.eventName,
    epistemicClass: 'declared',
    confidence: 0.74,
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'root.cognitive-runtime', sourceType: 'root_runtime' },
    payload: {
      taskGraph,
      contractVersion: schemaVersion,
    },
    lineage: ['root.console', 'sfi.cognitive-runtime'],
    logbookId: 'default',
    schemaVersion,
  });

  if (!result.ok) {
    return {
      ok: false as const,
      taskGraph: { ...taskGraph, status: 'blocked' as const },
      error: result.error,
      details: result.details,
    };
  }

  return { ok: true as const, taskGraph: { ...taskGraph, status: 'persisted' as const }, event: result.data };
}

export async function readSfiCognitiveRuntime(): Promise<SfiCognitiveRuntimeSnapshot> {
  const [tableProbes, events] = await Promise.all([
    Promise.all(SFI_RUNTIME_SOURCE_TABLES.map(probeTable)),
    streamEpistemicEvents('default', 40),
  ]);
  const probes = new Map(tableProbes.map((probe) => [probe.table, probe]));

  const agents: SfiCognitiveAgentState[] = SFI_COGNITIVE_AGENT_REGISTRY.map((agent) => {
    const sourceProbes = agent.sourceTables.map((table) => probes.get(table)).filter(Boolean) as TableProbe[];
    const observedTables = sourceProbes.filter((probe) => probe.ok).map((probe) => probe.table);
    const missingTables = sourceProbes.filter((probe) => !probe.ok).map((probe) => probe.table);
    const warnings = sourceProbes.flatMap((probe) => probe.warning ? [`${probe.table}:${probe.warning}`] : []);
    return {
      id: agent.id,
      name: agent.name,
      layer: agent.layer,
      domain: agent.domain,
      authorityLevel: agent.authorityLevel,
      status: statusForTables(agent.sourceTables, probes, agent.missingCapability),
      purpose: agent.purpose,
      route: agent.route,
      listensTo: agent.listensTo.map(asEventName),
      emits: agent.emits.map(asEventName),
      readsMemory: memoryAccess(agent.readsMemory, 'read', probes),
      writesMemory: memoryAccess(agent.writesMemory, 'write', probes),
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

  const layers = (Object.keys(SFI_LAYER_QUESTIONS) as SfiCognitiveRuntimeLayer[]).map((layer) => {
    const layerAgents = agents.filter((agent) => agent.layer === layer);
    const warnings = layerAgents.flatMap((agent) => agent.evidence.warnings);
    return {
      id: layer,
      question: SFI_LAYER_QUESTIONS[layer],
      agents: layerAgents.map((agent) => agent.id),
      status: layerStatus(layerAgents),
      warnings,
    };
  });

  const eventWarnings = events.ok ? events.warnings ?? [] : ['epistemic_event_graph_unavailable'];
  const status = runtimeStatus(agents, eventWarnings);

  return {
    generatedAt: new Date().toISOString(),
    schemaVersion,
    status,
    summary: status === 'missing'
      ? 'SFI Cognitive Runtime has registered contracts but no readable event graph yet.'
      : 'SFI Cognitive Runtime reads existing memory, event, simulation, and governance surfaces; missing capabilities stay gated.',
    contract: {
      registeredAgents: agents.length,
      operationalModes: SFI_COGNITIVE_RUNTIME_MODES.length,
      executorAgents: agents.filter((agent) => agent.authorityLevel === 'executor').length,
      humanApprovalAgents: agents.filter((agent) => agent.humanApprovalRequired).length,
    },
    eventGraph: {
      source: 'epistemic_events',
      status: eventWarnings.length ? 'degraded' : events.data.length ? 'operational' : 'missing',
      recentEvents: (events.data ?? []).slice(-12).reverse().map((event) => ({
        eventId: String(event.event_id ?? event.eventId ?? ''),
        eventName: String(event.event_name ?? event.eventName ?? ''),
        epistemicClass: String(event.epistemic_class ?? event.epistemicClass ?? 'missing'),
        confidence: typeof event.confidence === 'number'
          ? event.confidence
          : Number.isFinite(Number(event.confidence))
            ? Number(event.confidence)
            : null,
        occurredAt: typeof event.occurred_at === 'string'
          ? event.occurred_at
          : typeof event.occurredAt === 'string'
            ? event.occurredAt
            : null,
        sourceId: typeof event.source?.sourceId === 'string' ? event.source.sourceId : null,
      })),
      warnings: eventWarnings,
    },
    layers,
    agents,
    modes: SFI_COGNITIVE_RUNTIME_MODES.map((mode) => ({
      ...mode,
      status: probes.get('field_cases')?.ok || probes.get('field_events')?.ok ? 'operational' : 'missing',
      readsMemory: memoryAccess(SFI_FIELD_TABLES, 'read', probes),
      writesMemory: [],
      warning: SFI_FIELD_TABLES
        .map((table) => probes.get(table))
        .filter((probe): probe is TableProbe => Boolean(probe?.warning))
        .map((probe) => `${probe.table}:${probe.warning}`)
        .join(' | ') || null,
    })),
    orchestrationPolicy: {
      principle: 'Reduce architectural entropy before increasing cognitive capacity.',
      taskCreatedEvent: 'SFI_TASK_CREATED',
      executionRule: 'The MetaOrchestrator creates task graphs only; agents react through events and cannot bypass authority.',
      memoryRule: 'Agents may read and write only the memories declared in their cognitive contract.',
      simulationRule: 'Simulation output remains epistemically simulated until observed evidence returns.',
      calibrationRule: 'Every prediction must return through observed outcome, error, adjustment, and next readiness.',
    },
  };
}
