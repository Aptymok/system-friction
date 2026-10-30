import 'server-only';

import {
  assertSfiCaseActionTransition,
  type SfiCaseActionDecision,
  type SfiCaseActionReversibility,
  type SfiCaseActionRisk,
  type SfiCaseActionStatus,
} from '@/core/case-platform';
import type { SfiCanonicalRef } from '@/core/contracts/sfi';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { recordOperationalCaseObject } from './repository';
import { assertCaseReferenceIntegrity, readCaseAuthorityRole } from './integrity';

type Row = Record<string, unknown>;

function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function canonicalRef(value: unknown): SfiCanonicalRef {
  const row = object(value);
  return { id: text(row.id), version: text(row.version) || null, hash: text(row.hash) || null };
}

function proposalFromRow(row: Row) {
  return {
    id: text(row.id),
    caseId: text(row.case_id),
    tenantId: text(row.tenant_id),
    recommendationRef: canonicalRef(row.recommendation_ref),
    action: object(row.action_payload),
    riskLevel: text(row.risk_level) as SfiCaseActionRisk,
    reversibility: text(row.reversibility) as SfiCaseActionReversibility,
    status: text(row.status) as SfiCaseActionStatus,
    proposedBy: text(row.proposed_by),
    interventionRef: row.intervention_ref ? canonicalRef(row.intervention_ref) : null,
    returnRef: row.return_ref ? canonicalRef(row.return_ref) : null,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

async function proposalRow(caseId: string, proposalId: string) {
  const service = createServiceSupabaseClient();
  const result = await service.from('sfi_case_action_proposals').select('*').eq('id', proposalId).eq('case_id', caseId).maybeSingle();
  if (result.error) throw new Error(`SFI_CASE_ACTION_READ_FAILED:${result.error.message}`);
  if (!result.data) throw new Error('SFI_CASE_ACTION_NOT_FOUND');
  return result.data as Row;
}

async function audit(caseId: string, tenantId: string, actorId: string, action: string, afterState: unknown) {
  const service = createServiceSupabaseClient();
  const result = await service.from('sfi_case_audit_events').insert({ case_id: caseId, tenant_id: tenantId, actor_id: actorId, action, after_state: afterState, context: { contract: 'SFI-CASE-ACTION-1.0' } });
  if (result.error) throw new Error(`SFI_CASE_ACTION_AUDIT_FAILED:${result.error.message}`);
}

export async function listCaseActionProposals(caseId: string, userId: string) {
  await readCaseAuthorityRole(caseId, userId);
  const service = createServiceSupabaseClient();
  const result = await service.from('sfi_case_action_proposals').select('*').eq('case_id', caseId).order('created_at', { ascending: true });
  if (result.error) throw new Error(`SFI_CASE_ACTION_LIST_FAILED:${result.error.message}`);
  return ((result.data ?? []) as Row[]).map(proposalFromRow);
}

export async function createCaseActionProposal(input: {
  caseId: string;
  userId: string;
  recommendationRef: SfiCanonicalRef;
  action: string;
  details?: Record<string, unknown>;
  riskLevel: SfiCaseActionRisk;
  reversibility: SfiCaseActionReversibility;
}) {
  const authority = await readCaseAuthorityRole(input.caseId, input.userId);
  if (!['OWNER','ADMIN','OPERATOR'].includes(authority.role)) throw new Error('SFI_TENANT_WRITE_FORBIDDEN');
  if (['CLOSED','REJECTED'].includes(authority.status)) throw new Error(`SFI_CASE_ACTION_PROPOSAL_FORBIDDEN:${authority.status}`);
  await assertCaseReferenceIntegrity({ caseId: input.caseId, userId: input.userId, recommendationRefs: [input.recommendationRef] });
  if (!input.action.trim()) throw new Error('SFI_CASE_ACTION_REQUIRED');
  const service = createServiceSupabaseClient();
  const inserted = await service.from('sfi_case_action_proposals').insert({
    case_id: input.caseId,
    owner_id: authority.ownerId,
    tenant_id: authority.tenantId,
    recommendation_ref: input.recommendationRef,
    action_payload: { action: input.action.trim(), details: input.details ?? {}, externalExecutionRequested: false },
    risk_level: input.riskLevel,
    reversibility: input.reversibility,
    status: 'PENDING',
    proposed_by: input.userId,
  }).select('*').single();
  if (inserted.error || !inserted.data) throw new Error(`SFI_CASE_ACTION_PROPOSAL_WRITE_FAILED:${inserted.error?.message ?? 'unknown'}`);
  const proposal = proposalFromRow(inserted.data as Row);
  await audit(input.caseId, authority.tenantId, input.userId, 'CASE_ACTION_PROPOSED', proposal);
  return proposal;
}

export async function decideCaseActionProposal(input: {
  caseId: string;
  proposalId: string;
  userId: string;
  decision: SfiCaseActionDecision;
  rationale?: string | null;
}) {
  const authority = await readCaseAuthorityRole(input.caseId, input.userId);
  if (!['OWNER','ADMIN'].includes(authority.role)) throw new Error('SFI_CASE_ACTION_AUTHORITY_REQUIRED');
  const row = await proposalRow(input.caseId, input.proposalId);
  const proposal = proposalFromRow(row);
  const next: SfiCaseActionStatus = input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  assertSfiCaseActionTransition(proposal.status, next);
  const service = createServiceSupabaseClient();
  const updated = await service.from('sfi_case_action_proposals').update({ status: next }).eq('id', input.proposalId).eq('status', 'PENDING').select('*').maybeSingle();
  if (updated.error || !updated.data) throw new Error(`SFI_CASE_ACTION_DECISION_CONFLICT:${updated.error?.message ?? 'status_changed'}`);
  const decisionInsert = await service.from('sfi_case_action_decisions').insert({
    proposal_id: input.proposalId,
    case_id: input.caseId,
    tenant_id: authority.tenantId,
    decision: input.decision,
    authority_role: authority.role,
    decided_by: input.userId,
    rationale: input.rationale?.trim() || null,
  }).select('id').single();
  if (decisionInsert.error || !decisionInsert.data?.id) {
    await service.from('sfi_case_action_proposals').update({ status: 'PENDING' }).eq('id', input.proposalId).eq('status', next);
    throw new Error(`SFI_CASE_ACTION_DECISION_WRITE_FAILED:${decisionInsert.error?.message ?? 'unknown'}`);
  }
  const result = proposalFromRow(updated.data as Row);
  await audit(input.caseId, authority.tenantId, input.userId, `CASE_ACTION_${next}`, { proposalId: input.proposalId, decisionId: String(decisionInsert.data.id), authorityRole: authority.role });
  return result;
}

export async function recordApprovedCaseIntervention(input: {
  caseId: string;
  proposalId: string;
  userId: string;
  observedAt: string;
  executionDetails?: Record<string, unknown>;
}) {
  const authority = await readCaseAuthorityRole(input.caseId, input.userId);
  if (!['OWNER','ADMIN','OPERATOR'].includes(authority.role)) throw new Error('SFI_TENANT_WRITE_FORBIDDEN');
  const proposal = proposalFromRow(await proposalRow(input.caseId, input.proposalId));
  assertSfiCaseActionTransition(proposal.status, 'EXECUTED');
  if (Number.isNaN(Date.parse(input.observedAt))) throw new Error('SFI_CASE_INTERVENTION_TIME_INVALID');
  const interventionRef: SfiCanonicalRef = { id: `case-intervention:${input.proposalId}`, version: '1.0', hash: null };
  const intervention = await recordOperationalCaseObject({
    caseId: input.caseId,
    userId: input.userId,
    kind: 'INTERVENTION',
    epistemicRole: 'RECORD',
    canonicalRef: interventionRef,
    payload: {
      contract: 'SFI-CASE-ACTION-1.0',
      proposalId: input.proposalId,
      recommendationRef: proposal.recommendationRef,
      approved: true,
      action: proposal.action,
      executionDetails: input.executionDetails ?? {},
      platformPerformedExternalAction: false,
    },
    observedAt: input.observedAt,
  });
  const service = createServiceSupabaseClient();
  const updated = await service.from('sfi_case_action_proposals').update({ status: 'EXECUTED', intervention_ref: intervention.canonicalRef }).eq('id', input.proposalId).eq('status', 'APPROVED').select('*').maybeSingle();
  if (updated.error || !updated.data) throw new Error(`SFI_CASE_INTERVENTION_STATE_WRITE_FAILED:${updated.error?.message ?? 'status_changed'}`);
  await audit(input.caseId, authority.tenantId, input.userId, 'CASE_INTERVENTION_RECORDED', { proposalId: input.proposalId, recommendationRef: proposal.recommendationRef, interventionRef: intervention.canonicalRef, platformPerformedExternalAction: false });
  return { proposal: proposalFromRow(updated.data as Row), intervention };
}

export async function recordCaseActionReturn(input: {
  caseId: string;
  proposalId: string;
  userId: string;
  observedAt: string;
  outcome: string;
  measurements?: Record<string, unknown>;
}) {
  const authority = await readCaseAuthorityRole(input.caseId, input.userId);
  if (!['OWNER','ADMIN','OPERATOR'].includes(authority.role)) throw new Error('SFI_TENANT_WRITE_FORBIDDEN');
  const proposal = proposalFromRow(await proposalRow(input.caseId, input.proposalId));
  assertSfiCaseActionTransition(proposal.status, 'RETURN_RECORDED');
  if (!proposal.interventionRef) throw new Error('SFI_CASE_RETURN_INTERVENTION_REQUIRED');
  if (Number.isNaN(Date.parse(input.observedAt))) throw new Error('SFI_CASE_RETURN_TIME_INVALID');
  if (!input.outcome.trim()) throw new Error('SFI_CASE_RETURN_OUTCOME_REQUIRED');
  await assertCaseReferenceIntegrity({ caseId: input.caseId, userId: input.userId, interventionRefs: [proposal.interventionRef] });
  const returnRef: SfiCanonicalRef = { id: `case-return:${input.proposalId}`, version: '1.0', hash: null };
  const returnRecord = await recordOperationalCaseObject({
    caseId: input.caseId,
    userId: input.userId,
    kind: 'RETURN',
    epistemicRole: 'RECORD',
    canonicalRef: returnRef,
    recordRefs: [proposal.interventionRef],
    payload: {
      contract: 'SFI-CASE-ACTION-1.0',
      proposalId: input.proposalId,
      interventionRef: proposal.interventionRef,
      outcome: input.outcome.trim(),
      measurements: input.measurements ?? {},
      causalEffectClaimed: false,
    },
    observedAt: input.observedAt,
  });
  const service = createServiceSupabaseClient();
  const updated = await service.from('sfi_case_action_proposals').update({ status: 'RETURN_RECORDED', return_ref: returnRecord.canonicalRef }).eq('id', input.proposalId).eq('status', 'EXECUTED').select('*').maybeSingle();
  if (updated.error || !updated.data) throw new Error(`SFI_CASE_RETURN_STATE_WRITE_FAILED:${updated.error?.message ?? 'status_changed'}`);
  await audit(input.caseId, authority.tenantId, input.userId, 'CASE_RETURN_RECORDED', { proposalId: input.proposalId, returnRef: returnRecord.canonicalRef, causalEffectClaimed: false });
  return { proposal: proposalFromRow(updated.data as Row), returnRecord };
}
