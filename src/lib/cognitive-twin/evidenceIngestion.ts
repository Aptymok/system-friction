import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { persistCognitiveTwinExperience } from './experienceBridge';

type Row = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

export async function ingestRootEvidenceIntoCognitiveTwin(evidence: Row) {
  const id = text(evidence.id);
  if (!id) return { ok: false as const, error: 'root_evidence_id_missing' };

  const payload = record(evidence.payload);
  const evidenceHash = text(evidence.evidence_hash) ?? text(payload.evidenceHash) ?? id;
  const eventId = text(evidence.epistemic_event_id);
  const evidenceRefs = [id, eventId].filter((value): value is string => Boolean(value));
  const memoryKey = `ROOT-EVIDENCE:${evidenceHash}`;

  const persisted = await persistCognitiveTwinExperience({
    memoryKey,
    memoryType:'EVIDENCE',
    sourceKind:'root_evidence_entries',
    sourceRef:id,
    evidenceRefs,
    createdBy:text(evidence.actor_id),
    version:'1.0.0',
    content:{
      epistemicClass:'OBSERVED',
      observedObject:'evidence_record_existence_and_provenance',
      title:text(evidence.title),
      content:text(evidence.content),
      evidenceType:text(evidence.evidence_type),
      targetNodeId:text(evidence.target_node_id),
      payload,
      rule:'The existence and provenance of this evidence record are OBSERVED. Claims inside its content retain their own epistemic class and require independent evaluation before promotion.',
    },
  });

  if (!persisted.ok) return { ok:false as const, error:'cognitive_twin_evidence_sync_failed', details:persisted.reason };
  return { ok:true as const, memory:persisted.memory };
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
