import type { SfiCanonicalRef, SfiEpistemicClass } from '../contracts/sfi';
import type { SfiCaseObjectKind } from './operational';

export const SFI_ENTERPRISE_ASSURANCE_DOMAIN_CONTRACT = 'SFI-ENTERPRISE-ASSURANCE-DOMAIN-1.0' as const;

export const SFI_ENTERPRISE_ENTITY_TYPES = [
  'TENDER',
  'REQUIREMENT',
  'BIDDER',
  'BID_SUBMISSION',
  'SUPPLIER',
  'CONTRACT',
  'OBLIGATION',
  'ASSET',
  'SERVICE',
  'TICKET',
  'SLA',
  'WARRANTY',
  'WARRANTY_EVENT',
  'RETURN',
  'SUPPLIER_PERFORMANCE',
] as const;

export type SfiEnterpriseEntityType = (typeof SFI_ENTERPRISE_ENTITY_TYPES)[number];

export const SFI_ENTERPRISE_RELATION_TYPES = [
  'TENDER_HAS_REQUIREMENT',
  'BIDDER_PARTICIPATES_IN_TENDER',
  'BID_SUBMISSION_FOR_TENDER',
  'BID_SUBMISSION_BY_BIDDER',
  'BIDDER_MAPS_TO_SUPPLIER',
  'TENDER_AWARDS_SUPPLIER',
  'CONTRACT_ARISES_FROM_TENDER',
  'CONTRACT_BINDS_SUPPLIER',
  'CONTRACT_DEFINES_OBLIGATION',
  'CONTRACT_COVERS_ASSET',
  'CONTRACT_COVERS_SERVICE',
  'ASSET_PROVIDED_BY_SUPPLIER',
  'SERVICE_PROVIDED_BY_SUPPLIER',
  'TICKET_AFFECTS_ASSET',
  'TICKET_AFFECTS_SERVICE',
  'TICKET_SUBJECT_TO_SLA',
  'TICKET_ASSIGNED_TO_SUPPLIER',
  'SLA_DERIVED_FROM_CONTRACT',
  'WARRANTY_DEFINED_BY_CONTRACT',
  'WARRANTY_COVERS_ASSET',
  'WARRANTY_EVENT_AFFECTS_ASSET',
  'WARRANTY_EVENT_UNDER_WARRANTY',
  'WARRANTY_EVENT_ASSIGNED_TO_SUPPLIER',
  'TICKET_TRIGGERS_WARRANTY_EVENT',
  'RETURN_RESOLVES_WARRANTY_EVENT',
  'RETURN_CLOSES_TICKET',
  'SUPPLIER_PERFORMANCE_AGGREGATES_RETURN',
  'SUPPLIER_PERFORMANCE_INFORMS_TENDER',
] as const;

export type SfiEnterpriseRelationType = (typeof SFI_ENTERPRISE_RELATION_TYPES)[number];
export type SfiEnterpriseRelationEpistemicRole = Extract<SfiEpistemicClass, 'RECORD' | 'INFERENCE' | 'EPISTEMIC_ASSESSMENT'>;

export type SfiEnterpriseEntityRef = SfiCanonicalRef & {
  entityType: SfiEnterpriseEntityType;
};

export type SfiEnterpriseRelationDraft = {
  relationKey: string;
  relationType: SfiEnterpriseRelationType;
  epistemicRole: SfiEnterpriseRelationEpistemicRole;
  from: SfiEnterpriseEntityRef;
  to: SfiEnterpriseEntityRef;
  sourceRefs?: SfiCanonicalRef[];
  recordRefs?: SfiCanonicalRef[];
  evidenceRefs?: SfiCanonicalRef[];
  payload?: Record<string, unknown>;
  observedAt?: string | null;
};

