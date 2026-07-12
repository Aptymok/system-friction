import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { normalizeAmvObjectClass, type AmvObjectClass, type AmvPredictionGate } from './epistemicGate';
import type { ExternalEvidenceVector } from './externalEvidence';

export type ReferenceCaseStatus = 'REGISTERED' | 'OBSERVING' | 'WAITING_OUTCOME' | 'CLOSED' | 'UNVERIFIABLE' | 'ARCHIVED';
export type CaseEvidenceRelation = 'SUPPORTS' | 'CONTRADICTS' | 'CONTEXTUALIZES' | 'VERIFIES_OUTCOME' | 'DOCUMENTS_INTERVENTION' | 'GOVERNS' | 'RECORDS_ACCESS';

export type RegisterReferenceCaseInput = {
  caseCode: string;
  entityId?: string | null;
  objectId: string;
  objectClass: string;
  title: string;
  manifestation?: string | null;
  cohort: string;
  prospective: boolean;
  status?: ReferenceCaseStatus;
  openedAt: string;
  closedAt?: string | null;
  t0Cutoff: string;
  phaseStatus?: Record<string, unknown>;
  fieldsDocumented?: string[];
  missingFields?: string[];
  predictionRunId?: string | null;
  interventionId?: string | null;
  outcomeId?: string | null;
  modelKey?: string | null;
  modelVersion?: number | null;
  operatorId?: string | null;
  secondOperatorId?: string | null;
  consentRequired?: boolean;
  consentEvidenceId?: string | null;
  metadata?: Record<string, unknown>;
};

type Row = Record<string, unknown>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean))) : [];
}

