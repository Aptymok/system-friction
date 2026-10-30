import 'server-only';

import type {
  SfiCanonicalRef,
  SfiReportClaimV1,
  SfiServiceProfileId,
} from '@/core/contracts/sfi';
import {
  SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT,
  type SfiEnterpriseEntityRef,
  type SfiSystemAiEntityRef,
} from '@/core/case-platform';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;
type TenantRole = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER' | 'AUDITOR';
type TypedEntityRef = SfiCanonicalRef & { entityType: string };

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function refId(value: unknown) {
  return text(object(value).id);
}

function refVersion(value: unknown) {
  return text(object(value).version) || null;
}

function refHash(value: unknown) {
  return text(object(value).hash) || null;
}

function canonicalRefs(value: unknown): SfiCanonicalRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const row = object(item);
    const id = text(row.id);
    if (!id) return [];
    return [{ id, version: text(row.version) || null, hash: text(row.hash) || null }];
  });
}

function sameRef(candidate: SfiCanonicalRef, expected: SfiCanonicalRef) {
  if (candidate.id !== expected.id) return false;
  if (expected.version && candidate.version !== expected.version) return false;
  if (expected.hash && candidate.hash !== expected.hash) return false;
  return true;
}

async function accessContext(caseId: string, userId: string, mode: 'READ' | 'WRITE' = 'READ') {
  const service = createServiceSupabaseClient();
  const caseResult = await service
    .from('sfi_cases')
    .select('id,owner_id,tenant_id,status,service_profile_id')
    .eq('id', caseId)
    .is('deleted_at', null)
    .maybeSingle();
  if (caseResult.error) throw new Error(`SFI_CASE_INTEGRITY_CASE_READ_FAILED:${caseResult.error.message}`);
  if (!caseResult.data) throw new Error('SFI_CASE_NOT_FOUND');

  const membership = await service
    .from('sfi_tenant_members')
    .select('role,status')
    .eq('tenant_id', caseResult.data.tenant_id)
    .eq('user_id', userId)
    .maybeSingle();
  if (membership.error) throw new Error(`SFI_CASE_INTEGRITY_MEMBERSHIP_READ_FAILED:${membership.error.message}`);
  if (!membership.data || membership.data.status !== 'ACTIVE') throw new Error('SFI_TENANT_FORBIDDEN');

  const role = String(membership.data.role) as TenantRole;
  if (mode === 'WRITE' && !['OWNER', 'ADMIN', 'OPERATOR'].includes(role)) throw new Error('SFI_TENANT_WRITE_FORBIDDEN');
  return {
    tenantId: String(caseResult.data.tenant_id),
    ownerId: String(caseResult.data.owner_id),
    status: String(caseResult.data.status),
    serviceProfileId: String(caseResult.data.service_profile_id) as SfiServiceProfileId,
    role,
  };
}

async function caseObjects(caseId: string) {
  const service = createServiceSupabaseClient();
  const result = await service
    .from('sfi_case_objects')
    .select('object_kind,epistemic_role,canonical_ref,source_refs,record_refs,evidence_refs,payload')
    .eq('case_id', caseId);
  if (result.error) throw new Error(`SFI_CASE_INTEGRITY_OBJECT_READ_FAILED:${result.error.message}`);
  return (result.data ?? []) as Row[];
}

function matchingRow(rows: Row[], ref: SfiCanonicalRef, predicate: (row: Row) => boolean) {
  return rows.find((row) => {
    if (refId(row.canonical_ref) !== ref.id) return false;
    const expectedVersion = ref.version?.trim() || null;
    if (expectedVersion && refVersion(row.canonical_ref) !== expectedVersion) return false;
    const expectedHash = ref.hash?.trim() || null;
    if (expectedHash && refHash(row.canonical_ref) !== expectedHash) return false;
    return predicate(row);
  });
}

function assertRefs(rows: Row[], refs: SfiCanonicalRef[], label: string, predicate: (row: Row) => boolean) {
  for (const ref of refs) {
    if (!matchingRow(rows, ref, predicate)) throw new Error(`SFI_CASE_REFERENCE_NOT_FOUND:${label}:${ref.id}`);
  }
}

