import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { SFI_AGENT_EXECUTION_MAP } from '@/lib/sfi/cognitive-runtime/agentExecutionMap';
import { COGNITIVE_TWIN_REENTRY } from '@/lib/cognitive-twin/reentry/runtime';
import { METHOD_LAB_CONTRACT_VERSION, type MethodLabProtocolId, type MethodLabProtocolStatus } from './contracts';
import { METHOD_LAB_PROTOCOLS } from './registry';

type Row = Record<string, unknown>;
type DependencyState = { table: string; available: boolean; error: string | null };

const IMPLEMENTATION_GATES: Record<MethodLabProtocolId, () => boolean> = {
  chronos_olympics: () => true,
  cognitive_relational_lab: () => true,
  ct_reentry: () => Boolean(COGNITIVE_TWIN_REENTRY.subjectId && COGNITIVE_TWIN_REENTRY.lineageId),
  sociotechnical_simulation: () => typeof SFI_AGENT_EXECUTION_MAP.social_field_simulator === 'function' && typeof SFI_AGENT_EXECUTION_MAP.friction_field_simulator === 'function',
  economic_simulation: () => typeof SFI_AGENT_EXECUTION_MAP.economic_field_simulator === 'function',
};

const PROTOCOL_DEPENDENCIES: Record<MethodLabProtocolId, string[]> = {
  chronos_olympics: [],
  cognitive_relational_lab: ['sfi_cognitive_lab_sessions', 'sfi_cognitive_lab_events', 'sfi_cognitive_lab_analyses'],
  ct_reentry: ['sfi_cognitive_twin_memory', 'sfi_cognitive_twin_decisions', 'sfi_cognitive_twin_model_registry', 'sfi_cognitive_twin_evaluations', 'sfi_cognitive_twin_runs'],
  sociotechnical_simulation: ['root_evidence_entries', 'epistemic_events', 'field_cases', 'sfi_graph_nodes'],
  economic_simulation: ['root_evidence_entries', 'epistemic_events', 'field_cases', 'world_source_observations'],
};

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

async function probeDependencies() {
  const db = createServiceSupabaseClient();
  const tables = [...new Set(Object.values(PROTOCOL_DEPENDENCIES).flat())];
  const results = await Promise.all(tables.map(async (table): Promise<DependencyState> => {
    const probe = await db.from(table).select('*', { count: 'exact', head: true });
    return { table, available: !probe.error, error: probe.error?.message ?? null };
  }));
  return new Map(results.map((item) => [item.table, item]));
}

export async function readMethodLabState() {
  const db = createServiceSupabaseClient();
  const [analyses, dependencyState] = await Promise.all([
    db.from('sfi_lab_analyses')
      .select('id,mode,source,data_mode,limitations,raw_analysis,created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    probeDependencies(),
  ]);

  const tableWarning = analyses.error ? analyses.error.message : null;
  const rows = (analyses.data ?? []) as Row[];
  const protocols = METHOD_LAB_PROTOCOLS.map((definition) => {
    const relevant = rows.filter((item) => text(item.mode) === definition.id);
    const latest = relevant[0] ?? null;
    const raw = row(latest?.raw_analysis);
    const dependencies = PROTOCOL_DEPENDENCIES[definition.id].map((table) => dependencyState.get(table) ?? { table, available: false, error: 'dependency_not_probed' });
    const missingDependencies = dependencies.filter((item) => !item.available);
    const implemented = IMPLEMENTATION_GATES[definition.id]();
    const warnings = [
      ...(Array.isArray(latest?.limitations) ? latest.limitations.map(String) : []),
      ...missingDependencies.map((item) => `${item.table}:${item.error ?? 'unavailable'}`),
      ...(definition.id === 'ct_reentry' ? ['CT reentry is implemented as governed longitudinal provenance. GATED means no Method Lab evaluation row has yet validated it; it does not mean individuation is demonstrated.'] : []),
      ...(definition.id === 'cognitive_relational_lab' ? ['CRL protocol-specific migration remains experimental; applying it to production requires an attributable ROOT/ACP governance decision because older implementation policy prohibited new tables.'] : []),
      ...(tableWarning ? [`sfi_lab_analyses:${tableWarning}`] : []),
    ];
    let status: MethodLabProtocolStatus;
    if (tableWarning) status = 'DEGRADED';
    else if (!implemented) status = 'REGISTERED';
    else if (missingDependencies.length) status = 'DEGRADED';
    else if (latest) status = 'OPERATIONAL';
    else status = 'GATED';
    return {
      ...definition,
      status,
      runCount: relevant.length,
      lastRunAt: text(latest?.created_at) || null,
      lastRunId: text(latest?.id) || null,
      lastValidationLevel: text(raw.validationLevel) || null,
      lastResultHash: text(raw.resultHash) || null,
      dependencies,
      missingDependencies: missingDependencies.map((item) => item.table),
      warnings,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    contractVersion: METHOD_LAB_CONTRACT_VERSION,
    status: tableWarning || protocols.some((item) => item.status === 'DEGRADED')
      ? 'DEGRADED'
      : protocols.some((item) => item.status === 'OPERATIONAL')
        ? 'OPERATIONAL'
        : 'GATED',
    sharedPersistence: 'sfi_lab_analyses',
    epistemicRule: 'Every laboratory output remains SIMULATED until a later observed return supports a stronger validation state.',
    promotionRule: 'No protocol can mutate canonical state or promote its own result; ROOT/ACP evaluates promotion requests.',
    protocols,
    warnings: [
      ...(tableWarning ? [`sfi_lab_analyses:${tableWarning}`] : []),
      ...protocols.flatMap((item) => item.missingDependencies.map((table) => `${item.id}:${table}`)),
    ],
  };
}

export type MethodLabState = Awaited<ReturnType<typeof readMethodLabState>>;
