import 'server-only';

import {
  SFI_ENTERPRISE_RELATION_TYPES,
  validateEnterpriseRelationDraft,
  type SfiEnterpriseEntityRef,
  type SfiEnterpriseRelationDraft,
  type SfiEnterpriseRelationEpistemicRole,
  type SfiEnterpriseRelationType,
} from '@/core/case-platform';
import type { SfiCanonicalRef } from '@/core/contracts/sfi';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { assertCaseServiceProfileAllowed } from './integrity';

const ENTERPRISE_PROFILES = ['SERVICE_OBSERVABILITY','CONTRACT_WARRANTY_ASSURANCE','TENDER_ASSURANCE','ENTERPRISE_MEMORY','CUSTOM_RESEARCH'] as const;
type Row = Record<string, unknown>;
type TenantRole = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER' | 'AUDITOR';

function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function refs(value: unknown): SfiCanonicalRef[] { if (!Array.isArray(value)) return []; return value.map((item) => { const row = object(item); return { id: text(row.id), version: text(row.version) || null, hash: text(row.hash) || null }; }).filter((ref) => ref.id); }
function entityRef(value: unknown): SfiEnterpriseEntityRef { const row = object(value); return { id: text(row.id), version: text(row.version) || null, hash: text(row.hash) || null, entityType: text(row.entityType) as SfiEnterpriseEntityRef['entityType'] }; }

async function caseContext(caseId: string, userId: string, mode: 'READ' | 'WRITE') {
  await assertCaseServiceProfileAllowed(caseId, userId, [...ENTERPRISE_PROFILES]);
  const service = createServiceSupabaseClient();
  const caseResult = await service.from('sfi_cases').select('id,owner_id,tenant_id,status').eq('id', caseId).is('deleted_at', null).maybeSingle();
  if (caseResult.error) throw new Error(`SFI_ENTERPRISE_CASE_READ_FAILED:${caseResult.error.message}`);
  if (!caseResult.data) throw new Error('SFI_CASE_NOT_FOUND');
  const membership = await service.from('sfi_tenant_members').select('role,status').eq('tenant_id', caseResult.data.tenant_id).eq('user_id', userId).maybeSingle();
  if (membership.error) throw new Error(`SFI_ENTERPRISE_MEMBERSHIP_READ_FAILED:${membership.error.message}`);
  if (!membership.data || membership.data.status !== 'ACTIVE') throw new Error('SFI_TENANT_FORBIDDEN');
  const role = String(membership.data.role) as TenantRole;
  if (mode === 'WRITE' && !['OWNER','ADMIN','OPERATOR'].includes(role)) throw new Error('SFI_TENANT_WRITE_FORBIDDEN');
  return { caseId, ownerId: String(caseResult.data.owner_id), tenantId: String(caseResult.data.tenant_id), status: String(caseResult.data.status), role };
}

async function assertTenantRead(tenantId: string, userId: string) {
  const service = createServiceSupabaseClient();
  const membership = await service.from('sfi_tenant_members').select('role,status').eq('tenant_id', tenantId).eq('user_id', userId).maybeSingle();
  if (membership.error) throw new Error(`SFI_ENTERPRISE_MEMBERSHIP_READ_FAILED:${membership.error.message}`);
  if (!membership.data || membership.data.status !== 'ACTIVE') throw new Error('SFI_TENANT_FORBIDDEN');
}

function relationFromRow(row: Row) {
  return { id: text(row.id), relationKey: text(row.relation_key), caseId: text(row.case_id), tenantId: text(row.tenant_id), relationType: text(row.relation_type) as SfiEnterpriseRelationType, epistemicRole: text(row.epistemic_role) as SfiEnterpriseRelationEpistemicRole, from: entityRef(row.from_ref), to: entityRef(row.to_ref), sourceRefs: refs(row.source_refs), recordRefs: refs(row.record_refs), evidenceRefs: refs(row.evidence_refs), payload: object(row.payload), observedAt: text(row.observed_at) || null, createdAt: text(row.created_at) };
}

