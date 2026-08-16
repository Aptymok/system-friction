import 'server-only';

import { createHash } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { canonicalJson } from './decisionCommitment';

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export async function verifyBlindDecisionContextIntegrity(blindRunId: string) {
  const db = createServiceSupabaseClient();
  const read = await db.from('sfi_cognitive_twin_runs')
    .select('id,contract_version,role,status,input_snapshot')
    .eq('id', blindRunId)
    .maybeSingle();

  if (read.error || !read.data) {
    throw new Error(`BLIND_RUN_NOT_FOUND:${read.error?.message ?? blindRunId}`);
  }
  if (read.data.contract_version !== 'SFI-CT-BLIND-DECISION-1.0') {
    throw new Error(`BLIND_RUN_CONTRACT_MISMATCH:${read.data.contract_version ?? 'missing'}`);
  }
  if (read.data.role !== 'DECISION_TRANSFER_BLIND_RECONSTRUCTOR') {
    throw new Error(`BLIND_RUN_ROLE_MISMATCH:${read.data.role ?? 'missing'}`);
  }
  if (read.data.status !== 'EVIDENCE_PENDING') {
    throw new Error(`BLIND_RUN_NOT_REVEALABLE:${read.data.status}`);
  }

  const snapshot = read.data.input_snapshot && typeof read.data.input_snapshot === 'object' && !Array.isArray(read.data.input_snapshot)
    ? read.data.input_snapshot as Record<string, unknown>
    : {};
  const selectedContextHash = typeof snapshot.selectedContextHash === 'string' ? snapshot.selectedContextHash : '';
  if (!selectedContextHash || !('selectedContext' in snapshot)) {
    throw new Error('BLIND_CONTEXT_INTEGRITY_METADATA_MISSING');
  }
  const actualHash = sha256(canonicalJson(snapshot.selectedContext));
  if (actualHash !== selectedContextHash) {
    throw new Error('BLIND_CONTEXT_INTEGRITY_MISMATCH');
  }

  return { ok: true as const, selectedContextHash };
}