export async function assertCaseReferenceIntegrity(input: {
  caseId: string;
  userId: string;
  sourceRefs?: SfiCanonicalRef[];
  recordRefs?: SfiCanonicalRef[];
  evidenceRefs?: SfiCanonicalRef[];
  assessmentRefs?: SfiCanonicalRef[];
  recommendationRefs?: SfiCanonicalRef[];
  interventionRefs?: SfiCanonicalRef[];
  contradictionRefs?: SfiCanonicalRef[];
}) {
  await accessContext(input.caseId, input.userId, 'READ');
  const rows = await caseObjects(input.caseId);
  assertRefs(rows, input.sourceRefs ?? [], 'SOURCE', (row) => text(row.object_kind) === 'SOURCE' && text(row.epistemic_role) === 'SOURCE');
  assertRefs(rows, input.recordRefs ?? [], 'RECORD', (row) => text(row.epistemic_role) === 'RECORD');
  assertRefs(rows, input.evidenceRefs ?? [], 'EVIDENCE', (row) => text(row.object_kind) === 'EVIDENCE' && text(row.epistemic_role) === 'EVIDENCE');
  assertRefs(rows, input.assessmentRefs ?? [], 'EPISTEMIC_ASSESSMENT', (row) => text(row.object_kind) === 'EPISTEMIC_ASSESSMENT' && text(row.epistemic_role) === 'EPISTEMIC_ASSESSMENT');
  assertRefs(rows, input.recommendationRefs ?? [], 'RECOMMENDATION', (row) => text(row.object_kind) === 'RECOMMENDATION');
  assertRefs(rows, input.interventionRefs ?? [], 'INTERVENTION', (row) => text(row.object_kind) === 'INTERVENTION' && text(row.epistemic_role) === 'RECORD');
  assertRefs(rows, input.contradictionRefs ?? [], 'CONTRADICTION', (row) => text(row.object_kind) === 'CONTRADICTION');
  return true;
}

async function resolveTenantTypedEntityRefs(input: {
  caseId: string;
  userId: string;
  entityRefs: TypedEntityRef[];
  errorCode: string;
  domainContract?: string;
}) {
  const context = await accessContext(input.caseId, input.userId, 'READ');
  if (!input.entityRefs.length) return [] as TypedEntityRef[];
  const service = createServiceSupabaseClient();
  const ids = [...new Set(input.entityRefs.map((ref) => ref.id))];
  const result = await service.from('sfi_case_objects').select('canonical_ref,payload').eq('tenant_id', context.tenantId).in('canonical_ref->>id', ids);
  if (result.error) throw new Error(`${input.errorCode}_READ_FAILED:${result.error.message}`);
  const rows = (result.data ?? []) as Row[];
  return input.entityRefs.map((ref) => {
    const candidates = rows.filter((row) => {
      if (refId(row.canonical_ref) !== ref.id) return false;
      const expectedVersion = ref.version?.trim() || null;
      if (expectedVersion && refVersion(row.canonical_ref) !== expectedVersion) return false;
      const expectedHash = ref.hash?.trim() || null;
      if (expectedHash && refHash(row.canonical_ref) !== expectedHash) return false;
      const payload = object(row.payload);
      if (text(payload.entityType) !== ref.entityType) return false;
      if (input.domainContract && text(payload.contract) !== input.domainContract) return false;
      return true;
    });
    const identities = [...new Map(candidates.map((row) => {
      const stored = { id: refId(row.canonical_ref), version: refVersion(row.canonical_ref), hash: refHash(row.canonical_ref), entityType: ref.entityType };
      return [`${stored.id}|${stored.version ?? ''}|${stored.hash ?? ''}`, stored] as const;
    })).values()];
    if (!identities.length) throw new Error(`${input.errorCode}:${ref.entityType}:${ref.id}`);
    if (identities.length > 1) throw new Error(`${input.errorCode}_AMBIGUOUS:${ref.entityType}:${ref.id}`);
    return identities[0];
  });
}

export async function assertTenantEnterpriseEntityRefs(input: { caseId: string; userId: string; entityRefs: SfiEnterpriseEntityRef[] }) {
  await resolveTenantTypedEntityRefs({ ...input, errorCode: 'SFI_ENTERPRISE_ENTITY_REFERENCE_NOT_FOUND' });
  return true;
}

