import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

const CANONICAL_MEMORY_MODULE = 'institutionalEventPipeline';
const MAX_SCAN_ROWS = 512;

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function memoryStatus(content: Row) {
  const declared = text(content.memoryStatus) ?? text(content.status);
  if (declared && ['CANDIDATE', 'VERIFIED', 'CANONICAL'].includes(declared)) return declared;
  if (text(content.lifecycleStatus) === 'INSTITUTIONALIZED') return 'CANONICAL';
  if (text(content.lifecycleStatus) === 'REPRODUCIBLE') return 'VERIFIED';
  return 'CANDIDATE';
}

export type CanonicalCognitiveTwinMemory = {
  id: string;
  memory_key: string;
  memory_type: string;
  status: string;
  content: unknown;
  evidence_refs: string[];
  source_kind: string | null;
  source_ref: string | null;
  version: string;
  created_at: string | null;
  updated_at: string | null;
  canonical_store: 'sfi_amv_memory';
};

function fromAmvRow(value: unknown): CanonicalCognitiveTwinMemory | null {
  const row = record(value);
  const delta = record(row.memory_delta);
  const raw = record(delta.raw);
  const key = text(raw.memoryKey);
  const type = text(raw.memoryType);
  if (!key || !type) return null;
  const content = record(raw.content);
  const createdAt = text(row.created_at);
  return {
    id: text(row.id) ?? key,
    memory_key: key,
    memory_type: type,
    status: memoryStatus(content),
    content: raw.content ?? null,
    evidence_refs: strings(raw.evidenceRefs),
    source_kind: text(raw.sourceKind),
    source_ref: text(raw.sourceRef),
    version: text(content.cognitiveTwinExperienceContract) ?? 'SFI-CT-EXPERIENCE-2.0',
    created_at: createdAt,
    updated_at: createdAt,
    canonical_store: 'sfi_amv_memory',
  };
}

export async function readCanonicalCognitiveTwinMemory(limit = 64) {
  const db = createServiceSupabaseClient();
  const requested = Math.max(1, Math.min(limit, 256));
  const scanLimit = Math.min(MAX_SCAN_ROWS, Math.max(requested * 4, 128));

  const [rowsResult, countResult] = await Promise.all([
    db.from('sfi_amv_memory')
      .select('id,module,input_summary,memory_delta,source_trust,requires_human_validation,created_at')
      .eq('module', CANONICAL_MEMORY_MODULE)
      .not('memory_delta->raw->>memoryKey', 'is', null)
      .order('created_at', { ascending: false })
      .limit(scanLimit),
    db.from('sfi_amv_memory')
      .select('id', { count: 'exact', head: true })
      .eq('module', CANONICAL_MEMORY_MODULE)
      .not('memory_delta->raw->>memoryKey', 'is', null),
  ]);

  const latestByKey = new Map<string, CanonicalCognitiveTwinMemory>();
  for (const item of rowsResult.data ?? []) {
    const memory = fromAmvRow(item);
    if (!memory || latestByKey.has(memory.memory_key)) continue;
    latestByKey.set(memory.memory_key, memory);
    if (latestByKey.size >= requested) break;
  }

  return {
    rows: [...latestByKey.values()],
    eventCount: countResult.error ? null : countResult.count ?? 0,
    error: rowsResult.error?.message ?? countResult.error?.message ?? null,
  };
}