export type SfiEnterpriseCaseObjectInput = {
  kind: SfiCaseObjectKind;
  epistemicRole: SfiEpistemicClass;
  canonicalRef: SfiCanonicalRef;
  sourceRefs?: SfiCanonicalRef[];
  recordRefs?: SfiCanonicalRef[];
  evidenceRefs?: SfiCanonicalRef[];
  payload: Record<string, unknown>;
  observedAt?: string | null;
};

export type SfiEnterpriseIntakePackage = {
  contract: typeof SFI_ENTERPRISE_ASSURANCE_DOMAIN_CONTRACT;
  object: SfiEnterpriseCaseObjectInput;
  relations: SfiEnterpriseRelationDraft[];
};

type EndpointSpec = readonly [SfiEnterpriseEntityType, SfiEnterpriseEntityType];

const ENDPOINTS: Record<SfiEnterpriseRelationType, EndpointSpec> = {
  TENDER_HAS_REQUIREMENT: ['TENDER', 'REQUIREMENT'],
  BIDDER_PARTICIPATES_IN_TENDER: ['BIDDER', 'TENDER'],
  BID_SUBMISSION_FOR_TENDER: ['BID_SUBMISSION', 'TENDER'],
  BID_SUBMISSION_BY_BIDDER: ['BID_SUBMISSION', 'BIDDER'],
  BIDDER_MAPS_TO_SUPPLIER: ['BIDDER', 'SUPPLIER'],
  TENDER_AWARDS_SUPPLIER: ['TENDER', 'SUPPLIER'],
  CONTRACT_ARISES_FROM_TENDER: ['CONTRACT', 'TENDER'],
  CONTRACT_BINDS_SUPPLIER: ['CONTRACT', 'SUPPLIER'],
  CONTRACT_DEFINES_OBLIGATION: ['CONTRACT', 'OBLIGATION'],
  CONTRACT_COVERS_ASSET: ['CONTRACT', 'ASSET'],
  CONTRACT_COVERS_SERVICE: ['CONTRACT', 'SERVICE'],
  ASSET_PROVIDED_BY_SUPPLIER: ['ASSET', 'SUPPLIER'],
  SERVICE_PROVIDED_BY_SUPPLIER: ['SERVICE', 'SUPPLIER'],
  TICKET_AFFECTS_ASSET: ['TICKET', 'ASSET'],
  TICKET_AFFECTS_SERVICE: ['TICKET', 'SERVICE'],
  TICKET_SUBJECT_TO_SLA: ['TICKET', 'SLA'],
  TICKET_ASSIGNED_TO_SUPPLIER: ['TICKET', 'SUPPLIER'],
  SLA_DERIVED_FROM_CONTRACT: ['SLA', 'CONTRACT'],
  WARRANTY_DEFINED_BY_CONTRACT: ['WARRANTY', 'CONTRACT'],
  WARRANTY_COVERS_ASSET: ['WARRANTY', 'ASSET'],
  WARRANTY_EVENT_AFFECTS_ASSET: ['WARRANTY_EVENT', 'ASSET'],
  WARRANTY_EVENT_UNDER_WARRANTY: ['WARRANTY_EVENT', 'WARRANTY'],
  WARRANTY_EVENT_ASSIGNED_TO_SUPPLIER: ['WARRANTY_EVENT', 'SUPPLIER'],
  TICKET_TRIGGERS_WARRANTY_EVENT: ['TICKET', 'WARRANTY_EVENT'],
  RETURN_RESOLVES_WARRANTY_EVENT: ['RETURN', 'WARRANTY_EVENT'],
  RETURN_CLOSES_TICKET: ['RETURN', 'TICKET'],
  SUPPLIER_PERFORMANCE_AGGREGATES_RETURN: ['SUPPLIER_PERFORMANCE', 'RETURN'],
  SUPPLIER_PERFORMANCE_INFORMS_TENDER: ['SUPPLIER_PERFORMANCE', 'TENDER'],
};

function requireText(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`SFI_ENTERPRISE_INVALID:${field}`);
  return normalized;
}

