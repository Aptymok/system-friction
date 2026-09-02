import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readObservedSfiCognitiveRuntime } from '@/lib/sfi/cognitive-runtime/observedRuntime';
import { readExecutionRecords, type SfiExecutionRecord } from '@/lib/sfi/cognitive-runtime/executionRecords';
import { SFI_AGENTIC_CAPABILITIES, type SfiAgenticCapabilityContract } from '@/lib/sfi/agenticCapabilityRegistry';
import type { RootAgent, RootDataStatus } from '../rootSovereignState';
import { source } from './readerSupport';

function rootStatus(status: string): RootDataStatus {
  if (status === 'operational') return 'observed';
  if (status === 'degraded') return 'degraded';
  if (status === 'missing') return 'missing';
  return 'gated';
}

function iso(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : value;
}

function executionLifecycle(contract: SfiAgenticCapabilityContract, record: Record<string, unknown>) {
  const rule = contract.executionEvidence?.status;
  if (!rule) return { status: 'operational' as const, warning: null as string | null };
  const observed = typeof record[rule.column] === 'string' ? String(record[rule.column]).trim().toLowerCase() : '';
  if (rule.operationalValues.map((value) => value.toLowerCase()).includes(observed)) return { status: 'operational' as const, warning: null };
  if (rule.degradedValues.map((value) => value.toLowerCase()).includes(observed)) return { status: 'degraded' as const, warning: `Última ejecución persistida con estado ${observed || 'unknown'}.` };
  return { status: 'gated' as const, warning: `Estado de ejecución no reconocido como operativo: ${observed || 'missing'}.` };
}

async function readAgenticExecution(contract: SfiAgenticCapabilityContract) {
  if (!contract.executionEvidence) return { status: 'gated' as const, at: null as string | null, id: null as string | null, warning: 'Ruta/contrato registrados; esta capacidad no tiene aún un ledger de ejecución específico reconciliado.' };
  try {
    const db = createServiceSupabaseClient();
    let query = db.from(contract.executionEvidence.table).select('*').order(contract.executionEvidence.timeColumn, { ascending: false }).limit(1);
    if (contract.executionEvidence.filter) query = query.eq(contract.executionEvidence.filter.column, contract.executionEvidence.filter.value);
    const result = await query.maybeSingle();
    if (result.error) return { status: 'degraded' as const, at: null, id: null, warning: `${contract.executionEvidence.table}: ${result.error.message}` };
    if (!result.data) return { status: 'gated' as const, at: null, id: null, warning: 'Contrato disponible; no existe ejecución persistida atribuible todavía.' };
    const record = result.data as Record<string, unknown>;
    const lifecycle = executionLifecycle(contract, record);
    return { status: lifecycle.status, at: iso(record[contract.executionEvidence.timeColumn]), id: typeof record.id === 'string' ? record.id : null, warning: lifecycle.warning };
  } catch (error) {
    return { status: 'degraded' as const, at: null, id: null, warning: error instanceof Error ? error.message : 'agentic_execution_read_failed' };
  }
}

function isStructuralWarning(value: string) {
  const lower = value.toLowerCase();
  return !lower.includes('sin ejecución') && !lower.includes('no tiene aún un ledger') && !lower.includes('no existe ejecución') && !lower.includes('todavía no existe');
}

function latestByAgent(records: SfiExecutionRecord[]) {
  const result = new Map<string, SfiExecutionRecord>();
  const sorted = [...records].sort((a, b) => (b.occurredAt ?? '').localeCompare(a.occurredAt ?? ''));
  for (const execution of sorted) if (!result.has(execution.agentId)) result.set(execution.agentId, execution);
  return result;
}

export async function readRootAgents() {
  const [runtime, executionRead] = await Promise.all([
    readObservedSfiCognitiveRuntime(),
    readExecutionRecords({ limit: 500 }),
  ]);
  const latestExecutions = latestByAgent(executionRead.records);

  const agents: RootAgent[] = runtime.agents.map((entry) => {
    const latest = latestExecutions.get(entry.id) ?? null;
    const runtimeWarning = entry.evidence.warnings.length ? entry.evidence.warnings.join(' | ') : null;
    const coverageWarning = latest?.contextCoverage.partial === true
      ? `Última ejecución con cobertura parcial: ${latest.contextCoverage.evidenceDelivered ?? 'N/O'}/${latest.contextCoverage.evidenceAvailable ?? 'N/O'} evidencias entregadas al LLM.`
      : null;
    const warning = [runtimeWarning, coverageWarning].filter(Boolean).join(' | ') || null;
    return {
      id: entry.id,
      role: entry.name,
      state: {
        value: entry.status === 'operational' ? 'ejecución observada' : entry.status === 'gated' ? 'registrado · sin ejecución reciente' : entry.status,
        status: rootStatus(entry.status),
        source: 'Cognitive Runtime observado + execution record sobre epistemic_events',
        observedAt: latest?.occurredAt ?? runtime.generatedAt,
        confidence: latest?.interpretation.confidence ?? null,
        evidenceIds: latest?.eventId ? [latest.eventId] : [],
        explanation: `${entry.purpose} · LEE: ${entry.readsMemory.map((item) => item.memory).join(', ') || 'ninguna fuente declarada'} · ESCRIBE: ${entry.writesMemory.map((item) => item.memory).join(', ') || 'ningún writer declarado'}`,
        warning,
      },
      provider: latest?.telemetry.provider.value ?? null,
      model: latest?.telemetry.model.value ?? null,
      lastRun: latest?.occurredAt ?? null,
      // Never substitute the agent purpose for an observed execution result.
      lastResult: latest?.interpretation.summary ?? null,
      availability: entry.status,
      error: warning,
    };
  });

  const agenticExecutions = await Promise.all(SFI_AGENTIC_CAPABILITIES.map(async (entry) => ({ entry, observed: await readAgenticExecution(entry) })));
  for (const { entry, observed } of agenticExecutions) {
    if (agents.some((item) => item.id === entry.id)) continue;
    agents.push({
      id: entry.id,
      role: entry.name,
      state: {
        value: observed.status === 'operational' ? 'ejecución persistida observada' : observed.status === 'degraded' ? 'ejecución persistida degradada' : 'contrato disponible · sin ejecución atribuible',
        status: rootStatus(observed.status),
        source: observed.id ? `${entry.executionEvidence?.table ?? 'execution ledger'}:${observed.id}` : 'Registro agentic + contrato de ejecución',
        observedAt: observed.at,
        confidence: null,
        evidenceIds: observed.id ? [observed.id] : [],
        explanation: `${entry.purpose} · LEE: ${entry.reads.join(', ')} · ESCRIBE: ${entry.writes.join(', ')} · EJECUTA: ${entry.executes.join(', ')}`,
        warning: observed.warning,
      },
      provider: entry.providerAware ? 'se registra durante la ejecución' : null,
      model: entry.providerAware ? 'se registra durante la ejecución' : null,
      lastRun: observed.at,
      lastResult: null,
      availability: observed.status,
      error: observed.warning,
    });
  }

  agents.sort((a, b) => a.role.localeCompare(b.role, 'es'));
  const warnings = [
    ...runtime.eventGraph.warnings,
    ...agenticExecutions.map((item) => item.observed.warning).filter((value): value is string => Boolean(value && isStructuralWarning(value))),
  ];
  return source(
    { agents },
    'Cognitive Runtime observado + execution records + capacidades agentic',
    warnings,
    runtime.generatedAt,
    runtime.status === 'missing',
  );
}
