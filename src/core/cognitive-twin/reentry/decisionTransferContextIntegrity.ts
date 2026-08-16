import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function verifyDecisionTransferContextReceiptBound(runId: string, expectedReceiptHash: string) {
  const db = createServiceSupabaseClient();
  const read = await db.from('sfi_cognitive_twin_runs')
    .select('id,role,status,input_snapshot')
    .eq('id', runId)
    .maybeSingle();

  if (read.error || !read.data) {
    throw new Error(`DT_CONTEXT_BIND_VERIFY_RUN_NOT_FOUND:${read.error?.message ?? runId}`);
  }
  if (read.data.role !== 'DECISION_TRANSFER_BLIND_RECONSTRUCTOR') {
    throw new Error(`DT_CONTEXT_BIND_VERIFY_ROLE_MISMATCH:${read.data.role ?? 'missing'}`);
  }
  if (read.data.status !== 'EVIDENCE_PENDING') {
    throw new Error(`DT_CONTEXT_BIND_VERIFY_STATE_MISMATCH:${read.data.status ?? 'missing'}`);
  }

  const snapshot = record(read.data.input_snapshot);
  const receipt = record(snapshot.contextMaterialization);
  const actualReceiptHash = typeof receipt.receiptHash === 'string' ? receipt.receiptHash : '';
  if (!actualReceiptHash || actualReceiptHash !== expectedReceiptHash) {
    throw new Error('DT_CONTEXT_BIND_VERIFY_RECEIPT_MISMATCH');
  }

  return { ok: true as const, receiptHash: actualReceiptHash };
}
