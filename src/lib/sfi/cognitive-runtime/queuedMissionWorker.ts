import 'server-only';

import { createHash } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { assertTenantAccess } from '@/lib/sfi/case-platform/repository';
import { executeManualCognitiveAgent } from './manualExecution';
import { validateMissionDispatchRequest } from './missionDispatch';
import { checkC07CaseQueueState } from './queuedMissionCaseGate';

export const SFI_C07_QUEUE_WORKER_CONTRACT = 'SFI-C07-QUEUED-CANONICAL-WORKER-1.0' as const;
type Row = Record<string, unknown>;
function row(value: unknown): Row {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value !== null && typeof value === 'object') {
    const input = row(value);
    return Object.fromEntries(Object.keys(input).sort().map(k => [k, stable(input[k])]));
  }
  return value;
}
export function canonicalQueuedRequestDigest(value: Row) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

/** Admission validates the persisted job; only the caller's authorized
 * scheduler and service-role, never a user-supplied request, can claim work.
 * All target tenants and actor memberships are rechecked immediately below.
 */
export function checkQueuedMissionClaim(value: unknown, nowMs: number = Date.now()) {
  const claim = row(value);
  const payload = row(claim.request_payload);
  const fail = (reason: string) => ({ ok: false as const, reason });
  if (process.env.SFI_C07_MISSION_QUEUE_ENABLED !== 'true') return fail('QUEUE_DISABLED');
  const id = text(claim.id);
  const leaseToken = text(claim.lease_token);
  const leaseUntil = Date.parse(text(claim.lease_until) ?? '');
  const expiresAt = text(claim.expires_at);
  if (!id || !leaseToken || claim.status !== 'RUNNING'
    || !Number.isFinite(leaseUntil) || leaseUntil <= nowMs
    || (expiresAt && (Date.parse(expiresAt) <= nowMs || !Number.isFinite(Date.parse(expiresAt))))) {
    return fail('NO_VALID_FENCED_LEASE');
  }
  const tenantId = text(claim.tenant_id);
  const actorId = text(claim.actor_id);
  const executionId = text(claim.execution_id);
  if (!tenantId || !actorId || !executionId
    || !/^[0-9a-f-]{36}$/i.test(executionId)) return fail('IDENTITY_MISSING');
  if (canonicalQueuedRequestDigest(payload) !== claim.request_digest) return fail('REQUEST_DIGEST_MISMATCH');
  if (text(claim.mission_id) !== text(payload.missionId)
    || text(claim.agent_id) !== text(payload.agentId)) return fail('MISSION_IDENTITY_MISMATCH');
  const checked = validateMissionDispatchRequest(payload);
  if (!checked.ok) return fail('MISSION_CONTRACT_REJECTED:' + checked.error);
  if (checked.mission.humanApprovalRequired) return fail('RESERVED_HUMAN_APPROVAL_REQUIRED');
  if (payload.llmAugmentation === true
    || (Array.isArray(payload.sourceUrls) && payload.sourceUrls.length)
    || (Array.isArray(payload.evidenceIds) && payload.evidenceIds.length)) return fail('UNAUTHORIZED_EXTRA_CAPABILITIES');
  if (row(payload.governanceContext).approvedExternalAction === true) return fail('EXTERNAL_ACTION_NOT_AUTHORIZED');
  const targets = (payload.targets as unknown[]).map(row);
  const anchors = (payload.anchors as unknown[]).map(row);
  const refs = [...targets,...anchors];
  const canaryCase = process.env.SFI_C07_CANARY_CASE_ID;
  if (!canaryCase || !targets[0] || targets[0].id !== canaryCase) {
    return fail('CASE_OUTSIDE_AUTHORIZED_CANARY');
  }
  // Current C07 intake admits only one CASE and same-CASE anchors.
  if (targets.length !== 1 || targets[0].kind !== 'CASE' || !text(targets[0].id)
    || anchors.length === 0
    || anchors.some(v => v.kind !== 'CASE' || v.id !== targets[0].id)
    || !text(payload.caseRevision)) {
    return fail('CANONICAL_CASE_REVISION_AND_ANCHORS_REQUIRED');
  }
  return {
    ok: true as const, id, leaseToken, leaseUntil, tenantId, actorId, executionId,
    payload, refs: refs.map(v => ({ kind: String(v.kind) as 'CASE' | 'PROJECT', id: String(v.id) })),
    missionId: checked.mission.missionId,
  };
}

/**
 * One bounded step invoked only from an existing authenticated scheduling
 * surface. Feature-disabled by default. No cron, schema or authority is created.
 * A persisted event is independently read by executeManualCognitiveAgent and
 * then checked again against the fenced job in the existing SQL candidate.
 */