function dateOrNull(value: string | null | undefined, field: string) {
  const normalized = value?.trim() || null;
  if (normalized && Number.isNaN(Date.parse(normalized))) throw new Error(`SFI_ENTERPRISE_INVALID:${field}`);
  return normalized;
}

function nonNegativeNumber(value: number | null | undefined, field: string) {
  if (value === null || typeof value === 'undefined') return null;
  if (!Number.isFinite(value) || value < 0) throw new Error(`SFI_ENTERPRISE_INVALID:${field}`);
  return value;
}

export function enterpriseEntityRef(entityType: SfiEnterpriseEntityType, id: string): SfiEnterpriseEntityRef {
  return {
    entityType,
    id: `enterprise:${entityType}:${requireText(id, 'entityId')}`,
    version: '1.0',
    hash: null,
  };
}

export function validateEnterpriseRelationDraft(draft: SfiEnterpriseRelationDraft): string[] {
  const violations: string[] = [];
  if (!draft.relationKey.trim()) violations.push('ENTERPRISE_RELATION_KEY_REQUIRED');
  const expected = ENDPOINTS[draft.relationType];
  if (!expected) violations.push('ENTERPRISE_RELATION_TYPE_UNKNOWN');
  if (expected && draft.from.entityType !== expected[0]) {
    violations.push(`ENTERPRISE_RELATION_FROM_TYPE_MISMATCH:${expected[0]}`);
  }
  if (expected && draft.to.entityType !== expected[1]) {
    violations.push(`ENTERPRISE_RELATION_TO_TYPE_MISMATCH:${expected[1]}`);
  }
  if (!draft.from.id.trim() || !draft.to.id.trim()) violations.push('ENTERPRISE_RELATION_ENDPOINT_REQUIRED');
  if (draft.epistemicRole === 'INFERENCE' && (draft.evidenceRefs?.length ?? 0) === 0) {
    violations.push('ENTERPRISE_INFERRED_RELATION_REQUIRES_EVIDENCE');
  }
  if (draft.observedAt && Number.isNaN(Date.parse(draft.observedAt))) {
    violations.push('ENTERPRISE_RELATION_OBSERVED_AT_INVALID');
  }
  return violations;
}

function relation(input: Omit<SfiEnterpriseRelationDraft, 'epistemicRole'> & { epistemicRole?: SfiEnterpriseRelationEpistemicRole }): SfiEnterpriseRelationDraft {
  const draft: SfiEnterpriseRelationDraft = { ...input, epistemicRole: input.epistemicRole ?? 'RECORD' };
  const violations = validateEnterpriseRelationDraft(draft);
  if (violations.length) throw new Error(`SFI_ENTERPRISE_RELATION_INVALID:${violations.join(',')}`);
  return draft;
}

export function normalizeEnterpriseEntityRecord(input: {
  entityType: SfiEnterpriseEntityType;
  entityId: string;
  label?: string | null;
  attributes?: Record<string, unknown>;
  observedAt?: string | null;
  sourceRefs?: SfiCanonicalRef[];
}): SfiEnterpriseIntakePackage {
  const ref = enterpriseEntityRef(input.entityType, input.entityId);
  return {
    contract: SFI_ENTERPRISE_ASSURANCE_DOMAIN_CONTRACT,
    object: {
      kind: 'RECORD',
      epistemicRole: 'RECORD',
      canonicalRef: ref,
      sourceRefs: input.sourceRefs ?? [],
      payload: {
        entityType: input.entityType,
        label: input.label?.trim() || null,
        attributes: input.attributes ?? {},
      },
      observedAt: dateOrNull(input.observedAt, 'observedAt'),
    },
    relations: [],
  };
}

