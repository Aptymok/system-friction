import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { DecisionTransferEvaluationEvidenceReceipt } from './decisionTransferEvaluationEvidence';

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort();
}

export async function verifyDecisionTransferEvaluationEvidenceCanonicalIds(
  receipt: DecisionTransferEvaluationEvidenceReceipt,
) {
  const db = createServiceSupabaseClient();
  const requestedEvidenceIds = unique(receipt.evidenceIds);
  const evidenceRead = requestedEvidenceIds.length
    ? await db.from('root_evidence_entries').select('id').in('id', requestedEvidenceIds)
    : { data: [], error: null };
  if (evidenceRead.error) throw new Error(`DT_EVIDENCE_CANONICAL_ID_READ_FAILED:${evidenceRead.error.message}`);
  const canonicalEvidenceIds = unique((evidenceRead.data ?? []).map((row) => String(row.id)));
  if (canonicalEvidenceIds.length !== requestedEvidenceIds.length) {
    const found = new Set(canonicalEvidenceIds);
    const missing = requestedEvidenceIds.filter((id) => !found.has(id));
    throw new Error(`DT_EVIDENCE_NONCANONICAL_EVIDENCE_IDS:${missing.join(',')}`);
  }
  if (receipt.uniqueEvidenceObjects !== canonicalEvidenceIds.length) {
    throw new Error(`DT_EVIDENCE_UNIQUE_EVIDENCE_COUNT_MISMATCH:${receipt.uniqueEvidenceObjects}->${canonicalEvidenceIds.length}`);
  }

  const requestedEventIds = unique(receipt.eventIds);
  const eventRead = requestedEventIds.length
    ? await db.from('epistemic_events').select('event_id').in('event_id', requestedEventIds)
    : { data: [], error: null };
  if (eventRead.error) throw new Error(`DT_EVIDENCE_CANONICAL_EVENT_READ_FAILED:${eventRead.error.message}`);
  const canonicalEventIds = unique((eventRead.data ?? []).map((row) => String(row.event_id)));
  if (canonicalEventIds.length !== requestedEventIds.length) {
    const found = new Set(canonicalEventIds);
    const missing = requestedEventIds.filter((id) => !found.has(id));
    throw new Error(`DT_EVIDENCE_NONCANONICAL_EVENT_IDS:${missing.join(',')}`);
  }
  if (receipt.uniqueEvents !== canonicalEventIds.length) {
    throw new Error(`DT_EVIDENCE_UNIQUE_EVENT_COUNT_MISMATCH:${receipt.uniqueEvents}->${canonicalEventIds.length}`);
  }

  return {
    evidenceIds: canonicalEvidenceIds,
    eventIds: canonicalEventIds,
    uniqueEvidenceObjects: canonicalEvidenceIds.length,
    uniqueEvents: canonicalEventIds.length,
  };
}
