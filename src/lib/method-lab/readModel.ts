import 'server-only';

import { getLlmProviderStatus } from '@/lib/ai/providerRouter';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { SFI_AGENT_EXECUTION_MAP } from '@/lib/sfi/cognitive-runtime/agentExecutionMap';
import { COGNITIVE_TWIN_REENTRY } from '@/core/cognitive-twin/reentry/runtime';
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
  ct_reentry: ['sfi_amv_memory', 'sfi_cognitive_twin_decisions', 'sfi_cognitive_twin_model_registry', 'sfi_cognitive_twin_evaluations', 'sfi_cognitive_twin_runs'],
  sociotechnical_simulation: ['root_evidence_entries', 'epistemic_events', 'field_cases', 'sfi_graph_nodes'],
  economic_simulation: ['root_evidence_entries', 'epistemic_events', 'field_cases', 'world_source_observations'],
};

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
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

function summarizeDecisionTransfer(item: Row) {
  const observed = row(item.observed_result);
  const evaluation = row(observed.evaluation ?? item.observed_result);
  const holdout = row(evaluation.holdout);
  const counterfactual = row(evaluation.counterfactual);
  const promotion = row(evaluation.promotion);
  const testKey = text(item.test_key);
  return {
    id: text(item.id),
    provider: text(item.provider, 'UNKNOWN'),
    model: text(item.model, 'UNKNOWN'),
    operationKey: text(observed.operationKey) || (testKey.startsWith('decision_transfer:') ? testKey.slice('decision_transfer:'.length) : testKey),
    testVersion: text(item.test_version),
    outcome: text(item.outcome, 'NOT_RUN'),
    executedAt: text(item.executed_at) || null,
    executor: text(item.executor) || null,
    evidenceRefs: strings(item.evidence_refs),
    decisionAccuracy: numeric(holdout.validatedDecisionAccuracy ?? holdout.decisionAccuracy),
    structuralFidelity: numeric(holdout.validatedMeanStructuralFidelity ?? holdout.meanStructuralFidelity),
    operationSimilarity: numeric(holdout.meanOperationJaccard),
    variableSimilarity: numeric(holdout.meanVariableJaccard),
    counterfactualAccuracy: numeric(counterfactual.validatedTargetDispositionAccuracy ?? counterfactual.targetDispositionAccuracy),
    validatedTraceCount: numeric(holdout.validatedTraceCount),
    validatedBoundarySwitchCount: numeric(counterfactual.validatedExpectedSwitchCount),
    maturity: text(promotion.maturity) || null,
    qualifyingSupportCount: numeric(promotion.qualifyingSupportCount),
    counterexampleCount: numeric(promotion.qualifyingCounterexampleCount),
    qualifyingDomains: strings(promotion.qualifyingDomains),
    mayAutoPromoteToRule: promotion.mayAutoPromoteToRule === true,
  };
}

export async function readMethodLabState() {
  const db = createServiceSupabaseClient();
  const [analyses, decisionTransferEvaluations, dependencyState] = await Promise.all([
    db.from('sfi_lab_analyses')
      .select('id,mode,source,data_mode,limitations,raw_analysis,created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    db.from('sfi_cognitive_twin_evaluations')
      .select('id,provider,model,test_key,test_version,outcome,observed_result,evidence_refs,executed_at,executor')
      .like('test_key', 'decision_transfer:%')
      .order('executed_at', { ascending: false })
      .limit(100),
    probeDependencies(),
  ]);

  const tableWarning = analyses.error ? analyses.error.message : null;
  const decisionTransferWarning = decisionTransferEvaluations.error ? decisionTransferEvaluations.error.message : null;
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
      ...(definition.id === 'ct_reentry' ? ['CT reentry is implemented as governed longitudinal provenance. GATED means no Method Lab evaluation row has yet validated it; it does not mean individuation is demonstrated. Decision Transfer PASS remains a DERIVED measurement and does not imply subjective experience or automatic rule promotion.'] : []),
      ...(definition.id === 'cognitive_relational_lab' ? ['CRL protocol-specific migration remains experimental; persisted session state is not canonical memory or proof of individuation.'] : []),
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
      lastValidationLevel: text(raw.validationLevel) || text(raw.epistemicClass) || null,
      lastResultHash: text(raw.resultHash) || text(raw.inputHash) || null,
      dependencies,
      missingDependencies: missingDependencies.map((item) => item.table),
      warnings,
    };
  });

  const decisionTransferRows = ((decisionTransferEvaluations.data ?? []) as Row[]).map(summarizeDecisionTransfer);
  const decisionTransfer = {
    status: decisionTransferWarning ? 'DEGRADED' as const : decisionTransferRows.length ? 'OBSERVED' as const : 'GATED' as const,
    totalEvaluations: decisionTransferRows.length,
    passCount: decisionTransferRows.filter((item) => item.outcome === 'PASS').length,
    failCount: decisionTransferRows.filter((item) => item.outcome === 'FAIL').length,
    blockedCount: decisionTransferRows.filter((item) => item.outcome === 'BLOCKED').length,
    latest: decisionTransferRows[0] ?? null,
    recent: decisionTransferRows.slice(0, 12),
    warning: decisionTransferWarning,
    validationRule: 'Only OBSERVED / VERIFIED_CONTRAST traces and observed/verified decision-boundary switches can satisfy validation gates. SIMULATED / DERIVED results remain diagnostic.',
    authorityRule: 'PASS is an evaluation outcome, not a RULE, canon mutation, memory promotion or authority grant.',
  };

  const llmProviders = getLlmProviderStatus();

  return {
    generatedAt: new Date().toISOString(),
    contractVersion: METHOD_LAB_CONTRACT_VERSION,
    status: tableWarning || decisionTransferWarning || protocols.some((item) => item.status === 'DEGRADED')
      ? 'DEGRADED'
      : protocols.some((item) => item.status === 'OPERATIONAL')
        ? 'OPERATIONAL'
        : 'GATED',
    sharedPersistence: 'sfi_lab_analyses + governed protocol stores',
    epistemicRule: 'Every laboratory output preserves its epistemic class. Simulation may exercise an instrument but cannot validate its own claim.',
    promotionRule: 'No protocol can mutate canonical state or promote its own result; ROOT/ACP evaluates promotion requests.',
    llmProviders,
    protocols,
    decisionTransfer,
    warnings: [
      ...(tableWarning ? [`sfi_lab_analyses:${tableWarning}`] : []),
      ...(decisionTransferWarning ? [`sfi_cognitive_twin_evaluations:${decisionTransferWarning}`] : []),
      ...protocols.flatMap((item) => item.missingDependencies.map((table) => `${item.id}:${table}`)),
    ],
  };
}

export type MethodLabState = Awaited<ReturnType<typeof readMethodLabState>>;
