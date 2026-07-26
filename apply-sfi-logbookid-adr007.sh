#!/usr/bin/env bash
set -euo pipefail

# SFI -- ADR-007: logbookId por ciclo cognitivo, UUID en vez de 'default' compartido.
# publishCognitiveTaskGraph genera un logbookId propio (cycle:<uuid>) por cada
# pregunta/ciclo y lo devuelve al llamador. El dashboard de ROOT deja de leer
# 'default' y pasa a streamRecentEpistemicEvents (cross-logbook, sin verificar
# cadena de hash -- eso sigue siendo responsabilidad de streamEpistemicEvents con
# un logbookId especifico, sin cambios).
# Correr desde la raiz del repo (system-friction/).

if [ ! -f "package.json" ] || ! grep -q "system-friction-terminal" package.json; then
  echo "Error: corre este script desde la raiz del repo (system-friction/)." >&2
  exit 1
fi

echo "-> Sobrescribiendo src/lib/events/eventStore.ts (streamRecentEpistemicEvents agregado)"
cat > src/lib/events/eventStore.ts <<'SFI_EOF_EVENTSTORE_9f2a1'
import { createHash, randomUUID } from 'crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  canonicalizeEventPayload,
  isEpistemicClass,
  validateEpistemicEventShape,
  type EpistemicClass,
  type EpistemicEventRecord,
  type SFIEvent,
} from '../../../packages/events/src/schema';

const schemaVersion = '2026-05-27.epistemic-events.v1';
const genesisHash = 'GENESIS';