export function normalizeServiceTicketRecord(input: {
  ticketId: string;
  openedAt: string;
  closedAt?: string | null;
  status: string;
  category?: string | null;
  priority?: string | null;
  responseMinutes?: number | null;
  resolutionMinutes?: number | null;
  recurrenceKey?: string | null;
  assetRef?: SfiEnterpriseEntityRef | null;
  serviceRef?: SfiEnterpriseEntityRef | null;
  slaRef?: SfiEnterpriseEntityRef | null;
  supplierRef?: SfiEnterpriseEntityRef | null;
  sourceRefs?: SfiCanonicalRef[];
}): SfiEnterpriseIntakePackage {
  const ticketRef = enterpriseEntityRef('TICKET', input.ticketId);
  const openedAt = dateOrNull(input.openedAt, 'openedAt');
  if (!openedAt) throw new Error('SFI_ENTERPRISE_INVALID:openedAt');
  const relations: SfiEnterpriseRelationDraft[] = [];
  if (input.assetRef) relations.push(relation({ relationKey: `${ticketRef.id}:asset`, relationType: 'TICKET_AFFECTS_ASSET', from: ticketRef, to: input.assetRef, sourceRefs: input.sourceRefs, observedAt: openedAt }));
  if (input.serviceRef) relations.push(relation({ relationKey: `${ticketRef.id}:service`, relationType: 'TICKET_AFFECTS_SERVICE', from: ticketRef, to: input.serviceRef, sourceRefs: input.sourceRefs, observedAt: openedAt }));
  if (input.slaRef) relations.push(relation({ relationKey: `${ticketRef.id}:sla`, relationType: 'TICKET_SUBJECT_TO_SLA', from: ticketRef, to: input.slaRef, sourceRefs: input.sourceRefs, observedAt: openedAt }));
  if (input.supplierRef) relations.push(relation({ relationKey: `${ticketRef.id}:supplier`, relationType: 'TICKET_ASSIGNED_TO_SUPPLIER', from: ticketRef, to: input.supplierRef, sourceRefs: input.sourceRefs, observedAt: openedAt }));
  return {
    contract: SFI_ENTERPRISE_ASSURANCE_DOMAIN_CONTRACT,
    object: {
      kind: 'RECORD',
      epistemicRole: 'RECORD',
      canonicalRef: ticketRef,
      sourceRefs: input.sourceRefs ?? [],
      payload: {
        entityType: 'TICKET',
        openedAt,
        closedAt: dateOrNull(input.closedAt, 'closedAt'),
        status: requireText(input.status, 'status'),
        category: input.category?.trim() || null,
        priority: input.priority?.trim() || null,
        responseMinutes: nonNegativeNumber(input.responseMinutes, 'responseMinutes'),
        resolutionMinutes: nonNegativeNumber(input.resolutionMinutes, 'resolutionMinutes'),
        recurrenceKey: input.recurrenceKey?.trim() || null,
        problemIdentityClaimed: false,
      },
      observedAt: openedAt,
    },
    relations,
  };
}

export function normalizeWarrantyEventRecord(input: {
  eventId: string;
  occurredAt: string;
  eventType: string;
  status: string;
  assetRef: SfiEnterpriseEntityRef;
  warrantyRef?: SfiEnterpriseEntityRef | null;
  supplierRef?: SfiEnterpriseEntityRef | null;
  responseDueAt?: string | null;
  resolvedAt?: string | null;
  sourceRefs?: SfiCanonicalRef[];
}): SfiEnterpriseIntakePackage {
  const eventRef = enterpriseEntityRef('WARRANTY_EVENT', input.eventId);
  const occurredAt = dateOrNull(input.occurredAt, 'occurredAt');
  if (!occurredAt) throw new Error('SFI_ENTERPRISE_INVALID:occurredAt');
  const relations: SfiEnterpriseRelationDraft[] = [
    relation({ relationKey: `${eventRef.id}:asset`, relationType: 'WARRANTY_EVENT_AFFECTS_ASSET', from: eventRef, to: input.assetRef, sourceRefs: input.sourceRefs, observedAt: occurredAt }),
  ];
  if (input.warrantyRef) relations.push(relation({ relationKey: `${eventRef.id}:warranty`, relationType: 'WARRANTY_EVENT_UNDER_WARRANTY', from: eventRef, to: input.warrantyRef, sourceRefs: input.sourceRefs, observedAt: occurredAt }));
  if (input.supplierRef) relations.push(relation({ relationKey: `${eventRef.id}:supplier`, relationType: 'WARRANTY_EVENT_ASSIGNED_TO_SUPPLIER', from: eventRef, to: input.supplierRef, sourceRefs: input.sourceRefs, observedAt: occurredAt }));
  return {
    contract: SFI_ENTERPRISE_ASSURANCE_DOMAIN_CONTRACT,
    object: {
      kind: 'RECORD',
      epistemicRole: 'RECORD',
      canonicalRef: eventRef,
      sourceRefs: input.sourceRefs ?? [],
      payload: {
        entityType: 'WARRANTY_EVENT',
        occurredAt,
        eventType: requireText(input.eventType, 'eventType'),
        status: requireText(input.status, 'status'),
        responseDueAt: dateOrNull(input.responseDueAt, 'responseDueAt'),
        resolvedAt: dateOrNull(input.resolvedAt, 'resolvedAt'),
        contractualBreachDeclared: false,
      },
      observedAt: occurredAt,
    },
    relations,
  };
}

