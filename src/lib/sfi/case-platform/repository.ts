import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import {
  assembleSfiReportV1,
  assertSfiCaseTransition,
  createSfiCaseV1,
  getSfiServiceProfile,
  normalizeSfiCaseSourceIntake,
  validateSfiCaseObjectDraft,
  type NormalizedSfiCaseSource,
  type SfiCaseObjectDraft,
  type SfiCaseObjectKind,
} from '@/core/case-platform';
import type {
  SfiCanonicalRef,
  SfiCaseStatus,
  SfiCaseV1,
  SfiEpistemicClass,
  SfiReportClaimV1,
  SfiReportDeliveryFormat,
  SfiReportV1,
  SfiServiceProfileId,
  SfiTemporalBasis,
  SfiTemporalMode,
  SfiTemporalWindowV1,
} from '@/core/contracts/sfi';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type SfiTenantRole = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER' | 'AUDITOR';
export type SfiTenantType = 'PERSONAL' | 'CLIENT' | 'INTERNAL' | 'RESEARCH';

type Row = Record<string, unknown>;

export type OperationalCaseObject = {
  id: string;
  caseId: string;
  tenantId: string;
  kind: SfiCaseObjectKind;
  epistemicRole: SfiEpistemicClass;
  canonicalRef: SfiCanonicalRef;
  sourceRefs: SfiCanonicalRef[];
  recordRefs: SfiCanonicalRef[];
  evidenceRefs: SfiCanonicalRef[];
  payload: Record<string, unknown>;
  observedAt: string | null;
  createdAt: string;
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableText(value: unknown): string | null {
  const valueText = text(value);
  return valueText || null;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function canonicalRef(value: unknown): SfiCanonicalRef {
  const row = record(value);
  const id = text(row.id);
  if (!id) throw new Error('SFI_CASE_CORRUPT_CANONICAL_REF');
  return {
    id,
    version: nullableText(row.version),
    hash: nullableText(row.hash),
  };
}

function canonicalRefs(value: unknown): SfiCanonicalRef[] {
  if (!Array.isArray(value)) return [];
  return value.map(canonicalRef);
}

function temporalWindow(value: unknown): SfiTemporalWindowV1 {
  const row = record(value);
  const cutoff = text(row.cutoff);
  if (!cutoff) throw new Error('SFI_CASE_CORRUPT_TEMPORAL_WINDOW');
  return {
    mode: text(row.mode) as SfiTemporalMode,
    basis: text(row.basis) as SfiTemporalBasis,
    start: nullableText(row.start),
    end: nullableText(row.end),
    cutoff,
    timezone: text(row.timezone) || 'UTC',
    reconstructionAsOf: nullableText(row.reconstructionAsOf),
    horizon: nullableText(row.horizon),
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

function semanticHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');
}

function caseFromRow(row: Row): SfiCaseV1 {
  const uncertainty = record(row.uncertainty);
  const determinabilityRaw = text(uncertainty.determinability);
  const determinability = determinabilityRaw === 'DETERMINED' || determinabilityRaw === 'PARTIALLY_DETERMINED'
    ? determinabilityRaw
    : 'UNDETERMINED';

  return {
    contract: 'SFI-CASE-1.0',
    id: text(row.id),
    version: text(row.version) || '1.0',
    tenantId: text(row.tenant_id),
    clientId: nullableText(row.client_id),
    serviceProfileId: text(row.service_profile_id) as SfiServiceProfileId,
    subject: text(row.subject),
    scope: text(row.scope),
    systemBoundaryRef: canonicalRef(row.system_boundary_ref),
    temporalWindow: temporalWindow(row.temporal_window),
    sourceRefs: [],
    recordRefs: [],
    evidenceRefs: [],
    systemModelRefs: [],
    observationRefs: [],
    frictionRefs: [],
    perturbationRefs: [],
    trajectoryRefs: [],
    attractorRefs: [],
    epistemicAssessmentRefs: [],
    hypothesisRefs: [],
    instrumentRunRefs: [],
    analysisRefs: [],
    recommendationRefs: [],
    interventionRefs: [],
    returnRefs: [],
    reportRefs: [],
    lineage: {
      parentCaseRefs: [],
      sourceCutoff: text(record(row.lineage).sourceCutoff) || temporalWindow(row.temporal_window).cutoff,
    },
    uncertainty: {
      determinability,
      confidence: numberOrNull(uncertainty.confidence),
      unresolvedQuestionRefs: [],
      contradictionRefs: [],
    },
    governance: {
      rootAddressable: false,
      institutionalAdmission: 'GATED',
      actionRequiresGovernance: true,
      governanceDecisionRefs: [],
    },
    status: text(row.status) as SfiCaseStatus,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function objectFromRow(row: Row): OperationalCaseObject {
  return {
    id: text(row.id),
    caseId: text(row.case_id),
    tenantId: text(row.tenant_id),
    kind: text(row.object_kind) as SfiCaseObjectKind,
    epistemicRole: text(row.epistemic_role) as SfiEpistemicClass,
    canonicalRef: canonicalRef(row.canonical_ref),
    sourceRefs: canonicalRefs(row.source_refs),
    recordRefs: canonicalRefs(row.record_refs),
    evidenceRefs: canonicalRefs(row.evidence_refs),
    payload: record(row.payload),
    observedAt: nullableText(row.observed_at),
    createdAt: text(row.created_at),
  };
}

function pushRef(caseRecord: SfiCaseV1, object: OperationalCaseObject) {
  const ref = object.canonicalRef;
  switch (object.kind) {
    case 'SOURCE': caseRecord.sourceRefs.push(ref); break;
    case 'RECORD': caseRecord.recordRefs.push(ref); break;
    case 'EVIDENCE': caseRecord.evidenceRefs.push(ref); break;
    case 'SYSTEM_MODEL': caseRecord.systemModelRefs.push(ref); break;
    case 'OBSERVATION': caseRecord.observationRefs.push(ref); break;
    case 'FRICTION': caseRecord.frictionRefs.push(ref); break;
    case 'PERTURBATION': caseRecord.perturbationRefs.push(ref); break;
    case 'TRAJECTORY': caseRecord.trajectoryRefs.push(ref); break;
    case 'ATTRACTOR': caseRecord.attractorRefs.push(ref); break;
    case 'EPISTEMIC_ASSESSMENT': caseRecord.epistemicAssessmentRefs.push(ref); break;
    case 'HYPOTHESIS': caseRecord.hypothesisRefs.push(ref); break;
    case 'INSTRUMENT_RUN': caseRecord.instrumentRunRefs.push(ref); break;
    case 'ANALYSIS': caseRecord.analysisRefs.push(ref); break;
    case 'RECOMMENDATION': caseRecord.recommendationRefs.push(ref); break;
    case 'INTERVENTION': caseRecord.interventionRefs.push(ref); break;
    case 'RETURN': caseRecord.returnRefs.push(ref); break;
    case 'REPORT': caseRecord.reportRefs.push(ref); break;
    case 'GOVERNANCE_DECISION': caseRecord.governance.governanceDecisionRefs.push(ref); break;
    case 'UNRESOLVED_QUESTION': caseRecord.uncertainty.unresolvedQuestionRefs.push(ref); break;
    case 'CONTRADICTION': caseRecord.uncertainty.contradictionRefs.push(ref); break;
  }
}

function hydrateCase(row: Row, objects: OperationalCaseObject[]) {
  const caseRecord = caseFromRow(row);
  for (const object of objects) pushRef(caseRecord, object);
  return caseRecord;
}

async function audit(input: {
  caseId: string;
  tenantId: string;
  actorId: string;
  action: string;
  beforeState?: unknown;
  afterState?: unknown;
  context?: Record<string, unknown>;
}) {
  const service = createServiceSupabaseClient();
  const result = await service.from('sfi_case_audit_events').insert({
    case_id: input.caseId,
    tenant_id: input.tenantId,
    actor_id: input.actorId,
    action: input.action,
    before_state: input.beforeState ?? null,
    after_state: input.afterState ?? null,
    context: input.context ?? {},
  });
  if (result.error) throw new Error(`SFI_CASE_AUDIT_FAILED:${result.error.message}`);
}

export async function listOperationalTenants(userId: string) {
  const service = createServiceSupabaseClient();
  const memberships = await service
    .from('sfi_tenant_members')
    .select('tenant_id,role,status')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE');
  if (memberships.error) throw new Error(`SFI_TENANT_MEMBERSHIP_READ_FAILED:${memberships.error.message}`);
  const rows = (memberships.data ?? []) as Row[];
  const tenantIds = rows.map((row) => text(row.tenant_id)).filter(Boolean);
  if (!tenantIds.length) return [];
  const tenants = await service
    .from('sfi_tenants')
    .select('id,tenant_key,name,tenant_type,status,created_at,updated_at')
    .in('id', tenantIds)
    .order('created_at', { ascending: true });
  if (tenants.error) throw new Error(`SFI_TENANT_READ_FAILED:${tenants.error.message}`);
  const roleByTenant = new Map(rows.map((row) => [text(row.tenant_id), text(row.role)]));
  return ((tenants.data ?? []) as Row[]).map((row) => ({
    id: text(row.id),
    key: text(row.tenant_key),
    name: text(row.name),
    type: text(row.tenant_type) as SfiTenantType,
    status: text(row.status),
    role: roleByTenant.get(text(row.id)) as SfiTenantRole,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  }));
}

export async function createOperationalTenant(input: {
  userId: string;
  tenantKey: string;
  name: string;
  tenantType: Exclude<SfiTenantType, 'PERSONAL'>;
  metadata?: Record<string, unknown>;
}) {
  const tenantKey = input.tenantKey.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9:_-]{2,80}$/.test(tenantKey)) throw new Error('SFI_TENANT_KEY_INVALID');
  if (!input.name.trim()) throw new Error('SFI_TENANT_NAME_REQUIRED');
  const service = createServiceSupabaseClient();
  const inserted = await service.from('sfi_tenants').insert({
    tenant_key: tenantKey,
    name: input.name.trim(),
    tenant_type: input.tenantType,
    created_by: input.userId,
    metadata: input.metadata ?? {},
  }).select('id,tenant_key,name,tenant_type,status,created_at,updated_at').single();
  if (inserted.error || !inserted.data) throw new Error(`SFI_TENANT_CREATE_FAILED:${inserted.error?.message ?? 'unknown'}`);
  await service.from('sfi_tenant_members').upsert({
    tenant_id: inserted.data.id,
    user_id: input.userId,
    role: 'OWNER',
    status: 'ACTIVE',
  }, { onConflict: 'tenant_id,user_id' });
  return inserted.data;
}

async function ensurePersonalTenant(userId: string, email?: string | null) {
  const service = createServiceSupabaseClient();
  const tenantKey = `personal:${userId}`;
  const existing = await service.from('sfi_tenants').select('id').eq('tenant_key', tenantKey).maybeSingle();
  if (existing.error) throw new Error(`SFI_PERSONAL_TENANT_READ_FAILED:${existing.error.message}`);
  let tenantId = existing.data?.id ? String(existing.data.id) : '';
  if (!tenantId) {
    const created = await service.from('sfi_tenants').insert({
      tenant_key: tenantKey,
      name: email?.trim() || 'Personal SFI Workspace',
      tenant_type: 'PERSONAL',
      created_by: userId,
      metadata: { provisionedBy: 'SFI_CASE_PLATFORM_OPERATIONAL_V1' },
    }).select('id').single();
    if (created.error || !created.data?.id) throw new Error(`SFI_PERSONAL_TENANT_CREATE_FAILED:${created.error?.message ?? 'unknown'}`);
    tenantId = String(created.data.id);
  }
  const membership = await service.from('sfi_tenant_members').upsert({
    tenant_id: tenantId,
    user_id: userId,
    role: 'OWNER',
    status: 'ACTIVE',
  }, { onConflict: 'tenant_id,user_id' });
  if (membership.error) throw new Error(`SFI_PERSONAL_TENANT_MEMBERSHIP_FAILED:${membership.error.message}`);
  return tenantId;
}

async function assertTenantAccess(tenantId: string, userId: string, mode: 'READ' | 'WRITE') {
  const service = createServiceSupabaseClient();
  const membership = await service
    .from('sfi_tenant_members')
    .select('role,status')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle();
  if (membership.error) throw new Error(`SFI_TENANT_ACCESS_READ_FAILED:${membership.error.message}`);
  if (!membership.data || membership.data.status !== 'ACTIVE') throw new Error('SFI_TENANT_FORBIDDEN');
  const role = String(membership.data.role) as SfiTenantRole;
  if (mode === 'WRITE' && !['OWNER', 'ADMIN', 'OPERATOR'].includes(role)) throw new Error('SFI_TENANT_WRITE_FORBIDDEN');
  return role;
}

async function caseRow(caseId: string) {
  const service = createServiceSupabaseClient();
  const result = await service.from('sfi_cases').select('*').eq('id', caseId).is('deleted_at', null).maybeSingle();
  if (result.error) throw new Error(`SFI_CASE_READ_FAILED:${result.error.message}`);
  if (!result.data) throw new Error('SFI_CASE_NOT_FOUND');
  return result.data as Row;
}

export async function createOperationalCase(input: {
  userId: string;
  userEmail?: string | null;
  tenantId?: string | null;
  clientId?: string | null;
  serviceProfileId: SfiServiceProfileId;
  subject: string;
  scope: string;
  systemBoundaryRef: SfiCanonicalRef;
  temporalWindow: SfiTemporalWindowV1;
}) {
  const tenantId = input.tenantId?.trim() || await ensurePersonalTenant(input.userId, input.userEmail);
  await assertTenantAccess(tenantId, input.userId, 'WRITE');
  const createdAt = new Date().toISOString();
  const caseRecord = createSfiCaseV1({
    id: randomUUID(),
    tenantId,
    clientId: input.clientId ?? null,
    serviceProfileId: input.serviceProfileId,
    subject: input.subject,
    scope: input.scope,
    systemBoundaryRef: input.systemBoundaryRef,
    temporalWindow: input.temporalWindow,
    createdAt,
  });
  const service = createServiceSupabaseClient();
  const inserted = await service.from('sfi_cases').insert({
    id: caseRecord.id,
    owner_id: input.userId,
    tenant_id: tenantId,
    client_id: caseRecord.clientId,
    contract_version: caseRecord.contract,
    version: caseRecord.version,
    service_profile_id: caseRecord.serviceProfileId,
    subject: caseRecord.subject,
    scope: caseRecord.scope,
    system_boundary_ref: caseRecord.systemBoundaryRef,
    temporal_window: caseRecord.temporalWindow,
    lineage: caseRecord.lineage,
    uncertainty: caseRecord.uncertainty,
    governance: caseRecord.governance,
    status: caseRecord.status,
    created_at: caseRecord.createdAt,
    updated_at: caseRecord.updatedAt,
  }).select('*').single();
  if (inserted.error || !inserted.data) throw new Error(`SFI_CASE_CREATE_FAILED:${inserted.error?.message ?? 'unknown'}`);
  await audit({ caseId: caseRecord.id, tenantId, actorId: input.userId, action: 'CASE_CREATED', afterState: caseRecord });
  return caseFromRow(inserted.data as Row);
}

export async function listOperationalCases(userId: string) {
  const tenants = await listOperationalTenants(userId);
  const tenantIds = tenants.map((tenant) => tenant.id);
  if (!tenantIds.length) return [];
  const service = createServiceSupabaseClient();
  const result = await service
    .from('sfi_cases')
    .select('*')
    .in('tenant_id', tenantIds)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (result.error) throw new Error(`SFI_CASE_LIST_FAILED:${result.error.message}`);
  return ((result.data ?? []) as Row[]).map(caseFromRow);
}

export async function listOperationalCaseObjects(caseId: string, userId: string) {
  const row = await caseRow(caseId);
  await assertTenantAccess(text(row.tenant_id), userId, 'READ');
  const service = createServiceSupabaseClient();
  const result = await service.from('sfi_case_objects').select('*').eq('case_id', caseId).order('created_at', { ascending: true });
  if (result.error) throw new Error(`SFI_CASE_OBJECT_LIST_FAILED:${result.error.message}`);
  return ((result.data ?? []) as Row[]).map(objectFromRow);
}

export async function readOperationalCase(caseId: string, userId: string) {
  const row = await caseRow(caseId);
  await assertTenantAccess(text(row.tenant_id), userId, 'READ');
  const objects = await listOperationalCaseObjects(caseId, userId);
  const caseRecord = hydrateCase(row, objects);
  const profile = getSfiServiceProfile(caseRecord.serviceProfileId);
  const presentSourceTypes = Array.from(new Set(objects
    .filter((object) => object.kind === 'SOURCE')
    .map((object) => text(object.payload.sourceType))
    .filter(Boolean))).sort();
  const requiredSources = profile ? [...profile.requiredSources] : [];
  const missingSources = requiredSources.filter((source) => !presentSourceTypes.includes(source));
  return {
    caseRecord,
    objects,
    readiness: {
      requiredSources,
      presentSourceTypes,
      missingSources,
      sourceCoverage: requiredSources.length ? (requiredSources.length - missingSources.length) / requiredSources.length : 1,
      readyForAnalysis: Boolean(profile) && missingSources.length === 0,
    },
  };
}

export async function transitionOperationalCase(input: {
  caseId: string;
  userId: string;
  status: SfiCaseStatus;
}) {
  const row = await caseRow(input.caseId);
  const tenantId = text(row.tenant_id);
  await assertTenantAccess(tenantId, input.userId, 'WRITE');
  const current = text(row.status) as SfiCaseStatus;
  assertSfiCaseTransition(current, input.status);
  if (current === input.status) return readOperationalCase(input.caseId, input.userId);
  const service = createServiceSupabaseClient();
  const updated = await service.from('sfi_cases').update({
    status: input.status,
    closed_at: input.status === 'CLOSED' || input.status === 'REJECTED' ? new Date().toISOString() : null,
  }).eq('id', input.caseId).select('*').single();
  if (updated.error || !updated.data) throw new Error(`SFI_CASE_TRANSITION_FAILED:${updated.error?.message ?? 'unknown'}`);
  await audit({
    caseId: input.caseId,
    tenantId,
    actorId: input.userId,
    action: 'CASE_STATUS_CHANGED',
    beforeState: { status: current },
    afterState: { status: input.status },
  });
  return readOperationalCase(input.caseId, input.userId);
}

export async function recordOperationalCaseObject(input: {
  caseId: string;
  userId: string;
  kind: SfiCaseObjectKind;
  epistemicRole: SfiEpistemicClass;
  canonicalRef: SfiCanonicalRef;
  sourceRefs?: SfiCanonicalRef[];
  recordRefs?: SfiCanonicalRef[];
  evidenceRefs?: SfiCanonicalRef[];
  payload?: Record<string, unknown>;
  observedAt?: string | null;
}) {
  const row = await caseRow(input.caseId);
  const tenantId = text(row.tenant_id);
  await assertTenantAccess(tenantId, input.userId, 'WRITE');
  const status = text(row.status) as SfiCaseStatus;
  if (status === 'REJECTED' || (status === 'CLOSED' && input.kind !== 'REPORT')) {
    throw new Error(`SFI_CASE_OBJECT_WRITE_FORBIDDEN:${status}`);
  }
  const draft: SfiCaseObjectDraft = {
    kind: input.kind,
    epistemicRole: input.epistemicRole,
    canonicalRef: input.canonicalRef,
    sourceRefs: input.sourceRefs ?? [],
    recordRefs: input.recordRefs ?? [],
    evidenceRefs: input.evidenceRefs ?? [],
  };
  const violations = validateSfiCaseObjectDraft(draft);
  if (violations.length) throw new Error(`SFI_CASE_OBJECT_INVALID:${violations.join(',')}`);
  if (input.observedAt && Number.isNaN(Date.parse(input.observedAt))) throw new Error('SFI_CASE_OBJECT_OBSERVED_AT_INVALID');

  const hash = input.canonicalRef.hash?.trim() || semanticHash({
    caseId: input.caseId,
    kind: input.kind,
    epistemicRole: input.epistemicRole,
    refId: input.canonicalRef.id,
    sourceRefs: input.sourceRefs ?? [],
    recordRefs: input.recordRefs ?? [],
    evidenceRefs: input.evidenceRefs ?? [],
    payload: input.payload ?? {},
  });
  const ref: SfiCanonicalRef = { ...input.canonicalRef, hash };
  const service = createServiceSupabaseClient();
  const existing = await service
    .from('sfi_case_objects')
    .select('*')
    .eq('case_id', input.caseId)
    .eq('object_kind', input.kind)
    .contains('canonical_ref', { id: ref.id })
    .maybeSingle();
  if (existing.error) throw new Error(`SFI_CASE_OBJECT_IDENTITY_READ_FAILED:${existing.error.message}`);
  if (existing.data) {
    const existingObject = objectFromRow(existing.data as Row);
    if (existingObject.canonicalRef.hash === hash) return existingObject;
    throw new Error('SFI_CASE_OBJECT_ID_CONFLICT');
  }

  const inserted = await service.from('sfi_case_objects').insert({
    case_id: input.caseId,
    owner_id: text(row.owner_id),
    tenant_id: tenantId,
    object_kind: input.kind,
    epistemic_role: input.epistemicRole,
    canonical_ref: ref,
    source_refs: input.sourceRefs ?? [],
    record_refs: input.recordRefs ?? [],
    evidence_refs: input.evidenceRefs ?? [],
    payload: input.payload ?? {},
    observed_at: input.observedAt ?? null,
  }).select('*').single();
  if (inserted.error || !inserted.data) throw new Error(`SFI_CASE_OBJECT_WRITE_FAILED:${inserted.error?.message ?? 'unknown'}`);
  await service.from('sfi_cases').update({ updated_at: new Date().toISOString() }).eq('id', input.caseId);
  const object = objectFromRow(inserted.data as Row);
  await audit({
    caseId: input.caseId,
    tenantId,
    actorId: input.userId,
    action: 'CASE_OBJECT_RECORDED',
    afterState: { kind: object.kind, epistemicRole: object.epistemicRole, canonicalRef: object.canonicalRef },
  });
  return object;
}

export async function registerOperationalCaseSource(input: {
  caseId: string;
  userId: string;
  source: NormalizedSfiCaseSource;
}) {
  return recordOperationalCaseObject({
    caseId: input.caseId,
    userId: input.userId,
    kind: 'SOURCE',
    epistemicRole: 'SOURCE',
    canonicalRef: input.source.sourceRef,
    payload: {
      contract: input.source.contract,
      sourceType: input.source.sourceType,
      label: input.source.label,
      externalRef: input.source.externalRef,
      metadata: input.source.metadata,
      rawContentPersisted: false,
    },
    observedAt: input.source.observedAt,
  });
}

export async function normalizeAndRegisterOperationalCaseSource(input: {
  caseId: string;
  userId: string;
  source: Parameters<typeof normalizeSfiCaseSourceIntake>[0];
}) {
  return registerOperationalCaseSource({
    caseId: input.caseId,
    userId: input.userId,
    source: normalizeSfiCaseSourceIntake(input.source),
  });
}

export async function listOperationalReports(caseId: string, userId: string) {
  const row = await caseRow(caseId);
  await assertTenantAccess(text(row.tenant_id), userId, 'READ');
  const service = createServiceSupabaseClient();
  const result = await service.from('sfi_case_reports').select('id,report_payload,generated_at,created_at').eq('case_id', caseId).order('generated_at', { ascending: false });
  if (result.error) throw new Error(`SFI_CASE_REPORT_LIST_FAILED:${result.error.message}`);
  return ((result.data ?? []) as Row[]).map((item) => ({
    id: text(item.id),
    report: item.report_payload as SfiReportV1,
    generatedAt: text(item.generated_at),
    createdAt: text(item.created_at),
  }));
}

export async function generateOperationalReport(input: {
  caseId: string;
  userId: string;
  claims?: SfiReportClaimV1[];
  deliveryFormats?: SfiReportDeliveryFormat[];
  limitations?: string[];
}) {
  const envelope = await readOperationalCase(input.caseId, input.userId);
  await assertTenantAccess(envelope.caseRecord.tenantId, input.userId, 'WRITE');
  const report = assembleSfiReportV1({
    id: randomUUID(),
    caseRecord: envelope.caseRecord,
    generatedAt: new Date().toISOString(),
    claims: input.claims ?? [],
    deliveryFormats: input.deliveryFormats ?? ['JSON'],
    limitations: input.limitations ?? [],
  });
  const service = createServiceSupabaseClient();
  const caseBase = await caseRow(input.caseId);
  const inserted = await service.from('sfi_case_reports').insert({
    id: report.id,
    case_id: input.caseId,
    owner_id: text(caseBase.owner_id),
    tenant_id: envelope.caseRecord.tenantId,
    report_contract: report.contract,
    version: report.version,
    report_payload: report,
    execution_authority: false,
    generated_at: report.generatedAt,
  });
  if (inserted.error) throw new Error(`SFI_CASE_REPORT_WRITE_FAILED:${inserted.error.message}`);
  try {
    await recordOperationalCaseObject({
      caseId: input.caseId,
      userId: input.userId,
      kind: 'REPORT',
      epistemicRole: 'RECORD',
      canonicalRef: { id: report.id, version: report.version, hash: semanticHash(report) },
      payload: {
        reportContract: report.contract,
        deliveryFormats: report.deliveryFormats,
        executionAuthority: false,
      },
    });
  } catch (error) {
    await service.from('sfi_case_reports').delete().eq('id', report.id);
    throw error;
  }
  await audit({
    caseId: input.caseId,
    tenantId: envelope.caseRecord.tenantId,
    actorId: input.userId,
    action: 'CASE_REPORT_GENERATED',
    afterState: { reportId: report.id, executionAuthority: false },
  });
  return report;
}
