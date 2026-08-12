import 'server-only';

import { getLlmProviderStatus } from '@/lib/ai/providerRouter';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { SFI_COGNITIVE_TWIN_CONTRACT } from './contract';
import { readCognitiveTwinSfiIntegration } from './institutionalIntegration';

const TABLES = [
  'sfi_cognitive_twin_memory',
  'sfi_cognitive_twin_decisions',
  'sfi_cognitive_twin_model_registry',
  'sfi_cognitive_twin_evaluations',
  'sfi_cognitive_twin_runs',
] as const;

type Row = Record<string, unknown>;

export type CognitiveTwinState = Awaited<ReturnType<typeof readCognitiveTwinState>>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function providerExecutionSucceeded(value: unknown) {
  const row = record(value);
  const provider = typeof row.provider === 'string' ? row.provider : '';
  const status = typeof row.status === 'string' ? row.status : '';
  const envelope = record(row.output_envelope);
  const result = record(envelope.result);
  if (result.providerExecutionSucceeded === false) return false;
  return Boolean(provider && provider !== 'degraded' && status !== 'BLOCKED' && status !== 'REJECTED');
}

export async function readCognitiveTwinState() {
  const db = createServiceSupabaseClient();
  const [tableResults, integration] = await Promise.all([
    Promise.all(TABLES.map(async (table) => {
      const result = await db.from(table).select('*', { count: 'exact', head: true });
      return {
        table,
        available: !result.error,
        count: result.error ? null : result.count ?? 0,
        error: result.error?.message ?? null,
      };
    })),
    readCognitiveTwinSfiIntegration(),
  ]);

  const tableMap = new Map(tableResults.map((item) => [item.table, item]));
  const databaseReady = tableResults.every((item) => item.available);

  const [recentMemory, recentDecisions, recentRuns, recentEvaluations] = databaseReady
    ? await Promise.all([
        db.from('sfi_cognitive_twin_memory').select('*').order('updated_at', { ascending: false }).limit(24),
        db.from('sfi_cognitive_twin_decisions').select('*').order('created_at', { ascending: false }).limit(12),
        db.from('sfi_cognitive_twin_runs').select('*').order('created_at', { ascending: false }).limit(24),
        db.from('sfi_cognitive_twin_evaluations').select('*').order('executed_at', { ascending: false }).limit(20),
      ])
    : [null, null, null, null];

  const providers = getLlmProviderStatus();
  const configuredProviders = providers.filter((item) => item.available);
  const registeredModelCount = tableMap.get('sfi_cognitive_twin_model_registry')?.count ?? 0;
  const [approvedDecisionCountResult, approvedModelCountResult] = databaseReady
    ? await Promise.all([
        db.from('sfi_cognitive_twin_decisions').select('*', { count: 'exact', head: true }).eq('status', 'APPROVED'),
        db.from('sfi_cognitive_twin_model_registry').select('*', { count: 'exact', head: true }).in('status', ['APPROVED', 'APPROVED_WITH_LIMITS']),
      ])
    : [null, null];
  const approvedDecisionCount = approvedDecisionCountResult?.count ?? 0;
  const approvedModelCount = approvedModelCountResult?.count ?? 0;
  const providerExecutionObserved = (recentRuns?.data ?? []).some(providerExecutionSucceeded);
  const providerConfigured = configuredProviders.length > 0;
  const providerRouterReady = providerConfigured && providerExecutionObserved;

  return {
    generatedAt: new Date().toISOString(),
    contract: SFI_COGNITIVE_TWIN_CONTRACT,
    integration,
    implementation: {
      contractImplemented: true,
      databaseReady,
      providerConfigured,
      providerExecutionObserved,
      providerRouterReady,
      approvedDecisionCorpusReady: approvedDecisionCount > 0,
      modelEvaluationRegistryReady: approvedModelCount > 0,
      sfiOrgansConnected: integration.summary.fullyConnected,
      sfiOrgansExercised: integration.summary.fullyExercised,
      institutionalAutonomyProven: false,
    },
    providers,
    storage: tableResults,
    counts: {
      memory: tableMap.get('sfi_cognitive_twin_memory')?.count ?? null,
      decisions: tableMap.get('sfi_cognitive_twin_decisions')?.count ?? null,
      approvedDecisions: approvedDecisionCount,
      models: registeredModelCount,
      approvedModels: approvedModelCount,
      evaluations: tableMap.get('sfi_cognitive_twin_evaluations')?.count ?? null,
      runs: tableMap.get('sfi_cognitive_twin_runs')?.count ?? null,
    },
    recentMemory: recentMemory?.data ?? [],
    recentDecisions: recentDecisions?.data ?? [],
    recentRuns: recentRuns?.data ?? [],
    recentEvaluations: recentEvaluations?.data ?? [],
    errors: [
      ...tableResults.filter((item) => item.error).map((item) => `${item.table}: ${item.error}`),
      ...integration.organs.filter((item)=>item.error).map((item)=>`${item.organ}: ${item.error}`),
      ...(recentMemory?.error ? [`memory: ${recentMemory.error.message}`] : []),
      ...(recentDecisions?.error ? [`decisions: ${recentDecisions.error.message}`] : []),
      ...(recentRuns?.error ? [`runs: ${recentRuns.error.message}`] : []),
      ...(recentEvaluations?.error ? [`evaluations: ${recentEvaluations.error.message}`] : []),
      ...(approvedDecisionCountResult?.error ? [`approved decisions: ${approvedDecisionCountResult.error.message}`] : []),
      ...(approvedModelCountResult?.error ? [`approved models: ${approvedModelCountResult.error.message}`] : []),
    ],
  };
}