export function normalizeTenderRequirementRecord(input: {
  requirementId: string;
  tenderRef: SfiEnterpriseEntityRef;
  requirementText: string;
  requirementType?: string | null;
  frozenAt: string;
  sourceRefs: SfiCanonicalRef[];
  pageLocator?: string | null;
}): SfiEnterpriseIntakePackage {
  const requirementRef = enterpriseEntityRef('REQUIREMENT', input.requirementId);
  const frozenAt = dateOrNull(input.frozenAt, 'frozenAt');
  if (!frozenAt) throw new Error('SFI_ENTERPRISE_INVALID:frozenAt');
  if (!input.sourceRefs.length) throw new Error('SFI_TENDER_REQUIREMENT_REQUIRES_SOURCE');
  return {
    contract: SFI_ENTERPRISE_ASSURANCE_DOMAIN_CONTRACT,
    object: {
      kind: 'RECORD',
      epistemicRole: 'RECORD',
      canonicalRef: requirementRef,
      sourceRefs: input.sourceRefs,
      payload: {
        entityType: 'REQUIREMENT',
        requirementText: requireText(input.requirementText, 'requirementText'),
        requirementType: input.requirementType?.trim() || null,
        frozenAt,
        pageLocator: input.pageLocator?.trim() || null,
        frozenBeforeEvaluation: true,
      },
      observedAt: frozenAt,
    },
    relations: [relation({
      relationKey: `${input.tenderRef.id}:requirement:${requirementRef.id}`,
      relationType: 'TENDER_HAS_REQUIREMENT',
      from: input.tenderRef,
      to: requirementRef,
      sourceRefs: input.sourceRefs,
      observedAt: frozenAt,
    })],
  };
}

export type SfiTenderAssessmentResult = 'PASS' | 'FAIL' | 'UNDETERMINED';

