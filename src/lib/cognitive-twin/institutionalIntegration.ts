import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { syncRecentInstitutionalEvidenceToCognitiveTwin } from './evidenceIngestion';

type Row = Record<string, unknown>;

type SyncResult = {
  source: string;
  ok: boolean;
  observed: number;
  synced: number;
  failed: number;
  warning: string | null;
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function number(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function upsertCandidate(input: {
  key: string;
  type: 'EVIDENCE' | 'STATE' | 'METHOD' | 'ERROR' | 'EXCEPTION';
  sourceKind: string;
  sourceRef: string;
  content: Row;
  evidenceRefs?: string[];
  version?: string;
}) {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_twin_memory').upsert({
    memory_key: input.key,
    memory_type: input.type,
    status: 'CANDIDATE',
    content: input.content,
    evidence_refs: [...new Set(input.evidenceRefs ?? [])],
    source_kind: input.sourceKind,
    source_ref: input.sourceRef,
    version: input.version ?? 'sfi-integration-v1',
    created_by: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'memory_key,version' }).select('id').single();
  if (result.error) throw new Error(result.error.message);
}

async function syncFieldReturns(limit = 100): Promise<SyncResult> {
  const db = createServiceSupabaseClient();
  const result = await db.from('field_outcomes')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(limit);
  if (result.error) return { source:'field', ok:false, observed:0, synced:0, failed:0, warning:result.error.message };

  const rows = (result.data ?? []) as Row[];
  let synced = 0;
  let failed = 0;
  for (const row of rows) {
    const id = text(row.id);
    if (!id) { failed += 1; continue; }
    try {
      await upsertCandidate({
        key: `SFI:FIELD:RETURN:${id}`,
        type: 'STATE',
        sourceKind: 'field_outcomes',
        sourceRef: id,
        evidenceRefs: strings(row.evidence_ids),
        content: {
          epistemicClass: 'OBSERVED_RETURN',
          caseId: text(row.case_id),
          interventionId: text(row.intervention_id),
          expected: row.expected ?? null,
          actual: row.actual ?? null,
          delta: number(row.delta),
          verified: row.verified === true,
          learned: text(row.learned),
          recordedAt: text(row.recorded_at),
          rule: 'Field return is institutional experience. It may update Twin context as CANDIDATE memory but cannot mutate canon or establish general causality by itself.',
        },
      });
      synced += 1;
    } catch { failed += 1; }
  }
  return { source:'field', ok:failed===0, observed:rows.length, synced, failed, warning:failed ? `${failed}_field_returns_failed` : null };
}

async function syncMethodLabRuns(limit = 100): Promise<SyncResult> {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_lab_analyses').select('*').limit(limit);
  if (result.error) return { source:'method_lab', ok:false, observed:0, synced:0, failed:0, warning:result.error.message };

  const rows = (result.data ?? []) as Row[];
  let synced = 0;
  let failed = 0;
  for (const row of rows) {
    const id = text(row.id);
    if (!id) { failed += 1; continue; }
    const raw = record(row.raw_analysis);
    const dataMode = text(row.data_mode) ?? 'UNKNOWN';
    try {
      await upsertCandidate({
        key: `SFI:METHOD_LAB:RUN:${id}`,
        type: 'METHOD',
        sourceKind: 'sfi_lab_analyses',
        sourceRef: id,
        evidenceRefs: strings(raw.evidenceRefs ?? raw.evidence_refs),
        content: {
          epistemicClass: dataMode === 'SIMULATED' ? 'SIMULATED' : 'OBSERVED_RECORD',
          mode: text(row.mode),
          source: text(row.source),
          dataMode,
          systems: row.systems ?? [],
          variables: row.variables ?? [],
          limitations: row.limitations ?? [],
          recommendations: row.recommendations ?? [],
          resultHash: text(raw.resultHash),
          rule: 'Method Lab runs enter Twin memory with their original epistemic class. SIMULATED remains SIMULATED and cannot become observed evidence through ingestion.',
        },
      });
      synced += 1;
    } catch { failed += 1; }
  }
  return { source:'method_lab', ok:failed===0, observed:rows.length, synced, failed, warning:failed ? `${failed}_method_lab_runs_failed` : null };
}