export async function recordOperationalEnterpriseRelation(input: { caseId: string; userId: string; relation: SfiEnterpriseRelationDraft }) {
  const context = await caseContext(input.caseId, input.userId, 'WRITE');
  if (['CLOSED','REJECTED'].includes(context.status)) throw new Error(`SFI_ENTERPRISE_RELATION_WRITE_FORBIDDEN:${context.status}`);
  const violations = validateEnterpriseRelationDraft(input.relation);
  if (violations.length) throw new Error(`SFI_ENTERPRISE_RELATION_INVALID:${violations.join(',')}`);
  const service = createServiceSupabaseClient();
  const existing = await service.from('sfi_case_relations').select('*').eq('case_id', input.caseId).eq('relation_key', input.relation.relationKey).maybeSingle();
  if (existing.error) throw new Error(`SFI_ENTERPRISE_RELATION_IDENTITY_READ_FAILED:${existing.error.message}`);
  if (existing.data) { const row = relationFromRow(existing.data as Row); if (row.relationType === input.relation.relationType && row.from.id === input.relation.from.id && row.to.id === input.relation.to.id && row.epistemicRole === input.relation.epistemicRole) return row; throw new Error('SFI_ENTERPRISE_RELATION_KEY_CONFLICT'); }
  const inserted = await service.from('sfi_case_relations').insert({ relation_key: input.relation.relationKey, case_id: input.caseId, owner_id: context.ownerId, tenant_id: context.tenantId, relation_type: input.relation.relationType, epistemic_role: input.relation.epistemicRole, from_ref: input.relation.from, to_ref: input.relation.to, source_refs: input.relation.sourceRefs ?? [], record_refs: input.relation.recordRefs ?? [], evidence_refs: input.relation.evidenceRefs ?? [], payload: input.relation.payload ?? {}, observed_at: input.relation.observedAt ?? null }).select('*').single();
  if (inserted.error || !inserted.data) throw new Error(`SFI_ENTERPRISE_RELATION_WRITE_FAILED:${inserted.error?.message ?? 'unknown'}`);
  const result = relationFromRow(inserted.data as Row);
  const audit = await service.from('sfi_case_audit_events').insert({ case_id: input.caseId, tenant_id: context.tenantId, actor_id: input.userId, action: 'ENTERPRISE_RELATION_RECORDED', after_state: { relationKey: result.relationKey, relationType: result.relationType, epistemicRole: result.epistemicRole, from: result.from, to: result.to }, context: { contract: 'SFI-ENTERPRISE-ASSURANCE-DOMAIN-1.0' } });
  if (audit.error) throw new Error(`SFI_ENTERPRISE_RELATION_AUDIT_FAILED:${audit.error.message}`);
  return result;
}

export async function listOperationalEnterpriseRelations(caseId: string, userId: string) {
  await caseContext(caseId, userId, 'READ');
  const service = createServiceSupabaseClient();
  const result = await service.from('sfi_case_relations').select('*').eq('case_id', caseId).in('relation_type', [...SFI_ENTERPRISE_RELATION_TYPES]).order('created_at', { ascending: true });
  if (result.error) throw new Error(`SFI_ENTERPRISE_RELATION_LIST_FAILED:${result.error.message}`);
  return ((result.data ?? []) as Row[]).map(relationFromRow);
}

export async function listTenantEnterpriseRelations(tenantId: string, userId: string) {
  await assertTenantRead(tenantId, userId);
  const service = createServiceSupabaseClient();
  const result = await service.from('sfi_case_relations').select('*').eq('tenant_id', tenantId).in('relation_type', [...SFI_ENTERPRISE_RELATION_TYPES]).order('created_at', { ascending: true });
  if (result.error) throw new Error(`SFI_ENTERPRISE_TENANT_GRAPH_FAILED:${result.error.message}`);
  return ((result.data ?? []) as Row[]).map(relationFromRow);
}