export function normalizeTenderAssessment(input: {
  assessmentId: string;
  requirementRef: SfiEnterpriseEntityRef;
  bidderRef: SfiEnterpriseEntityRef;
  result: SfiTenderAssessmentResult;
  sourceRefs: SfiCanonicalRef[];
  recordRefs?: SfiCanonicalRef[];
  evidenceRefs?: SfiCanonicalRef[];
  pageLocator?: string | null;
  confidence?: number | null;
  missingReason?: string | null;
  contradictionRefs?: SfiCanonicalRef[];
}): SfiEnterpriseCaseObjectInput {
  const confidence = input.confidence === null || typeof input.confidence === 'undefined' ? null : input.confidence;
  if (confidence !== null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) throw new Error('SFI_TENDER_ASSESSMENT_CONFIDENCE_INVALID');
  if (!input.sourceRefs.length) throw new Error('SFI_TENDER_ASSESSMENT_REQUIRES_SOURCE');
  const evidenceRefs = input.evidenceRefs ?? [];
  const pageLocator = input.pageLocator?.trim() || null;
  if (input.result !== 'UNDETERMINED' && (!evidenceRefs.length || !pageLocator)) {
    throw new Error('SFI_TENDER_DETERMINATION_REQUIRES_PAGE_AND_EVIDENCE');
  }
  if (input.result === 'UNDETERMINED' && !input.missingReason?.trim()) {
    throw new Error('SFI_TENDER_UNDETERMINED_REQUIRES_REASON');
  }
  return {
    kind: 'EPISTEMIC_ASSESSMENT',
    epistemicRole: 'EPISTEMIC_ASSESSMENT',
    canonicalRef: { id: `tender-assessment:${requireText(input.assessmentId, 'assessmentId')}`, version: '1.0', hash: null },
    sourceRefs: input.sourceRefs,
    recordRefs: input.recordRefs ?? [],
    evidenceRefs,
    payload: {
      contract: SFI_ENTERPRISE_ASSURANCE_DOMAIN_CONTRACT,
      assessmentType: 'REQUIREMENT_BY_BIDDER',
      requirementRef: input.requirementRef,
      bidderRef: input.bidderRef,
      result: input.result,
      determinability: input.result === 'UNDETERMINED' ? 'UNDETERMINED' : 'DETERMINED',
      pageLocator,
      confidence,
      missingReason: input.missingReason?.trim() || null,
      contradictionRefs: input.contradictionRefs ?? [],
      winnerSelectionAuthority: false,
      humanDecisionAuthorityPreserved: true,
    },
  };
}

export function buildSupplierPerformanceAssessment(input: {
  assessmentId: string;
  supplierRef: SfiEnterpriseEntityRef;
  evidenceRefs: SfiCanonicalRef[];
  recordRefs: SfiCanonicalRef[];
  metrics: {
    responseMinutesMedian?: number | null;
    resolutionMinutesMedian?: number | null;
    slaComplianceRate?: number | null;
    recurrenceRate?: number | null;
    warrantyResolutionRate?: number | null;
  };
}): SfiEnterpriseCaseObjectInput {
  if (!input.evidenceRefs.length) throw new Error('SFI_SUPPLIER_PERFORMANCE_REQUIRES_EVIDENCE');
  const normalizedMetrics = Object.fromEntries(Object.entries(input.metrics).map(([key, value]) => {
    if (value === null || typeof value === 'undefined') return [key, null];
    if (!Number.isFinite(value) || value < 0) throw new Error(`SFI_SUPPLIER_PERFORMANCE_METRIC_INVALID:${key}`);
    return [key, value];
  }));
  return {
    kind: 'EPISTEMIC_ASSESSMENT',
    epistemicRole: 'EPISTEMIC_ASSESSMENT',
    canonicalRef: { id: `supplier-performance:${requireText(input.assessmentId, 'assessmentId')}`, version: '1.0', hash: null },
    evidenceRefs: input.evidenceRefs,
    recordRefs: input.recordRefs,
    payload: {
      contract: SFI_ENTERPRISE_ASSURANCE_DOMAIN_CONTRACT,
      assessmentType: 'SUPPLIER_PERFORMANCE',
      supplierRef: input.supplierRef,
      metrics: normalizedMetrics,
      compositeScore: null,
      rankingAuthority: false,
      futureTenderDecisionAuthority: false,
    },
  };
}

export const SFI_ENTERPRISE_ASSURANCE_INVARIANTS = {
  oneSharedCasePlatform: true,
  ticketCountEqualsProblemCount: false,
  aiSelectsTenderWinner: false,
  warrantyEventEqualsContractualBreach: false,
  supplierPerformanceAutomaticallyRanksBidder: false,
  clientGraphEqualsInstitutionalGraph: false,
  relationInferenceRequiresEvidence: true,
} as const;
