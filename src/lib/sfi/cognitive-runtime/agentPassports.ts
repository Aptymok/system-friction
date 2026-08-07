import 'server-only';

import { readObservedSfiCognitiveRuntime } from './observedRuntime';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';
import { SFI_AGENT_EXECUTION_MAP } from './agentExecutionMap';
import { institutionalAssignmentsFor } from './institutionalAssignments';

export type SfiAgentPassport = {
  passportVersion: 'SFI-AGENT-PASSPORT-1.1';
  id: string;
  name: string;
  namespace: 'cognitive_runtime';
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
  latestExecutionAt: string | null;
  evidenceEventIds: string[];
  institutionalDuties: string[];
  warnings: string[];
};

export async function readAgentPassports() {
  const runtime = await readObservedSfiCognitiveRuntime();
  const byId = new Map(runtime.agents.map((agent) => [agent.id, agent]));
  const executionEvents = runtime.eventGraph.recentEvents.filter((event) => event.eventName === 'SFI_AGENT_EXECUTED');

  const passports: SfiAgentPassport[] = SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((contract) => {
    const observed = byId.get(contract.id);
    const agentEvents = executionEvents.filter((event) => event.sourceId === contract.id);
    const latestExecutionAt = agentEvents.map((event) => event.occurredAt).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
    return {
      passportVersion: 'SFI-AGENT-PASSPORT-1.1',
      id: contract.id,
      name: contract.name,
      namespace: 'cognitive_runtime',
      purpose: contract.purpose,
      domain: contract.domain,
      layer: contract.layer,
      authorityLevel: contract.authorityLevel,
      lifecycle: (observed?.status ?? 'missing').toUpperCase() as SfiAgentPassport['lifecycle'],
      registryBound: true,
      executorBound: typeof SFI_AGENT_EXECUTION_MAP[contract.id] === 'function',
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
      latestExecutionAt,
      evidenceEventIds: agentEvents.map((event) => event.eventId).filter(Boolean),
      institutionalDuties: institutionalAssignmentsFor(contract.id),
      warnings: observed?.evidence.warnings ?? ['Runtime observation unavailable.'],
    };
  });

  return {
    generatedAt: runtime.generatedAt,
    runtimeStatus: runtime.status,
    counts: {
      total: passports.length,
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