export async function runBoundedC07QueuedMission(workerId: string) {
  if (process.env.SFI_C07_MISSION_QUEUE_ENABLED !== 'true') {
    return { ok: true, state: 'DISABLED_NO_WRITE', processed: 0 };
  }
  if (!/^[-_a-zA-Z0-9]{3,80}$/.test(workerId)) {
    return { ok: false, state: 'INVALID_WORKER_ID', processed: 0 };
  }
  const db = createServiceSupabaseClient();
  const claim = await db.rpc('sfi_c07_claim_mission_v1', { p_worker_id: workerId, p_lease_seconds: 900 });
  if (claim.error) return { ok: false, state: 'QUEUE_UNAVAILABLE', processed: 0, error: claim.error.code ?? 'CLAIM_FAILED' };
  const raw = Array.isArray(claim.data) ? claim.data[0] : claim.data;
  if (!text(row(raw).id)) return { ok: true, state: 'IDLE_NO_AUTHORIZED_MISSION', processed: 0 };
  const gate = checkQueuedMissionClaim(raw);
  if (!gate.ok) {
    return { ok: false, state: 'CLAIM_REJECTED_NO_EXECUTION', reason: gate.reason, processed: 0 };
  }
  const { id, leaseToken, executionId, tenantId, actorId, payload } = gate;
  const receiptFirst = await db.rpc('sfi_c07_reconcile_mission_v1', { p_id: id, p_token: leaseToken });
  if (receiptFirst.error) return { ok: false, state: 'RECEIPT_RECONCILIATION_UNAVAILABLE', processed: 0 };
  if (receiptFirst.data === 'RECONCILED_COMPLETED') {
    return { ok: true, state: 'COMPLETED_BY_PERSISTED_RECEIPT', processed: 1, executionId };
  }
  if (receiptFirst.data !== 'NO_RECEIPT') {
    return { ok: false, state: 'RECEIPT_REQUIRES_REVIEW', reason: receiptFirst.data, processed: 0 };
  }
  try {
    // Recheck exactly the canonical Case Platform WRITE authority, not just
    // active tenant membership (which could include READ-only viewers).
    await assertTenantAccess(tenantId, actorId, 'WRITE');
    for (const target of gate.refs) {
      const table = target.kind === 'CASE' ? 'sfi_cases' : 'sfi_projects';
      const targetRead = await db.from(table).select('id,tenant_id,status,updated_at,deleted_at')
        .eq('id',target.id).eq('tenant_id',tenantId).is('deleted_at',null).maybeSingle();
      if (targetRead.error || !targetRead.data) throw new Error('TENANT_TARGET_ISOLATION_REQUIRED');
      const caseGate = checkC07CaseQueueState({
        status:targetRead.data.status,updatedAt:targetRead.data.updated_at,
        deletedAt:targetRead.data.deleted_at,
      },text(payload.caseRevision));
      if (!caseGate.ok) throw new Error(caseGate.reason);
    }
    const renewal = await db.rpc('sfi_c07_renew_mission_v1', {
      p_id: id, p_token: leaseToken, p_lease_seconds: 900,
    });
    if (renewal.error || renewal.data !== true) throw new Error('WORKER_LEASE_NOT_RENEWED');
    const result = await executeManualCognitiveAgent(payload,{
      userId: actorId, actorId: 'sfi_c07_queue_worker', tenantId,
      requestSource: 'QUEUE_WORKER', allowLegacyCompatibility: false,
      queueExecutionId: executionId,
    });
    const execution = row(result.body.execution);
    const receipt = row(execution.receiptReadback);
    if (result.status !== 200 || result.body.ok !== true || execution.executed !== true
      || receipt.status !== 'READ_BACK_CONFIRMED' || !text(receipt.eventId)
      || !text(receipt.hash)) {
      throw new Error('AGENT_DID_NOT_RETURN_CONFIRMED_EXECUTION_RECEIPT');
    }
    const completed = await db.rpc('sfi_c07_complete_mission_v1',{
      p_id:id, p_token:leaseToken, p_receipt_event_id:receipt.eventId,
      p_receipt_hash:receipt.hash,
    });
    if (completed.error || completed.data !== true) {
      return { ok:false, state:'RECEIPT_EXISTS_RECONCILIATION_REQUIRED', executionId, processed:0 };
    }
    return { ok:true, state:'COMPLETED', executionId, processed:1, returnObservation:'NOT_OBSERVED' };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const failed = await db.rpc('sfi_c07_fail_mission_v1',{
      p_id:id,p_token:leaseToken,p_reason:'BOUNDED_EXECUTION_FAILED',p_retry_seconds:30,
    });
    return { ok:false, state:'EXECUTION_FAILED_OR_BLOCKED', executionId, processed:0,
      failureRecorded:!failed.error && ['QUEUED','BLOCKED','CANCELLED'].includes(String(failed.data)),
      reason:reason.slice(0,140) };
  }
}