export async function resolveTenantSystemAiEntityRefs(input: { caseId: string; userId: string; entityRefs: SfiSystemAiEntityRef[] }) {
  return await resolveTenantTypedEntityRefs({ ...input, errorCode: 'SFI_SYSTEM_AI_ENTITY_REFERENCE_NOT_FOUND', domainContract: SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT }) as SfiSystemAiEntityRef[];
}

export async function assertTenantSystemAiEntityRefs(input: { caseId: string; userId: string; entityRefs: SfiSystemAiEntityRef[] }) {
  await resolveTenantSystemAiEntityRefs(input);
  return true;
}

export async function assertCaseServiceProfileAllowed(caseId: string, userId: string, allowed: readonly SfiServiceProfileId[]) {
  const context = await accessContext(caseId, userId, 'READ');
  if (!(allowed as readonly string[]).includes(context.serviceProfileId)) throw new Error(`SFI_CASE_SERVICE_PROFILE_FORBIDDEN:${context.serviceProfileId}`);
  return context.serviceProfileId;
}

export async function assertTenderAssessmentPrerequisites(input: {
  caseId: string;
  userId: string;
  requirementRef: SfiEnterpriseEntityRef;
  bidderRef: SfiEnterpriseEntityRef;
  sourceRefs: SfiCanonicalRef[];
  recordRefs?: SfiCanonicalRef[];
  evidenceRefs?: SfiCanonicalRef[];
}) {
  if (input.requirementRef.entityType !== 'REQUIREMENT') throw new Error('SFI_TENDER_REQUIREMENT_REF_TYPE_INVALID');
  if (input.bidderRef.entityType !== 'BIDDER') throw new Error('SFI_TENDER_BIDDER_REF_TYPE_INVALID');
  await assertCaseReferenceIntegrity({ caseId: input.caseId, userId: input.userId, sourceRefs: input.sourceRefs, recordRefs: input.recordRefs, evidenceRefs: input.evidenceRefs });
  await assertTenantEnterpriseEntityRefs({ caseId: input.caseId, userId: input.userId, entityRefs: [input.requirementRef, input.bidderRef] });
  const rows = await caseObjects(input.caseId);
  const requirement = rows.find((row) => refId(row.canonical_ref) === input.requirementRef.id
    && (!input.requirementRef.version || refVersion(row.canonical_ref) === input.requirementRef.version)
    && (!input.requirementRef.hash || refHash(row.canonical_ref) === input.requirementRef.hash)
    && text(object(row.payload).entityType) === 'REQUIREMENT');
  if (!requirement) throw new Error('SFI_TENDER_REQUIREMENT_NOT_IN_CASE');
  if (object(requirement.payload).frozenBeforeEvaluation !== true) throw new Error('SFI_TENDER_REQUIREMENT_NOT_FROZEN');
  return true;
}

function evidenceReachesClaimedSource(rows: Row[], evidenceRef: SfiCanonicalRef, sourceRefs: SfiCanonicalRef[]) {
  const evidence = matchingRow(rows, evidenceRef, (row) => text(row.object_kind) === 'EVIDENCE' && text(row.epistemic_role) === 'EVIDENCE');
  if (!evidence) return false;
  const directSources = canonicalRefs(evidence.source_refs);
  if (directSources.some((candidate) => sourceRefs.some((sourceRef) => sameRef(candidate, sourceRef)))) return true;

  for (const recordRef of canonicalRefs(evidence.record_refs)) {
    const record = matchingRow(rows, recordRef, (row) => text(row.epistemic_role) === 'RECORD');
    if (!record) continue;
    const recordSources = canonicalRefs(record.source_refs);
    if (recordSources.some((candidate) => sourceRefs.some((sourceRef) => sameRef(candidate, sourceRef)))) return true;
  }
  return false;
}

