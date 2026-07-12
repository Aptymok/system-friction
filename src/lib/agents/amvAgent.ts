import 'server-only';
import { createAmvResponse } from '@/lib/amv/amv-core';
import { listAmvMemory, saveAmvMemory } from '@/lib/amv/amv-memory';
import { appendAmvLearning, readAmvThoughts } from '@/lib/amv/learning';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { createEmbedding } from '@/lib/ai/providerRouter';
import { compactText, createTrace, text, textScore, tokenize, unique, type AgentTrace } from './utils';

export type AmvOperationalItem = {
  id: string;
  source: string;
  kind: string;
  summary: string;
  evidence: string[];
  created_at: string | null;
  score: number;
  trust: 'verified' | 'declared' | 'inferred' | 'unknown';
};

export type AmvOperationalMemory = {
  ok: boolean;
  status: 'alive' | 'degraded' | 'empty' | 'local_fallback';
  mode: 'vector_probe' | 'textual_fallback' | 'graph_fallback' | 'empty_manual_ingest';
  total_items: number;
  sources: string[];
  query: string | null;
  items: AmvOperationalItem[];
  recurrent_patterns: Array<{ token: string; count: number; evidence_ids: string[] }>;
  associations: Array<{ from: string; to: string; relation: 'shared_token' | 'same_source'; basis: string; strength: number }>;
  actions: Array<{ id: string; label: string; approval_required: boolean; status: 'available' | 'blocked' }>;
  warnings: string[];
  embedding: { ok: boolean; provider: string; model: string; latency_ms: number } | null;
  trace: AgentTrace;
};

function itemFromRow(row: Record<string, unknown>, index: number): AmvOperationalItem {
  const id = text(row.id ?? row.memory_id ?? row.key, `amv_db_${index}`);
  const source = text(row.source ?? row.module ?? row.scope ?? row.origin, 'sfi_amv_memory');
  const kind = text(row.kind ?? row.type ?? row.memory_type, 'memory');
  const summary = text(row.summary ?? row.title ?? row.content ?? row.message ?? row.response, compactText(row, 220));
  const evidence = [
    text(row.evidence_hash),
    text(row.evidence_id),
    text(row.source_id),
  ].filter(Boolean);
  return {
    id,
    source,
    kind,
    summary,
    evidence,
    created_at: text(row.created_at ?? row.observed_at ?? row.updated_at, '') || null,
    score: 0,
    trust: evidence.length ? 'verified' : 'inferred',
  };
}

async function readDbMemory(limit: number) {
  try {
    const service = createServiceSupabaseClient();
    const { data, error } = await service
      .from('sfi_amv_memory')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { rows: (Array.isArray(data) ? data : []) as Record<string, unknown>[], warning: null as string | null };
  } catch (error) {
    return { rows: [], warning: `sfi_amv_memory_read_failed:${error instanceof Error ? error.message : 'unknown'}` };
  }
}

