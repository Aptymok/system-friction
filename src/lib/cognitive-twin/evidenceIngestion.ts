import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

export async function ingestRootEvidenceIntoCognitiveTwin(evidence: Row) {
  const db = createServiceSupabaseClient();
  const id = text(evidence.id);
  if (!id) return { ok: false as const, error: 'root_evidence_id_missing' };

  const payload = record(evidence.payload);
  const evidenceHash = text(evidence.evidence_hash) ?? text(payload.evidenceHash) ?? id;
  const eventId = text(evidence.epistemic_event_id);
  const evidenceRefs = [id, eventId].filter((value): value is string => Boolean(value));
  const memoryKey = `ROOT-EVIDENCE:${evidenceHash}`;

  const result = await db.from('sfi_cognitive_twin_memory').upsert({
    memory_key: memoryKey,
    memory_type: 'EVIDENCE',
    status: 'CANDIDATE',
    content: {
      epistemicClass: 'observed_record',
      title: text(evidence.title),
      content: text(evidence.content),
      evidenceType: text(evidence.evidence_type),
      targetNodeId: text(evidence.target_node_id),
      payload,
      rule: 'The existence and provenance of this evidence record are observed. The truth of claims inside its content remains subject to independent evaluation.',
    },
    evidence_refs: evidenceRefs,
    source_kind: 'root_evidence_entries',
    source_ref: id,
    version: '1.0.0',
    created_by: text(evidence.actor_id),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'memory_key,version' }).select('id,memory_key,status,evidence_refs,updated_at').single();

  if (result.error) return { ok: false as const, error: 'cognitive_twin_evidence_sync_failed', details: result.error.message };
  return { ok: true as const, memory: result.data };
}

export async function syncRecentInstitutionalEvidenceToCognitiveTwin(limit = 200) {
  const db = createServiceSupabaseClient();
  const evidence = await db.from('root_evidence_entries')
    .select('id,evidence_hash,actor_id,title,content,evidence_type,target_node_id,payload,epistemic_event_id,created_at')
    .order('created_at', { ascending: false })
    .limit(Math.max(1, Math.min(1000, limit)));

  if (evidence.error) return { ok: false as const, error: 'root_evidence_read_failed', details: evidence.error.message, synced: 0, failed: 0 };

  let synced = 0;
  const failures: string[] = [];
  for (const row of evidence.data ?? []) {
    const result = await ingestRootEvidenceIntoCognitiveTwin(row as Row);
    if (result.ok) synced += 1;
    else failures.push(`${String((row as Row).id ?? 'unknown')}:${result.error}`);
  }

  return { ok: failures.length === 0, synced, failed: failures.length, failures };
}
