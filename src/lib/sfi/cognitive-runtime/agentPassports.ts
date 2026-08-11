import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readObservedSfiCognitiveRuntime } from './observedRuntime';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';
import { SFI_AGENT_EXECUTION_MAP } from './agentExecutionMap';
import { institutionalAssignmentsFor } from './institutionalAssignments';
import { SFI_AGENTIC_CAPABILITIES, type SfiAgenticCapabilityContract } from '@/lib/sfi/agenticCapabilityRegistry';

export type SfiAgentPassport = {
  passportVersion: 'SFI-AGENT-PASSPORT-1.2';
  id: string;
  name: string;
  namespace: 'cognitive_runtime' | 'agentic_runtime';
  purpose: string;
  domain: string;
  layer: string;
  authorityLevel: string;
  lifecycle: 'OPERATIONAL' | 'GATED' | 'DEGRADED' | 'MISSING';
  registryBound: boolean;
  executorBound: boolean;
  humanApprovalRequired: boolean;
  simulationAllowed: boolean;
  route: string | null;
  listensTo: string[];
  emits: string[];
  readsMemory: string[];
  writesMemory: string[];
  sourceTables: string[];
  observedTables: string[];
  missingTables: string[];
  reads: string[];
  writes: string[];
  executes: string[];
  executionEvidence: string[];
  latestExecutionAt: string | null;
  evidenceEventIds: string[];
  institutionalDuties: string[];
  warnings: string[];
};

type AgenticObservation = { lifecycle: SfiAgentPassport['lifecycle']; at: string | null; id: string | null; warning: string | null };

function iso(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : value;
}

function executionLifecycle(contract: SfiAgenticCapabilityContract, record: Record<string, unknown>) {
  const rule = contract.executionEvidence?.status;
  if (!rule) return { status: 'operational' as const, warning: null as string | null };
  const observed = typeof record[rule.column] === 'string' ? String(record[rule.column]).trim().toLowerCase() : '';
  if (rule.operationalValues.map((value) => value.toLowerCase()).includes(observed)) return { status: 'operational' as const, warning: null };
  if (rule.degradedValues.map((value) => value.toLowerCase()).includes(observed)) return { status: 'degraded' as const, warning: `Última ejecución persistida con estado ${observed || 'unknown'}.` };
  return { status: 'gated' as const, warning: `Estado de ejecución no reconocido como operativo: ${observed || 'missing'}.` };
}

async function observeAgentic(contract: SfiAgenticCapabilityContract): Promise<AgenticObservation> {
  if (!contract.executionEvidence) return { lifecycle: 'GATED', at: null, id: null, warning: 'Contrato disponible; todavía no existe un ledger específico reconciliado para demostrar ejecución.' };
  try {
    const db = createServiceSupabaseClient();
    let query = db.from(contract.executionEvidence.table).select('*').order(contract.executionEvidence.timeColumn, { ascending: false }).limit(1);
    if (contract.executionEvidence.filter) query = query.eq(contract.executionEvidence.filter.column, contract.executionEvidence.filter.value);
    const result = await query.maybeSingle();
    if (result.error) return { lifecycle: 'DEGRADED', at: null, id: null, warning: `${contract.executionEvidence.table}: ${result.error.message}` };
    if (!result.data) return { lifecycle: 'GATED', at: null, id: null, warning: 'No existe una ejecución persistida atribuible todavía.' };
    const record = result.data as Record<string, unknown>;
    const lifecycle = executionLifecycle(contract, record);
    return { lifecycle: lifecycle.status.toUpperCase() as AgenticObservation['lifecycle'], at: iso(record[contract.executionEvidence.timeColumn]), id: typeof record.id === 'string' ? record.id : null, warning: lifecycle.warning };
  } catch (error) {
    return { lifecycle: 'DEGRADED', at: null, id: null, warning: error instanceof Error ? error.message : 'agentic_execution_observation_failed' };
  }
}