function iso(value: string, field: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${field}_invalid`);
  return parsed.toISOString();
}

function caseCode(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!normalized) throw new Error('caseCode_required');
  return normalized.slice(0, 80);
}

export async function registerReferenceCase(input: RegisterReferenceCaseInput) {
  const service = createServiceSupabaseClient();
  const objectId = input.objectId.trim();
  const title = input.title.trim();
  const cohort = input.cohort.trim();
  const objectClass = normalizeAmvObjectClass(input.objectClass);
  const consentRequired = input.consentRequired ?? ['person', 'organization', 'movement'].includes(objectClass);
  if (!objectId) throw new Error('objectId_required');
  if (!title) throw new Error('title_required');
  if (!cohort) throw new Error('cohort_required');
  if (consentRequired && !input.consentEvidenceId) throw new Error('consent_evidence_required');

  const payload = {
    case_code: caseCode(input.caseCode),
    entity_id: input.entityId?.trim() || null,
    object_id: objectId,
    object_class: objectClass,
    title,
    manifestation: input.manifestation?.trim() || null,
    cohort,
    prospective: input.prospective,
    status: input.status ?? 'REGISTERED',
    opened_at: iso(input.openedAt, 'openedAt'),
    closed_at: input.closedAt ? iso(input.closedAt, 'closedAt') : null,
    t0_cutoff: iso(input.t0Cutoff, 't0Cutoff'),
    phase_status: input.phaseStatus ?? {},
    fields_documented: Array.from(new Set(input.fieldsDocumented ?? [])),
    missing_fields: Array.from(new Set(input.missingFields ?? [])),
    prediction_run_id: input.predictionRunId ?? null,
    intervention_id: input.interventionId ?? null,
    outcome_id: input.outcomeId ?? null,
    model_key: input.modelKey ?? null,
    model_version: input.modelVersion ?? null,
    operator_id: input.operatorId ?? null,
    second_operator_id: input.secondOperatorId ?? null,
    consent_required: consentRequired,
    consent_evidence_id: input.consentEvidenceId ?? null,
    metadata: input.metadata ?? {},
  };

  const result = await service.from('sfi_reference_cases')
    .upsert(payload, { onConflict: 'case_code' })
    .select('*')
    .single();
  if (result.error || !result.data) throw new Error(`REFERENCE_CASE_UPSERT_FAILED:${result.error?.message ?? 'unknown'}`);
  return result.data as Row;
}

export async function linkCaseEvidence(input: {
  caseId: string;
  evidenceSource: string;
  evidenceId: string;
  relationType: CaseEvidenceRelation;
  note?: string | null;
  createdBy?: string | null;
}) {
  const service = createServiceSupabaseClient();
  if (!input.caseId.trim() || !input.evidenceSource.trim() || !input.evidenceId.trim()) throw new Error('case_evidence_link_fields_required');
  const result = await service.from('sfi_case_evidence_links').upsert({
    case_id: input.caseId,
    evidence_source: input.evidenceSource.trim(),
    evidence_id: input.evidenceId.trim(),
    relation_type: input.relationType,
    note: input.note?.trim() || null,
    created_by: input.createdBy ?? null,
  }, { onConflict: 'case_id,evidence_source,evidence_id,relation_type' }).select('*').single();
  if (result.error || !result.data) throw new Error(`CASE_EVIDENCE_LINK_FAILED:${result.error?.message ?? 'unknown'}`);
  return result.data as Row;
}

export async function upsertStudioEvaluationCase(input: {
  objectId: string;
  objectTitle: string;
  objectClass: string;
  themes: string[];
  generatedAt: string;
  gate: AmvPredictionGate;
  externalEvidence: ExternalEvidenceVector;
  mihmVariables: Array<{ key: string; value: number | null; evidenceIds: string[] }>;
  synthesisEvidenceId?: string | null;
  projectionEvidenceId?: string | null;
  prediction?: { id: string | null; modelKey: string; modelVersion: number } | null;
  operatorId: string;
}) {
  const fieldsDocumented = [
    ...input.mihmVariables.filter((item) => item.value !== null).map((item) => `mihm.${item.key}`),
    ...input.externalEvidence.documentedKeys.map((item) => `external.${item}`),
  ];
  const missingFields = [
    ...input.mihmVariables.filter((item) => item.value === null).map((item) => `mihm.${item.key}`),
    ...input.externalEvidence.missingKeys.map((item) => `external.${item}`),
  ];
  const row = await registerReferenceCase({
    caseCode: `STUDIO-${input.objectId.slice(0, 8)}`,
    objectId: input.objectId,
    objectClass: input.objectClass,
    title: input.objectTitle,
    manifestation: 'studio_object_evaluation',
    cohort: input.themes[0] ?? normalizeAmvObjectClass(input.objectClass),
    prospective: true,
    status: input.prediction?.id ? 'WAITING_OUTCOME' : 'OBSERVING',
    openedAt: input.generatedAt,
    t0Cutoff: input.generatedAt,
    phaseStatus: {
      phase0: 'READY',
      phase1: input.gate.phase1.state,
      phase2: input.gate.phase2.state,
      phase3: input.prediction?.id ? 'PROVISIONAL_NO_HISTORICAL_CALIBRATION' : input.gate.state,
      phase4: 'NOT_EXECUTED',
      phase5: 'PENDING',
      phase6: 'NOT_CALIBRATED',
    },
    fieldsDocumented,
    missingFields,
    predictionRunId: input.prediction?.id ?? null,
    modelKey: input.prediction?.modelKey ?? null,
    modelVersion: input.prediction?.modelVersion ?? null,
    operatorId: input.operatorId,
    consentRequired: input.gate.consent.required,
    consentEvidenceId: input.gate.consent.evidenceId,
    metadata: {
      themes: input.themes,
      epistemicLabel: input.gate.epistemicLabel,
      externalEvidenceStatus: input.externalEvidence.status,
      externalEvidenceCoverage: input.externalEvidence.coverage,
    },
  });
  const id = String(row.id);
  const links: Array<Promise<Row>> = [];
  for (const evidenceId of input.mihmVariables.flatMap((item) => item.evidenceIds)) {
    if (evidenceId) links.push(linkCaseEvidence({ caseId: id, evidenceSource: 'studio_feature_or_trace', evidenceId, relationType: 'SUPPORTS', createdBy: input.operatorId }));
  }
  for (const observation of input.externalEvidence.observations) {
    links.push(linkCaseEvidence({ caseId: id, evidenceSource: 'sfi_external_evidence_observations', evidenceId: observation.id, relationType: 'CONTEXTUALIZES', createdBy: input.operatorId }));
  }
  if (input.synthesisEvidenceId) links.push(linkCaseEvidence({ caseId: id, evidenceSource: 'studio_evidence_traces', evidenceId: input.synthesisEvidenceId, relationType: 'SUPPORTS', createdBy: input.operatorId }));
  if (input.projectionEvidenceId) links.push(linkCaseEvidence({ caseId: id, evidenceSource: 'studio_evidence_traces', evidenceId: input.projectionEvidenceId, relationType: 'CONTEXTUALIZES', createdBy: input.operatorId }));
  if (input.prediction?.id) links.push(linkCaseEvidence({ caseId: id, evidenceSource: 'sfi_predictive_runs', evidenceId: input.prediction.id, relationType: 'CONTEXTUALIZES', createdBy: input.operatorId }));
  await Promise.all(links);
  return row;
}

export async function bootstrapStudioReferenceCases(operatorId: string) {
  const service = createServiceSupabaseClient();
  const [tracesResult, runsResult] = await Promise.all([
    service.from('studio_evidence_traces').select('id,object_id,source,created_at').in('source', ['studio_object_context_synthesis_v1', 'studio_field_projection_v2']).order('created_at', { ascending: true }).limit(1000),
    service.from('sfi_predictive_runs').select('id,subject_id,model_version,status,created_at').eq('scope', 'studio').eq('subject_type', 'studio_object').order('created_at', { ascending: true }).limit(1000),
  ]);
  if (tracesResult.error && runsResult.error) throw new Error(`REFERENCE_BOOTSTRAP_SOURCES_FAILED:${tracesResult.error.message}|${runsResult.error.message}`);
  const traces = rows(tracesResult.data);
  const runs = rows(runsResult.data);
  const objectIds = Array.from(new Set([
    ...traces.map((item) => text(item.object_id)),
    ...runs.map((item) => text(item.subject_id)),
  ].filter((item): item is string => Boolean(item))));
  if (!objectIds.length) return { created: 0, cases: [] as Row[] };
  const objectsResult = await service.from('studio_objects').select('id,title,object_type,metadata,created_at').in('id', objectIds);
  if (objectsResult.error) throw new Error(`REFERENCE_BOOTSTRAP_OBJECTS_FAILED:${objectsResult.error.message}`);
  const objects = rows(objectsResult.data);
  const created: Row[] = [];
  for (const object of objects) {
    const objectId = String(object.id);
    const objectTraces = traces.filter((item) => item.object_id === objectId);
    const objectRuns = runs.filter((item) => item.subject_id === objectId);
    const firstAt = [...objectTraces.map((item) => String(item.created_at)), ...objectRuns.map((item) => String(item.created_at)), String(object.created_at)].filter(Boolean).sort()[0] ?? new Date().toISOString();
    const latestRun = objectRuns[objectRuns.length - 1] ?? null;
    const metadata = record(object.metadata);
    const themes = stringArray(metadata.atlasThemes);
    created.push(await registerReferenceCase({
      caseCode: `STUDIO-${objectId.slice(0, 8)}`,
      objectId,
      objectClass: String(object.object_type ?? 'other'),
      title: String(object.title ?? 'SIN TÍTULO'),
      manifestation: 'persisted_studio_object',
      cohort: themes[0] ?? normalizeAmvObjectClass(object.object_type),
      prospective: false,
      status: latestRun ? 'WAITING_OUTCOME' : 'OBSERVING',
      openedAt: firstAt,
      t0Cutoff: firstAt,
      phaseStatus: {
        phase0: 'READY',
        phase1: objectTraces.some((item) => item.source === 'studio_object_context_synthesis_v1') ? 'OBSERVED_NOT_REEVALUATED' : 'MISSING',
        phase2: objectTraces.some((item) => item.source === 'studio_field_projection_v2') ? 'OBSERVED_NOT_REEVALUATED' : 'MISSING',
        phase3: latestRun ? 'PROVISIONAL_NO_HISTORICAL_CALIBRATION' : 'MISSING',
        phase4: 'UNKNOWN',
        phase5: 'PENDING',
        phase6: 'NOT_CALIBRATED',
      },
      predictionRunId: text(latestRun?.id),
      modelVersion: typeof latestRun?.model_version === 'number' ? latestRun.model_version : null,
      operatorId,
      consentRequired: ['person', 'organization', 'movement'].includes(normalizeAmvObjectClass(object.object_type)),
      consentEvidenceId: text(record(metadata.amvConsent ?? metadata.consent).evidenceId),
      metadata: { themes, bootstrapSource: 'persisted_studio_sources', retrospectiveRegistration: true },
    }));
  }
  return { created: created.length, cases: created };
}

export async function readReferenceBank(filters: { cohort?: string | null; objectClass?: string | null; status?: string | null } = {}) {
  const service = createServiceSupabaseClient();
  let query = service.from('sfi_reference_cases').select('*').order('opened_at', { ascending: false }).limit(500);
  if (filters.cohort) query = query.eq('cohort', filters.cohort);
  if (filters.objectClass) query = query.eq('object_class', normalizeAmvObjectClass(filters.objectClass));
  if (filters.status) query = query.eq('status', filters.status);
  const casesResult = await query;
  if (casesResult.error) throw new Error(`REFERENCE_BANK_READ_FAILED:${casesResult.error.message}`);
  const cases = rows(casesResult.data);
  if (!cases.length) return { cases: [], cohorts: [], objectClasses: [], counts: { total: 0, closed: 0, prospective: 0 } };
  const caseIds = cases.map((item) => String(item.id));
  const runIds = cases.map((item) => text(item.prediction_run_id)).filter((item): item is string => Boolean(item));
  const [linksResult, runsResult, outcomesResult, learningResult, externalResult] = await Promise.all([
    service.from('sfi_case_evidence_links').select('*').in('case_id', caseIds).order('created_at', { ascending: true }),
    runIds.length ? service.from('sfi_predictive_runs').select('*').in('id', runIds) : Promise.resolve({ data: [], error: null }),
    runIds.length ? service.from('sfi_predictive_outcomes').select('*').in('run_id', runIds) : Promise.resolve({ data: [], error: null }),
    runIds.length ? service.from('sfi_predictive_learning_events').select('*').in('run_id', runIds) : Promise.resolve({ data: [], error: null }),
    service.from('sfi_external_evidence_observations').select('id,case_id,object_id,metric_key,reliability,epistemic_class,captured_at').in('case_id', caseIds),
  ]);
  const warnings = [linksResult.error, runsResult.error, outcomesResult.error, learningResult.error, externalResult.error].filter(Boolean).map((item) => item?.message ?? 'unknown');
  const links = rows(linksResult.data);
  const runs = rows(runsResult.data);
  const outcomes = rows(outcomesResult.data);
  const learning = rows(learningResult.data);
  const external = rows(externalResult.data);
  const result = cases.map((item) => {
    const id = String(item.id);
    const runId = text(item.prediction_run_id);
    const run = runs.find((row) => String(row.id) === runId) ?? null;
    const outcome = outcomes.find((row) => String(row.id) === text(item.outcome_id)) ?? outcomes.find((row) => String(row.run_id) === runId) ?? null;
    const learningEvents = learning.filter((row) => String(row.run_id) === runId);
    const errorPayload = record(outcome?.error_payload);
    return {
      ...item,
      evidenceLinks: links.filter((row) => String(row.case_id) === id),
      externalEvidence: external.filter((row) => String(row.case_id) === id || String(row.object_id) === String(item.object_id)),
      predictionAtT0: run ? {
        value: run.prediction ?? null,
        lowerBound: run.lower_bound ?? null,
        upperBound: run.upper_bound ?? null,
        confidence: run.confidence ?? null,
        timestamp: run.created_at ?? null,
        calibrationStatus: run.calibration_status ?? null,
        modelVersion: run.model_version ?? null,
      } : null,
      observedOutcome: outcome ? {
        value: outcome.actual_value ?? null,
        timestamp: outcome.observed_at ?? null,
        sourceQuality: outcome.source_quality ?? null,
        sourceRef: outcome.source_ref ?? null,
      } : null,
      predictionError: errorPayload.residual ?? null,
      absoluteError: errorPayload.absoluteError ?? null,
      squaredError: errorPayload.squaredError ?? null,
      learningEvents,
    };
  });
  return {
    cases: result,
    cohorts: Array.from(new Set(cases.map((item) => String(item.cohort)))).sort(),
    objectClasses: Array.from(new Set(cases.map((item) => String(item.object_class)))).sort(),
    counts: {
      total: cases.length,
      closed: cases.filter((item) => item.status === 'CLOSED').length,
      prospective: cases.filter((item) => item.prospective === true).length,
    },
    warnings,
  };
}