function recurrentPatterns(items: AmvOperationalItem[]) {
  const byToken = new Map<string, { count: number; evidence_ids: string[] }>();
  for (const item of items) {
    for (const token of unique(tokenize(item.summary)).slice(0, 24)) {
      const current = byToken.get(token) ?? { count: 0, evidence_ids: [] };
      current.count += 1;
      current.evidence_ids.push(item.id);
      byToken.set(token, current);
    }
  }
  return [...byToken.entries()]
    .filter(([, value]) => value.count > 1)
    .map(([token, value]) => ({ token, count: value.count, evidence_ids: unique(value.evidence_ids).slice(0, 8) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function associations(items: AmvOperationalItem[]) {
  const output: AmvOperationalMemory['associations'] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const tokens = new Set(tokenize(item.summary));
    for (const other of items.slice(index + 1, index + 9)) {
      const shared = tokenize(other.summary).filter((token) => tokens.has(token));
      if (item.source === other.source) {
        output.push({ from: item.id, to: other.id, relation: 'same_source', basis: item.source, strength: 0.62 });
      } else if (shared.length > 0) {
        output.push({ from: item.id, to: other.id, relation: 'shared_token', basis: unique(shared).slice(0, 4).join(', '), strength: Math.min(0.9, 0.28 + shared.length * 0.12) });
      }
    }
  }
  return output.sort((a, b) => b.strength - a.strength).slice(0, 16);
}

export async function readAmvOperationalMemory(options: { query?: string | null; limit?: number; useEmbeddings?: boolean } = {}): Promise<AmvOperationalMemory> {
  const limit = Math.max(5, Math.min(80, options.limit ?? 35));
  const query = options.query?.trim() || null;
  const warnings: string[] = [];
  const db = await readDbMemory(limit);
  if (db.warning) warnings.push(db.warning);

  const local = listAmvMemory({ limit }).map((item): AmvOperationalItem => ({
    id: item.id,
    source: item.module,
    kind: item.kind,
    summary: item.summary,
    evidence: [item.evidenceHash],
    created_at: item.createdAt,
    score: 0,
    trust: item.inference.sourceTrust,
  }));
  const thoughts = await readAmvThoughts(null);
  const thoughtItems = thoughts.map((item): AmvOperationalItem => ({
    id: item.id,
    source: item.source,
    kind: 'learning',
    summary: item.thought,
    evidence: [],
    created_at: item.created_at,
    score: 0,
    trust: 'inferred',
  }));

  let items = [
    ...db.rows.map(itemFromRow),
    ...local,
    ...thoughtItems,
  ];

  const seen = new Set<string>();
  items = items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  let embedding: AmvOperationalMemory['embedding'] = null;
  if (query && options.useEmbeddings) {
    const vector = await createEmbedding(query);
    embedding = {
      ok: vector.ok,
      provider: vector.provider,
      model: vector.model,
      latency_ms: vector.latency_ms,
    };
    warnings.push(...vector.warnings);
  }

  if (query) {
    items = items
      .map((item) => ({ ...item, score: textScore(query, `${item.summary} ${item.source} ${item.kind}`) }))
      .filter((item) => item.score > 0 || item.summary.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } else {
    items = items.slice(0, limit);
  }

  const status: AmvOperationalMemory['status'] = items.length
    ? db.rows.length ? warnings.length ? 'degraded' : 'alive' : 'local_fallback'
    : warnings.length ? 'degraded' : 'empty';
  const mode: AmvOperationalMemory['mode'] = embedding?.ok
    ? 'vector_probe'
    : items.length
      ? 'textual_fallback'
      : 'empty_manual_ingest';

  const trace = createTrace({
    prefix: 'amv',
    sourceInputs: [query ?? 'latest_memory'],
    toolsUsed: ['sfi_amv_memory', 'amv-local-memory', 'amv-learning', embedding?.ok ? 'embedding-provider' : 'text-search'],
    providerUsed: embedding?.provider ?? 'degraded',
    evidenceUsed: items.flatMap((item) => item.evidence.length ? item.evidence : [item.id]),
    confidence: items.length ? 0.58 : 0.24,
    persistence: db.rows.length ? 'persisted' : local.length ? 'local_fallback' : 'not_persisted',
  });

  return {
    ok: status === 'alive' || status === 'local_fallback' || status === 'degraded',
    status,
    mode,
    total_items: items.length,
    sources: unique(items.map((item) => item.source)),
    query,
    items,
    recurrent_patterns: recurrentPatterns(items),
    associations: associations(items),
    actions: [
      { id: 'ingest_evidence', label: 'ingest evidence', approval_required: false, status: 'available' },
      { id: 'search_memory', label: 'search memory', approval_required: false, status: 'available' },
      { id: 'generate_associations', label: 'generate associations', approval_required: false, status: items.length ? 'available' : 'blocked' },
      { id: 'send_to_neural_graph', label: 'send to Neural Graph', approval_required: true, status: items.length ? 'available' : 'blocked' },
      { id: 'create_prediction', label: 'create prediction', approval_required: true, status: items.length ? 'available' : 'blocked' },
      { id: 'create_atlas_entry', label: 'create atlas entry', approval_required: true, status: items.length ? 'available' : 'blocked' },
    ],
    warnings: unique(warnings),
    embedding,
    trace,
  };
}

export async function ingestAmvEvidence(input: { source: string; text: string; caseId?: string | null }) {
  const response = createAmvResponse({
    module: input.source || 'manual_ingest',
    sessionId: input.caseId ?? `amv_manual_${Date.now().toString(36)}`,
    message: input.text,
    context: { source: input.source, caseId: input.caseId ?? null },
  });
  saveAmvMemory(response.memoryDelta);
  const trustScore = response.inference.sourceTrust === 'verified' ? 1 : response.inference.sourceTrust === 'declared' ? 0.7 : response.inference.sourceTrust === 'inferred' ? 0.45 : 0.2;
  const service = createServiceSupabaseClient();
  const persisted = await service.from('sfi_amv_memory').insert({
    session_id: response.memoryDelta.sessionId,
    module: response.memoryDelta.module,
    input_hash: response.memoryDelta.evidenceHash,
    input_summary: response.memoryDelta.message,
    inference: response.inference,
    decision: { requiredAction: response.inference.requiredAction, nextObservation: response.nextObservation },
    output_summary: response.response,
    evaluation: { epistemicClass: 'declared', verified: false },
    memory_delta: response.memoryDelta,
    uncertainty: response.inference.uncertainty,
    source_trust: trustScore,
    requires_human_validation: response.requiresHumanValidation,
  }).select('id,created_at').single();
  if (persisted.error) {
    return { ok: false as const, status: 'degraded' as const, error: 'sfi_amv_memory_insert_failed', warnings: [persisted.error.message], response };
  }
  try {
    await appendAmvLearning({
      case_id: input.caseId ?? null,
      source: input.source || 'manual_ingest',
      event_type: 'manual_amv_ingest',
      summary: input.text,
      payload: { source: input.source, text: input.text },
    });
  } catch {
    // AMV local memory remains valid even if logbook persistence is unavailable.
  }
  const memory = await readAmvOperationalMemory({ query: input.text, limit: 12 });
  return { ...memory, ingest: { persisted: true, id: persisted.data.id, created_at: persisted.data.created_at, epistemicClass: 'declared', verified: false } };
}