async function syncObservatoryState(limit = 60): Promise<SyncResult> {
  const db = createServiceSupabaseClient();
  const result = await db.from('worldspect_snapshots')
    .select('id,observed_at,created_at,source_state,confidence,wsi,nti,ingest_mode,sources')
    .order('observed_at', { ascending: false })
    .limit(limit);
  if (result.error) return { source:'observatory', ok:false, observed:0, synced:0, failed:0, warning:result.error.message };

  const rows = (result.data ?? []) as Row[];
  let synced = 0;
  let failed = 0;
  for (const row of rows) {
    const id = text(row.id) ?? text(row.observed_at);
    if (!id) { failed += 1; continue; }
    const sources = Array.isArray(row.sources) ? row.sources.map(record) : [];
    const simulatedSources = sources.filter((source) => source.simulated === true).length;
    try {
      await upsertCandidate({
        key: `SFI:OBSERVATORY:WORLDSPECT:${id}`,
        type: 'STATE',
        sourceKind: 'worldspect_snapshots',
        sourceRef: id,
        content: {
          epistemicClass: simulatedSources === sources.length && sources.length ? 'SIMULATED' : 'DERIVED_FROM_OBSERVATIONS',
          observedAt: text(row.observed_at) ?? text(row.created_at),
          sourceState: text(row.source_state),
          confidence: number(row.confidence),
          wsi: number(row.wsi),
          nti: number(row.nti),
          ingestMode: text(row.ingest_mode),
          sourceCount: sources.length,
          simulatedSourceCount: simulatedSources,
          rule: 'Observatory state is longitudinal context for the Twin. Derived indices remain derived; simulated inputs remain explicitly marked.',
        },
      });
      synced += 1;
    } catch { failed += 1; }
  }
  return { source:'observatory', ok:failed===0, observed:rows.length, synced, failed, warning:failed ? `${failed}_observatory_snapshots_failed` : null };
}

async function probe(input: { organ:string; table:string; description:string; filter?: (query:any)=>any }) {
  const db = createServiceSupabaseClient();
  let query: any = db.from(input.table).select('*', { count:'exact', head:true });
  if (input.filter) query = input.filter(query);
  const result = await query;
  return {
    organ: input.organ,
    table: input.table,
    connected: !result.error,
    observedRecords: result.error ? null : result.count ?? 0,
    description: input.description,
    error: result.error?.message ?? null,
  };
}

export async function readCognitiveTwinSfiIntegration() {
  const organs = await Promise.all([
    probe({ organ:'ROOT_EVIDENCE', table:'root_evidence_entries', description:'Institutional evidence enters Twin memory as candidate evidence.' }),
    probe({ organ:'OBSERVATORY', table:'worldspect_snapshots', description:'Longitudinal world state enters Twin context without promoting derived/simulated state.' }),
    probe({ organ:'STUDIO', table:'sfi_cognitive_twin_runs', description:'Studio consumes Twin memory/decisions and registers cognitive executions.', filter:(query)=>query.ilike('role','studio%') }),
    probe({ organ:'METHOD_LAB', table:'sfi_lab_analyses', description:'Experimental runs enter Twin memory retaining SIMULATED/observed boundaries.' }),
    probe({ organ:'FIELD', table:'field_outcomes', description:'Observed returns become candidate institutional experience.' }),
    probe({ organ:'GOVERNANCE', table:'sfi_cognitive_twin_decisions', description:'Approved founder/ROOT decisions constrain Twin deliberation and authority.' }),
    probe({ organ:'COGNITIVE_TWIN', table:'sfi_cognitive_twin_memory', description:'Persistent model-independent institutional memory.' }),
  ]);
  const connected = organs.filter((item)=>item.connected).length;
  const exercised = organs.filter((item)=>item.connected && (item.observedRecords ?? 0) > 0).length;
  return {
    contractVersion:'SFI-CT-INSTITUTIONAL-INTEGRATION-1.0',
    generatedAt:new Date().toISOString(),
    organs,
    summary:{ total:organs.length, connected, exercised, fullyConnected:connected===organs.length, fullyExercised:exercised===organs.length },
    truthBoundary:'CONNECTED means the runtime can read the organ persistence surface. EXERCISED means at least one record exists. Neither means scientific validation, causal proof, or autonomous authority.',
  };
}

export async function syncSfiInstitutionalStateToCognitiveTwin() {
  const root = await syncRecentInstitutionalEvidenceToCognitiveTwin(250);
  const [field, methodLab, observatory] = await Promise.all([
    syncFieldReturns(),
    syncMethodLabRuns(),
    syncObservatoryState(),
  ]);
  const rootResult: SyncResult = {
    source:'root_evidence',
    ok:root.ok,
    observed:'synced' in root ? root.synced + root.failed : 0,
    synced:'synced' in root ? root.synced : 0,
    failed:'failed' in root ? root.failed : 0,
    warning:root.ok ? null : ('error' in root ? root.error : 'root_evidence_sync_degraded'),
  };
  const integration = await readCognitiveTwinSfiIntegration();
  const sources = [rootResult, observatory, methodLab, field];
  return {
    ok:sources.every((item)=>item.ok),
    sources,
    integration,
    synced:sources.reduce((sum,item)=>sum+item.synced,0),
    failed:sources.reduce((sum,item)=>sum+item.failed,0),
  };
}