export async function readAgentPassports() {
  const runtime = await readObservedSfiCognitiveRuntime();
  const byId = new Map(runtime.agents.map((agent) => [agent.id, agent]));
  const executionEvents = runtime.eventGraph.recentEvents.filter((event) => event.eventName === 'SFI_AGENT_EXECUTED');

  const cognitive: SfiAgentPassport[] = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((contract) => {
    const observed = byId.get(contract.id);
    const agentEvents = executionEvents.filter((event) => event.sourceId === contract.id);
    const latestExecutionAt = agentEvents.map((event) => event.occurredAt).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
    const executorBound = typeof SFI_AGENT_EXECUTION_MAP[contract.id] === 'function';
    return {
      passportVersion: 'SFI-AGENT-PASSPORT-1.2',
      id: contract.id,
      name: contract.name,
      namespace: 'cognitive_runtime',
      purpose: contract.purpose,
      domain: contract.domain,
      layer: contract.layer,
      authorityLevel: contract.authorityLevel,
      lifecycle: (observed?.status ?? 'missing').toUpperCase() as SfiAgentPassport['lifecycle'],
      registryBound: true,
      executorBound,
      humanApprovalRequired: contract.humanApprovalRequired,
      simulationAllowed: contract.simulationAllowed,
      route: contract.route,
      listensTo: observed?.listensTo ?? contract.listensTo.map(String),
      emits: observed?.emits ?? contract.emits.map(String),
      readsMemory: contract.readsMemory,
      writesMemory: contract.writesMemory,
      sourceTables: contract.sourceTables,
      observedTables: observed?.evidence.observedTables ?? [],
      missingTables: observed?.evidence.missingTables ?? contract.sourceTables,
      reads: contract.readsMemory,
      writes: contract.writesMemory,
      executes: executorBound ? [`SFI_AGENT_EXECUTION_MAP.${contract.id}`] : [],
      executionEvidence: agentEvents.map((event) => event.eventId).filter(Boolean),
      latestExecutionAt,
      evidenceEventIds: agentEvents.map((event) => event.eventId).filter(Boolean),
      institutionalDuties: institutionalAssignmentsFor(contract.id),
      warnings: observed?.evidence.warnings ?? ['Runtime observation unavailable.'],
    };
  });

  const agenticObserved = await Promise.all(SFI_AGENTIC_CAPABILITIES.map(async (contract) => ({ contract, observed: await observeAgentic(contract) })));
  const agentic: SfiAgentPassport[] = agenticObserved.map(({ contract, observed }) => ({
    passportVersion: 'SFI-AGENT-PASSPORT-1.2',
    id: contract.id,
    name: contract.name,
    namespace: 'agentic_runtime',
    purpose: contract.purpose,
    domain: 'agentic',
    layer: contract.layer,
    authorityLevel: contract.approvalRequired ? 'advisor_governed' : 'analyst',
    lifecycle: observed.lifecycle,
    registryBound: true,
    executorBound: true,
    humanApprovalRequired: contract.approvalRequired,
    simulationAllowed: false,
    route: contract.route,
    listensTo: [],
    emits: [],
    readsMemory: [],
    writesMemory: [],
    sourceTables: contract.reads,
    observedTables: observed.lifecycle === 'OPERATIONAL' ? contract.reads : [],
    missingTables: observed.lifecycle === 'DEGRADED' ? contract.reads : [],
    reads: contract.reads,
    writes: contract.writes,
    executes: contract.executes,
    executionEvidence: observed.id ? [`${contract.executionEvidence?.table ?? 'ledger'}:${observed.id}`] : [],
    latestExecutionAt: observed.at,
    evidenceEventIds: [],
    institutionalDuties: institutionalAssignmentsFor(contract.id),
    warnings: observed.warning ? [observed.warning] : [],
  }));

  const passports = [...cognitive, ...agentic].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return {
    generatedAt: runtime.generatedAt,
    runtimeStatus: runtime.status,
    counts: {
      total: passports.length,
      cognitive: cognitive.length,
      agentic: agentic.length,
      executorBound: passports.filter((item) => item.executorBound).length,
      assigned: passports.filter((item) => item.institutionalDuties.length > 0).length,
      operational: passports.filter((item) => item.lifecycle === 'OPERATIONAL').length,
      gated: passports.filter((item) => item.lifecycle === 'GATED').length,
      degraded: passports.filter((item) => item.lifecycle === 'DEGRADED').length,
      missing: passports.filter((item) => item.lifecycle === 'MISSING').length,
    },
    passports,
  };
}
