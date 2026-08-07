import 'server-only';

import { getLlmProviderStatus } from '@/lib/ai/providerRouter';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { SFI_COGNITIVE_TWIN_CONTRACT } from './contract';

const TABLES = [
  'sfi_cognitive_twin_memory',
  'sfi_cognitive_twin_decisions',
  'sfi_cognitive_twin_model_registry',
  'sfi_cognitive_twin_evaluations',
  'sfi_cognitive_twin_runs',
] as const;

export type CognitiveTwinState = Awaited<ReturnType<typeof readCognitiveTwinState>>;

export async function readCognitiveTwinState() {
  const db = createServiceSupabaseClient();
  const tableResults = await Promise.all(TABLES.map(async (table) => {
    const result = await db.from(table).select('*', { count: 'exact', head: true });
    return {
      table,
      available: !result.error,
      count: result.error ? null : result.count ?? 0,
      error: result.error?.message ?? null,
    };
  }));

  const tableMap = new Map(tableResults.map((item) => [item.table, item]));
  const databaseReady = tableResults.every((item) => item.available);

  const [recentDecisions, recentRuns, recentEvaluations] = databaseReady
    ? await Promise.all([
        db.from('sfi_cognitive_twin_decisions').select('*').order('created_at', { ascending: false }).limit(12),
        db.from('sfi_cognitive_twin_runs').select('*').order('created_at', { ascending: false }).limit(12),
        db.from('sfi_cognitive_twin_evaluations').select('*').order('executed_at', { ascending: false }).limit(20),
      ])
    : [null, null, null];

  const providers = getLlmProviderStatus();
  const configuredProviders = providers.filter((item) => item.available);
  const approvedModelCount = tableMap.get('sfi_cognitive_twin_model_registry')?.count ?? 0;
  const approvedDecisionCount = databaseReady
    ? await db.from('sfi_cognitive_twin_decisions').select('*', { count: 'exact', head: true }).eq('status', 'APPROVED').then((result) => result.count ?? 0)
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    contract: SFI_COGNITIVE_TWIN_CONTRACT,
    implementation: {
      contractImplemented: true,
      databaseReady,
      providerRouterReady: configuredProviders.length > 0,
      approvedDecisionCorpusReady: approvedDecisionCount > 0,
      modelEvaluationRegistryReady: Number(approvedModelCount) > 0,
      institutionalAutonomyProven: false,
    },
    providers,
    storage: tableResults,
    counts: {
      memory: tableMap.get('sfi_cognitive_twin_memory')?.count ?? null,
      decisions: tableMap.get('sfi_cognitive_twin_decisions')?.count ?? null,
      approvedDecisions: approvedDecisionCount,
      models: approvedModelCount,
      evaluations: tableMap.get('sfi_cognitive_twin_evaluations')?.count ?? null,
      runs: tableMap.get('sfi_cognitive_twin_runs')?.count ?? null,
    },
    recentDecisions: recentDecisions?.data ?? [],
    recentRuns: recentRuns?.data ?? [],
    recentEvaluations: recentEvaluations?.data ?? [],
    errors: [
      ...tableResults.filter((item) => item.error).map((item) => `${item.table}: ${item.error}`),
      ...(recentDecisions?.error ? [`decisions: ${recentDecisions.error.message}`] : []),
      ...(recentRuns?.error ? [`runs: ${recentRuns.error.message}`] : []),
      ...(recentEvaluations?.error ? [`evaluations: ${recentEvaluations.error.message}`] : []),
    ],
  };
}
