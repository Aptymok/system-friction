import 'server-only';

import { createHash } from 'node:crypto';
import { z } from 'zod';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { canonicalJson } from './decisionCommitment';
import type { DecisionTrace } from './decisionTransfer';

type Row = Record<string, unknown>;

const targetObservationEvidenceIdsSchema = z.array(z.string().uuid()).max(120).default([]);
const ROOT_EVIDENCE_PREFIX = 'root_evidence_entries:';

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
function targetRefMatchesEvidenceId(ref: string, id: string) {
  return ref === id || ref === `${ROOT_EVIDENCE_PREFIX}${id}`;
}
function canonicalRootEvidenceIds(target: DecisionTrace) {
  return target.evidenceRefs.flatMap((ref) => {
    if (!ref.startsWith(ROOT_EVIDENCE_PREFIX)) return [];
    const id = ref.slice(ROOT_EVIDENCE_PREFIX.length);
    const parsed = z.string().uuid().safeParse(id);
    return parsed.success ? [parsed.data] : [];
  });
}

export function parseTargetObservationEvidenceIds(value: unknown) {
  const source = record(value);
  return targetObservationEvidenceIdsSchema.parse(source.targetObservationEvidenceIds);
}

export async function verifyRevealedTargetAfterContextCutoff(input: {
  blindRunId: string;
  target: DecisionTrace;
  targetObservationEvidenceIds: string[];
}) {
  const db = createServiceSupabaseClient();
  const run = await db.from('sfi_cognitive_twin_runs')
    .select('id,role,status,input_snapshot')
    .eq('id', input.blindRunId)
    .maybeSingle();
  if (run.error || !run.data) throw new Error(`DT_TARGET_TIMING_RUN_NOT_FOUND:${run.error?.message ?? input.blindRunId}`);
  if (run.data.role !== 'DECISION_TRANSFER_BLIND_RECONSTRUCTOR') {
    throw new Error(`DT_TARGET_TIMING_ROLE_MISMATCH:${run.data.role ?? 'missing'}`);
  }
  if (run.data.status !== 'EVIDENCE_PENDING') {
    throw new Error(`DT_TARGET_TIMING_RUN_NOT_REVEALABLE:${run.data.status ?? 'missing'}`);
  }

  const snapshot = record(run.data.input_snapshot);
  const receipt = record(snapshot.contextMaterialization);
  if (!Object.keys(receipt).length) {
    return {
      required: false as const,
      status: 'NOT_APPLICABLE_MANUAL_CONTEXT' as const,
      verified: false as const,
      cutoffAt: null,
      evidence: [],
      rejectedCandidates: [],
    };
  }

  if (text(receipt.protocol) !== 'SFI-DT-CONTEXT-MATERIALIZATION-1.0' || text(receipt.source) !== 'CANONICAL_MATERIALIZED') {
    throw new Error('DT_TARGET_TIMING_CONTEXT_RECEIPT_CONTRACT_MISMATCH');
  }
  if (text(receipt.targetTraceId) !== input.target.traceId) {
    throw new Error('DT_TARGET_TIMING_TARGET_TRACE_MISMATCH');
  }

  const storedReceiptHash = text(receipt.receiptHash);
  if (!storedReceiptHash) throw new Error('DT_TARGET_TIMING_RECEIPT_HASH_MISSING');
  const { receiptHash: _receiptHash, ...receiptBase } = receipt;
  const actualReceiptHash = sha256(canonicalJson(receiptBase));
  if (actualReceiptHash !== storedReceiptHash) throw new Error('DT_TARGET_TIMING_RECEIPT_INTEGRITY_MISMATCH');

  const cutoffAt = text(receipt.cutoffAt);
  const cutoffMs = cutoffAt ? new Date(cutoffAt).getTime() : Number.NaN;
  if (!cutoffAt || !Number.isFinite(cutoffMs)) throw new Error('DT_TARGET_TIMING_CUTOFF_INVALID');

  const explicitIds = [...new Set(input.targetObservationEvidenceIds)];
  for (const id of explicitIds) {
    if (!input.target.evidenceRefs.some((ref) => targetRefMatchesEvidenceId(ref, id))) {
      throw new Error(`DT_TARGET_TIMING_EVIDENCE_NOT_BOUND_TO_TARGET:${id}`);
    }
  }
  const evidenceIds = explicitIds.length ? explicitIds : [...new Set(canonicalRootEvidenceIds(input.target))];
  if (!evidenceIds.length) {
    throw new Error('DT_TARGET_TIMING_OBSERVED_EVIDENCE_REQUIRED:bind at least one root_evidence_entries:<uuid> ref to the revealed target');
  }

  const evidenceRead = await db.from('root_evidence_entries')
    .select('id,epistemic_event_id,created_at')
    .in('id', evidenceIds);
  if (evidenceRead.error) throw new Error(`DT_TARGET_TIMING_EVIDENCE_READ_FAILED:${evidenceRead.error.message}`);
  const evidenceRows = (evidenceRead.data ?? []) as Row[];
  const evidenceById = new Map(evidenceRows.map((item) => [String(item.id), item]));
  const missingEvidenceIds = evidenceIds.filter((id) => !evidenceById.has(id));
  if (explicitIds.length && missingEvidenceIds.length) {
    throw new Error(`DT_TARGET_TIMING_EVIDENCE_NOT_FOUND:${missingEvidenceIds.join(',')}`);
  }

  const eventIds = evidenceIds
    .map((id) => text(evidenceById.get(id)?.epistemic_event_id))
    .filter((id): id is string => Boolean(id));
  if (!eventIds.length) throw new Error('DT_TARGET_TIMING_EPISTEMIC_EVENT_REQUIRED');
  const eventRead = await db.from('epistemic_events')
    .select('event_id,epistemic_class,occurred_at,checksum,hash_self')
    .in('event_id', eventIds);
  if (eventRead.error) throw new Error(`DT_TARGET_TIMING_EVENT_READ_FAILED:${eventRead.error.message}`);
  const eventById = new Map(((eventRead.data ?? []) as Row[]).map((item) => [String(item.event_id), item]));

  const proof: Array<{ evidenceId: string; eventId: string; epistemicClass: 'OBSERVED'; occurredAt: string; checksum: string | null; hashSelf: string | null }> = [];
  const rejectedCandidates: Array<{ evidenceId: string; reason: string }> = [];
  for (const id of evidenceIds) {
    const evidence = evidenceById.get(id);
    if (!evidence) {
      rejectedCandidates.push({ evidenceId: id, reason: 'ROOT_EVIDENCE_NOT_FOUND' });
      continue;
    }
    const eventId = text(evidence.epistemic_event_id);
    if (!eventId) {
      rejectedCandidates.push({ evidenceId: id, reason: 'EPISTEMIC_EVENT_MISSING' });
      continue;
    }
    const event = eventById.get(eventId);
    if (!event) {
      rejectedCandidates.push({ evidenceId: id, reason: 'EPISTEMIC_EVENT_NOT_FOUND' });
      continue;
    }
    if (text(event.epistemic_class) !== 'observed') {
      rejectedCandidates.push({ evidenceId: id, reason: `NOT_OBSERVED:${text(event.epistemic_class) ?? 'missing'}` });
      continue;
    }
    const occurredAt = text(event.occurred_at);
    const occurredMs = occurredAt ? new Date(occurredAt).getTime() : Number.NaN;
    if (!occurredAt || !Number.isFinite(occurredMs)) {
      rejectedCandidates.push({ evidenceId: id, reason: 'EVENT_TIME_INVALID' });
      continue;
    }
    if (occurredMs <= cutoffMs) {
      rejectedCandidates.push({ evidenceId: id, reason: `NOT_AFTER_CUTOFF:${occurredAt}` });
      continue;
    }
    proof.push({
      evidenceId: id,
      eventId,
      epistemicClass: 'OBSERVED',
      occurredAt,
      checksum: text(event.checksum),
      hashSelf: text(event.hash_self),
    });
  }

  if (explicitIds.length && proof.length !== explicitIds.length) {
    throw new Error(`DT_TARGET_TIMING_EXPLICIT_EVIDENCE_NOT_VERIFIED:${rejectedCandidates.map((item) => `${item.evidenceId}=${item.reason}`).join(',')}`);
  }
  if (!proof.length) {
    throw new Error(`DT_TARGET_TIMING_NO_POST_CUTOFF_OBSERVED_EVIDENCE:${rejectedCandidates.map((item) => `${item.evidenceId}=${item.reason}`).join(',')}`);
  }

  proof.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const proofBase = {
    protocol: 'SFI-DT-TARGET-TIMING-1.0' as const,
    blindRunId: input.blindRunId,
    targetTraceId: input.target.traceId,
    contextReceiptHash: storedReceiptHash,
    cutoffAt,
    earliestObservedTargetAt: proof[0].occurredAt,
    evidence: proof,
    rejectedCandidates,
    evidenceSelection: explicitIds.length ? 'EXPLICIT_TARGET_OBSERVATION_IDS' as const : 'AUTO_FROM_CANONICAL_TARGET_REFS' as const,
    boundary: 'At least one root evidence reference bound to the revealed target resolves to an OBSERVED epistemic event that occurred strictly after the frozen context cutoff. Explicitly designated target-observation IDs must all satisfy the boundary.',
  };

  return {
    required: true as const,
    status: 'VERIFIED_POST_CUTOFF' as const,
    verified: true as const,
    ...proofBase,
    proofHash: sha256(canonicalJson(proofBase)),
  };
}