async function assertClaimExecutionLineage(caseId: string, claim: SfiReportClaimV1) {
  const lineage = claim.lineage;
  if (!lineage) return;

  if (!lineage.executionRef) {
    if (lineage.outputRelation !== 'NOT_EXECUTED') throw new Error(`SFI_REPORT_LINEAGE_EXECUTION_REQUIRED:${claim.id}`);
    if (!['UNSUPPORTED', 'INSUFFICIENT'].includes(lineage.support)) throw new Error(`SFI_REPORT_LINEAGE_SUPPORT_REQUIRES_EXECUTION:${claim.id}`);
    return;
  }

  const { readExecutionRecords } = await import('@/lib/sfi/cognitive-runtime/executionRecords');
  const executionRead = await readExecutionRecords({ executionId: lineage.executionRef.id, limit: 500 });
  const execution = executionRead.records.find((record) => record.executionId === lineage.executionRef?.id) ?? null;
  if (!execution) throw new Error(`SFI_REPORT_EXECUTION_NOT_OBSERVED_IN_BOUNDED_WINDOW:${lineage.executionRef.id}`);

  const belongsToCase = [...execution.anchors, ...execution.targets].some((ref) => ref.kind === 'CASE' && ref.id === caseId);
  if (!belongsToCase) throw new Error(`SFI_REPORT_EXECUTION_NOT_BOUND_TO_CASE:${claim.id}:${lineage.executionRef.id}`);

  if (lineage.outputRelation !== 'NOT_EXECUTED' && !execution.executed) throw new Error(`SFI_REPORT_OUTPUT_REQUIRES_EXECUTED_RUN:${claim.id}`);
  if (execution.requestedOutputsObservation === 'OBSERVED'
    && lineage.outputRelation !== 'NOT_EXECUTED'
    && !execution.requestedOutputs.includes(lineage.outputRelation)) {
    throw new Error(`SFI_REPORT_OUTPUT_NOT_REQUESTED:${claim.id}:${lineage.outputRelation}`);
  }

  if (lineage.support === 'SUPPORTED') {
    if (!execution.executed || lineage.outputRelation === 'NOT_EXECUTED') throw new Error(`SFI_REPORT_SUPPORTED_CLAIM_REQUIRES_EXECUTED_OUTPUT:${claim.id}`);
    if (execution.requestedOutputsObservation !== 'OBSERVED') throw new Error(`SFI_REPORT_SUPPORTED_CLAIM_OUTPUT_NOT_OBSERVED:${claim.id}`);
    if (!claim.evidenceRefs.length || !claim.sourceRefs.length) throw new Error(`SFI_REPORT_SUPPORTED_CLAIM_REQUIRES_EVIDENCE_SOURCE_LINEAGE:${claim.id}`);
    if (claim.determinability === 'UNDETERMINED') throw new Error(`SFI_REPORT_SUPPORTED_CLAIM_CANNOT_BE_UNDETERMINED:${claim.id}`);
  }

  if (lineage.support === 'CONTRADICTED' && !lineage.contradictionRefs.length) {
    throw new Error(`SFI_REPORT_CONTRADICTED_CLAIM_REQUIRES_CONTRADICTION:${claim.id}`);
  }
}

export async function assertReportClaimsIntegrity(input: { caseId: string; userId: string; claims: SfiReportClaimV1[] }) {
  await accessContext(input.caseId, input.userId, 'READ');
  const rows = await caseObjects(input.caseId);

  for (const claim of input.claims) {
    await assertCaseReferenceIntegrity({
      caseId: input.caseId,
      userId: input.userId,
      assessmentRefs: [claim.assessmentRef],
      evidenceRefs: claim.evidenceRefs,
      recordRefs: claim.recordRefs,
      sourceRefs: claim.sourceRefs,
      contradictionRefs: claim.lineage?.contradictionRefs ?? [],
    });

    await assertClaimExecutionLineage(input.caseId, claim);

    if (claim.lineage && ['SUPPORTED', 'PARTIALLY_SUPPORTED'].includes(claim.lineage.support)) {
      if (!claim.evidenceRefs.length || !claim.sourceRefs.length) {
        throw new Error(`SFI_REPORT_CLAIM_REQUIRES_EVIDENCE_SOURCE_LINEAGE:${claim.id}`);
      }
      for (const evidenceRef of claim.evidenceRefs) {
        if (!evidenceReachesClaimedSource(rows, evidenceRef, claim.sourceRefs)) {
          throw new Error(`SFI_REPORT_EVIDENCE_SOURCE_LINEAGE_NOT_ESTABLISHED:${claim.id}:${evidenceRef.id}`);
        }
      }
    }
  }
  return true;
}

export async function readCaseAuthorityRole(caseId: string, userId: string) {
  const context = await accessContext(caseId, userId, 'READ');
  return { tenantId: context.tenantId, ownerId: context.ownerId, role: context.role, status: context.status, serviceProfileId: context.serviceProfileId };
}
