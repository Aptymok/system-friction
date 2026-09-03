import 'server-only';

import { getLlmProviderStatus } from '@/lib/ai/providerRouter';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { SFI_COGNITIVE_TWIN_CONTRACT } from './contract';
import { readCanonicalCognitiveTwinMemory } from './canonicalMemoryView';
import { readCognitiveTwinSfiIntegration } from './institutionalIntegration';

const REQUIRED_TABLES = [
  'sfi_amv_memory',
  'sfi_cognitive_twin_decisions',
  'sfi_cognitive_twin_model_registry',
  'sfi_cognitive_twin_evaluations',
  'sfi_cognitive_twin_runs',
] as const;
const STATE_TTL_MS = Math.max(2_000, Number(process.env.SFI_CT_STATE_TTL_MS ?? 15_000));

type Row = Record<string, unknown>;
type StateResult = Awaited<ReturnType<typeof buildCognitiveTwinState>>;
let stateCache: { expiresAt:number; value:StateResult } | null = null;
let stateInFlight: Promise<StateResult> | null = null;

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

async function buildCognitiveTwinState() {
  const db = createServiceSupabaseClient();
  const [canonicalMemory, integration, recentDecisions, recentRuns, recentEvaluations, approvedDecisionProbe, approvedModelProbe] = await Promise.all([
    readCanonicalCognitiveTwinMemory(24),
    readCognitiveTwinSfiIntegration(),
    db.from('sfi_cognitive_twin_decisions').select('*').order('created_at', { ascending: false }).limit(12),
    db.from('sfi_cognitive_twin_runs').select('*').order('created_at', { ascending: false }).limit(24),
    db.from('sfi_cognitive_twin_evaluations').select('*').order('executed_at', { ascending: false }).limit(20),
    db.from('sfi_cognitive_twin_decisions').select('id').eq('status', 'APPROVED').limit(1),
    db.from('sfi_cognitive_twin_model_registry').select('id,status').in('status', ['APPROVED', 'APPROVED_WITH_LIMITS']).limit(1),
  ]);

  const storage = [
    { table:'sfi_amv_memory', available:!canonicalMemory.error, count:null, error:canonicalMemory.error ?? null },
    { table:'sfi_cognitive_twin_decisions', available:!recentDecisions.error, count:null, error:recentDecisions.error?.message ?? null },
    { table:'sfi_cognitive_twin_model_registry', available:!approvedModelProbe.error, count:null, error:approvedModelProbe.error?.message ?? null },
    { table:'sfi_cognitive_twin_evaluations', available:!recentEvaluations.error, count:null, error:recentEvaluations.error?.message ?? null },
    { table:'sfi_cognitive_twin_runs', available:!recentRuns.error, count:null, error:recentRuns.error?.message ?? null },
  ];
  const databaseReady = storage.every((item) => item.available) && !approvedDecisionProbe.error;

  const providers = getLlmProviderStatus();
  const configuredProviders = providers.filter((item) => item.configured);
  const healthyProviders = providers.filter((item) => item.state === 'HEALTHY');
  const approvedDecisionCorpusReady = (approvedDecisionProbe.data?.length ?? 0) > 0;
  const approvedModelRegistryReady = (approvedModelProbe.data?.length ?? 0) > 0;
  const providerExecutionObserved = (recentRuns.data ?? []).some(providerExecutionSucceeded);
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
      configuredProviderCount: configuredProviders.length,
      healthyProviderCountInCurrentProcess: healthyProviders.length,
      providerExecutionObserved,
      providerRouterReady,
      approvedDecisionCorpusReady,
      modelEvaluationRegistryReady: approvedModelRegistryReady,
      sfiOrgansConnected: integration.summary.fullyConnected,
      sfiOrgansExercised: integration.summary.fullyExercised,
      institutionalAutonomyProven: false,
    },
    providers,
    storage,
    counts: {
      memory: canonicalMemory.eventCount,
      decisions: null,
      approvedDecisions: approvedDecisionCorpusReady ? 1 : 0,
      models: null,
      approvedModels: approvedModelRegistryReady ? 1 : 0,
      evaluations: null,
      runs: null,
      countSemantics: 'Totals are intentionally not COUNT(*)-probed on interactive reads. 1/0 approval values mean existence/non-existence in a bounded probe, not total cardinality.',
    },
    recentMemory: canonicalMemory.rows.slice(0, 24),
    recentDecisions: recentDecisions.data ?? [],
    recentRuns: recentRuns.data ?? [],
    recentEvaluations: recentEvaluations.data ?? [],
    errors: [
      ...storage.filter((item) => item.error).map((item) => `${item.table}: ${item.error}`),
      ...(approvedDecisionProbe.error ? [`approved decisions: ${approvedDecisionProbe.error.message}`] : []),
      ...integration.organs.filter((item)=>item.error).map((item)=>`${item.organ}: ${item.error}`),
    ],
  };
}

export async function readCognitiveTwinState() {
  const now = Date.now();
  if (stateCache && stateCache.expiresAt > now) return stateCache.value;
  if (stateInFlight) return stateInFlight;
  stateInFlight = buildCognitiveTwinState()
    .then((value) => {
      stateCache = { value, expiresAt:Date.now() + STATE_TTL_MS };
      return value;
    })
    .finally(() => { stateInFlight = null; });
  return stateInFlight;
}