function sha256(value: unknown) {
  return createHash('sha256').update(JSON.stringify(canonicalizeEventPayload(value))).digest('hex');
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function normalizeEvent(input: Partial<SFIEvent> & { logbookId?: string; schemaVersion?: string }): Omit<EpistemicEventRecord, 'hashPrev' | 'hashSelf' | 'createdAt'> {
  const occurredAt = typeof input.occurredAt === 'string' && input.occurredAt.length > 0
    ? new Date(input.occurredAt).toISOString()
    : new Date().toISOString();
  const epistemicClass: EpistemicClass = isEpistemicClass(input.epistemicClass) ? input.epistemicClass as EpistemicClass : 'missing';
  const payload = input.payload ?? {};
  const checksum = typeof input.checksum === 'string' && input.checksum.length > 0 ? input.checksum : sha256(payload);

  return {
    eventId: typeof input.eventId === 'string' && input.eventId.length > 0 ? input.eventId : randomUUID(),
    eventName: typeof input.eventName === 'string' && input.eventName.length > 0 ? input.eventName : 'epistemic.event',
    epistemicClass,
    confidence: clamp01(Number(input.confidence ?? 0)),
    payload,
    occurredAt,
    source: input.source ?? { sourceId: 'unknown', sourceType: 'unknown' },
    checksum,
    lineage: Array.isArray(input.lineage) ? input.lineage.filter((item): item is string => typeof item === 'string') : [],
    uncertainty: typeof input.uncertainty === 'string' ? input.uncertainty : undefined,
    logbookId: typeof input.logbookId === 'string' && input.logbookId.length > 0 ? input.logbookId : 'default',
    schemaVersion: typeof input.schemaVersion === 'string' && input.schemaVersion.length > 0 ? input.schemaVersion : schemaVersion,
  };
}

function toHashMaterial(event: Omit<EpistemicEventRecord, 'hashSelf' | 'createdAt'>) {
  return {
    eventId: event.eventId,
    eventName: event.eventName,
    logbookId: event.logbookId,
    epistemicClass: event.epistemicClass,
    schemaVersion: event.schemaVersion,
    source: event.source,
    confidence: event.confidence,
    payload: event.payload,
    checksum: event.checksum,
    lineage: event.lineage ?? [],
    uncertainty: event.uncertainty ?? null,
    occurredAt: event.occurredAt,
    hashPrev: event.hashPrev,
  };
}

export function hashEpistemicEvent(event: Omit<EpistemicEventRecord, 'hashSelf' | 'createdAt'>) {
  return sha256(toHashMaterial(event));
}

export async function appendEpistemicEvent(input: Partial<SFIEvent> & { logbookId?: string; schemaVersion?: string }) {
  const service = createServiceSupabaseClient();
  const event = normalizeEvent(input);

  if (!validateEpistemicEventShape(event)) {
    return { ok: false as const, error: 'invalid_epistemic_event' };
  }

  const { data: latest } = await service
    .from('epistemic_events')
    .select('hash_self')
    .eq('logbook_id', event.logbookId)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();

  const hashPrev = typeof latest?.hash_self === 'string' ? latest.hash_self : null;
  const hashSelf = hashEpistemicEvent({ ...event, hashPrev });

  const { data, error } = await service
    .from('epistemic_events')
    .insert({
      event_id: event.eventId,
      event_name: event.eventName,
      logbook_id: event.logbookId,
      epistemic_class: event.epistemicClass,
      schema_version: event.schemaVersion,
      source: event.source,
      confidence: event.confidence,
      payload: event.payload,
      checksum: event.checksum,
      lineage: event.lineage,
      uncertainty: event.uncertainty ?? null,
      occurred_at: event.occurredAt,
      hash_prev: hashPrev,
      hash_self: hashSelf,
    })
    .select('*')
    .single();

  if (error) return { ok: false as const, error: 'epistemic_event_append_failed', details: error.message };
  return { ok: true as const, data };
}

export async function streamEpistemicEvents(logbookId = 'default', limit = 100) {
  let service;

  try {
    service = createServiceSupabaseClient();
  } catch (error) {
    return {
      ok: true as const,
      data: [],
      warnings: ['epistemic_event_store_not_ready'],
      details: error instanceof Error ? error.message : String(error),
    };
  }

  const { data, error } = await service
    .from('epistemic_events')
    .select('*')
    .eq('logbook_id', logbookId)
    .order('sequence', { ascending: true })
    .limit(Math.max(1, Math.min(500, limit)));

  if (error) {
    return {
      ok: true as const,
      data: [],
      warnings: ['epistemic_event_stream_not_ready'],
      details: error.message,
    };
  }

  return { ok: true as const, data: data ?? [] };
}

/**
 * Cross-logbook activity read (ADR-007). streamEpistemicEvents is scoped to one
 * logbookId because its hash chain (hashPrev/hashSelf) is verified per logbook --
 * mixing logbooks there would make chain verification meaningless. This function
 * does not verify a chain; it answers "what happened recently, across any cycle",
 * for dashboards that no longer have one well-known logbookId to look at now that
 * each cognitive cycle gets its own UUID instead of a shared 'default'.
 */
export async function streamRecentEpistemicEvents(limit = 100) {
  let service;

  try {
    service = createServiceSupabaseClient();
  } catch (error) {
    return {
      ok: true as const,
      data: [],
      warnings: ['epistemic_event_store_not_ready'],
      details: error instanceof Error ? error.message : String(error),
    };
  }

  const { data, error } = await service
    .from('epistemic_events')
    .select('*')
    .order('sequence', { ascending: false })
    .limit(Math.max(1, Math.min(500, limit)));

  if (error) {
    return {
      ok: true as const,
      data: [],
      warnings: ['epistemic_event_stream_not_ready'],
      details: error.message,
    };
  }

  return { ok: true as const, data: data ?? [] };
}

export async function verifyEpistemicEventChain(logbookId = 'default', limit = 100) {
  const streamed = await streamEpistemicEvents(logbookId, limit);
  if (!streamed.ok) return streamed;

  let previous: string | null = null;
  const failures: Array<{ eventId: string; reason: string }> = [];

  for (const row of streamed.data) {
    const expectedPrev = previous;
    if ((row.hash_prev ?? null) !== expectedPrev) {
      failures.push({ eventId: String(row.event_id), reason: 'hash_prev_mismatch' });
    }

    const recalculated = hashEpistemicEvent({
      eventId: String(row.event_id),
      eventName: String(row.event_name),
      logbookId: String(row.logbook_id),
      epistemicClass: row.epistemic_class as EpistemicClass,
      schemaVersion: String(row.schema_version),
      source: row.source,
      confidence: Number(row.confidence ?? 0),
      payload: row.payload,
      checksum: String(row.checksum),
      lineage: Array.isArray(row.lineage) ? row.lineage : [],
      uncertainty: typeof row.uncertainty === 'string' ? row.uncertainty : undefined,
      occurredAt: new Date(String(row.occurred_at)).toISOString(),
      hashPrev: row.hash_prev ?? null,
    });

    if (recalculated !== row.hash_self) {
      failures.push({ eventId: String(row.event_id), reason: 'hash_self_mismatch' });
    }

    previous = String(row.hash_self ?? genesisHash);
  }

  return {
    ok: failures.length === 0,
    data: {
      logbookId,
      checked: streamed.data.length,
      valid: failures.length === 0,
      failures,
    },
  } as const;
}

SFI_EOF_EVENTSTORE_9f2a1

echo "-> Sobrescribiendo src/lib/sfi/cognitive-runtime/runtime.ts (logbookId por ciclo)"
cat > src/lib/sfi/cognitive-runtime/runtime.ts <<'SFI_EOF_RUNTIME_9f2a1'
import 'server-only';

import { createHash, randomUUID } from 'crypto';
import { appendEpistemicEvent, streamRecentEpistemicEvents } from '@/lib/events/eventStore';
import { probeTable, type TableProbe } from './tableProbe';
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

  const logbookId = `cycle:${randomUUID()}`;

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
    logbookId,
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

  return { ok: true as const, taskGraph: { ...taskGraph, status: 'persisted' as const }, logbookId, event: result.data };
}

export async function readSfiCognitiveRuntime(): Promise<SfiCognitiveRuntimeSnapshot> {
  const [tableProbes, events] = await Promise.all([
    Promise.all(SFI_RUNTIME_SOURCE_TABLES.map(probeTable)),
    streamRecentEpistemicEvents(40),
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
      status: probes.get('field_cases')?.ok || probes.get('field_moph_runs')?.ok ? 'operational' : 'missing',
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

SFI_EOF_RUNTIME_9f2a1

if [ -d "node_modules" ]; then
  echo "-> Verificando boundaries"
  npm run check:boundaries
  echo "-> Verificando tipos"
  npm run typecheck
else
  echo "Aviso: no hay node_modules/ -- corre check:boundaries y typecheck manualmente."
fi

echo ""
echo "Listo. Cada ciclo cognitivo nace con su propio logbookId (cycle:<uuid>)."
echo "Para commitear:"
echo "  git add src/lib/events/eventStore.ts src/lib/sfi/cognitive-runtime/runtime.ts"
echo "  git commit -m \"feat(cognitive-runtime): ADR-007 -- per-cycle logbookId\""
