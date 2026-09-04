import 'server-only';

import { getSfiServiceProfile } from '@/core/contracts/sfi';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readUniversalCycleHistory, type UniversalCycleHistory } from '@/lib/sfi/universalSignalCycle';

type Row = Record<string, unknown>;

function row(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function text(value: unknown, max = 6000) { return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null; }
function list(value: unknown, max = 250) { return Array.isArray(value) ? value.slice(0, max) : []; }
function strings(value: unknown, max = 100) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, max) : []; }
function payload(value: unknown) { return row(row(value).payload); }
function sequence(value: unknown) { const parsed = Number(row(value).sequence); return Number.isFinite(parsed) ? parsed : -1; }
function firstNonEmpty(...values: unknown[]) { for (const value of values) { const candidate = text(value); if (candidate) return candidate; } return null; }
function latestNamed(history: UniversalCycleHistory, name: string) {
  const values = (history.events ?? []).filter((item) => text(row(item).event_name) === name);
  return values.length ? row(values[values.length - 1]) : null;
}
function statements(values: unknown[]) {
  return values.flatMap((value) => {
    const item = row(value);
    const statement = firstNonEmpty(item.statement, item.hypothesis, item.claim, item.description, item.prediction, item.summary);
    return statement ? [{ statement, confidence: typeof item.confidence === 'number' ? item.confidence : null, id: text(item.id) }] : [];
  });
}

export async function readInteractiveCaseDossier(caseId: string) {
  const db = createServiceSupabaseClient();
  const caseResult = await db.from('sfi_cases')
    .select('id,tenant_id,project_id,client_id,contract_version,version,service_profile_id,subject,scope,system_boundary_ref,temporal_window,lineage,uncertainty,governance,status,created_at,updated_at,closed_at')
    .eq('id', caseId)
    .is('deleted_at', null)
    .maybeSingle();
  if (caseResult.error) throw new Error(`SFI_CASE_READ_FAILED:${caseResult.error.message}`);
  if (!caseResult.data) throw new Error('SFI_CASE_NOT_FOUND');
  const caseRow = caseResult.data as Row;
  const projectId = text(caseRow.project_id);
  const [objects, reports, project] = await Promise.all([
    db.from('sfi_case_objects').select('*').eq('case_id', caseId).order('created_at', { ascending: true }),
    db.from('sfi_case_reports').select('id,report_contract,version,report_payload,execution_authority,generated_at,created_at').eq('case_id', caseId).order('generated_at', { ascending: false }),
    projectId
      ? db.from('sfi_projects').select('id,project_key,name,description,attractor_ref,trajectory_ref,status,updated_at').eq('id', projectId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (objects.error) throw new Error(`SFI_CASE_OBJECT_LIST_FAILED:${objects.error.message}`);
  if (reports.error) throw new Error(`SFI_CASE_REPORT_LIST_FAILED:${reports.error.message}`);
  if (project.error) throw new Error(`SFI_PROJECT_READ_FAILED:${project.error.message}`);

  const objectRows = (objects.data ?? []) as Row[];
  const profile = getSfiServiceProfile(String(caseRow.service_profile_id ?? ''));
  const presentSourceTypes = [...new Set(objectRows
    .filter((item) => String(item.object_kind ?? '').toUpperCase() === 'SOURCE')
    .map((item) => text(row(item.payload).sourceType))
    .filter((item): item is string => Boolean(item)))].sort();
  const requiredSources = profile ? [...profile.requiredSources] : [];
  const missingSources = requiredSources.filter((source) => !presentSourceTypes.includes(source));

  return {
    caseRecord: {
      id: String(caseRow.id),
      tenantId: String(caseRow.tenant_id),
      projectId,
      clientId: text(caseRow.client_id),
      contract: text(caseRow.contract_version),
      version: text(caseRow.version),
      serviceProfileId: String(caseRow.service_profile_id ?? ''),
      subject: String(caseRow.subject ?? ''),
      scope: String(caseRow.scope ?? ''),
      systemBoundaryRef: caseRow.system_boundary_ref ?? null,
      temporalWindow: caseRow.temporal_window ?? null,
      lineage: Array.isArray(caseRow.lineage) ? caseRow.lineage : [],
      uncertainty: caseRow.uncertainty ?? null,
      governance: caseRow.governance ?? null,
      status: String(caseRow.status ?? ''),
      createdAt: text(caseRow.created_at),
      updatedAt: text(caseRow.updated_at),
      closedAt: text(caseRow.closed_at),
    },
    objects: objectRows,
    reports: reports.data ?? [],
    project: project.data ?? null,
    readiness: {
      requiredSources,
      presentSourceTypes,
      missingSources,
      sourceCoverage: requiredSources.length ? (requiredSources.length - missingSources.length) / requiredSources.length : 1,
      readyForAnalysis: Boolean(profile) && missingSources.length === 0,
    },
    closure: {
      status: String(caseRow.status ?? ''),
      closedAt: text(caseRow.closed_at),
      requiresUserDecision: String(caseRow.status ?? '') === 'AWAITING_USER_CLOSE',
    },
    readPlan: {
      caseReads: 1,
      caseObjectReads: 1,
      caseReportReads: 1,
      projectReads: projectId ? 1 : 0,
      duplicateCaseReads: 0,
      duplicateMembershipReads: 0,
    },
  };
}

function synthesisSection(history: UniversalCycleHistory) {
  const event = latestNamed(history, 'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED');
  if (!event) return null;
  const body = row(payload(event).synthesis);
  return {
    status: firstNonEmpty(body.status, payload(event).status),
    summary: firstNonEmpty(body.summary, body.executiveSummary, body.narrative, body.analysis),
    primaryHypothesis: body.primaryHypothesis ?? null,
    rivalHypotheses: list(body.rivalHypotheses, 12),
    predictions: list(body.predictions, 20),
    recommendations: list(body.recommendations, 20),
    warnings: list(body.warnings, 30),
  };
}
function structuredSection(history: UniversalCycleHistory) {
  const event = history.structuredResults?.length ? row(history.structuredResults[history.structuredResults.length - 1]) : null;
  if (!event) return null;
  const result = row(payload(event).result);
  const partition = row(result.epistemicPartition ?? result.partition);
  const material = row(result.materialIdentity ?? result.material ?? result.sourceIdentity);
  return {
    eventId: text(event.event_id),
    observedAt: text(event.occurred_at),
    material: {
      logicalName: firstNonEmpty(material.logicalFilename, material.logicalName, result.logicalFilename, result.filename, result.name),
      observedName: firstNonEmpty(material.observedTransportFilename, material.observedName, result.observedTransportFilename),
      sha256: firstNonEmpty(material.sha256, material.hash, result.sha256, result.objectHash),
      sizeBytes: material.sizeBytes ?? material.size ?? result.sizeBytes ?? result.size ?? null,
    },
    measurements: row(result.measurements ?? result.metrics ?? result.profile),
    observed: list(partition.observed ?? result.observed, 250),
    derived: list(partition.derived ?? result.derived, 250),
    inferred: list(partition.inferred ?? result.inferred, 250),
    unresolved: list(partition.unresolved ?? partition.missing ?? result.unresolved ?? result.undetermined, 250),
    hypotheses: list(result.hypotheses, 50),
    rivals: list(result.rivals ?? result.rivalHypotheses, 50),
    predictions: list(result.predictions, 50),
    recommendations: list(result.recommendations ?? result.perturbations, 50),
  };
}
function evidenceSection(history: UniversalCycleHistory) {
  const lifecycle = new Set([
    'SFI_UNIVERSAL_CYCLE_OPENED','SFI_UNIVERSAL_CYCLE_RESUMED','SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED',
    'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED','SFI_UNIVERSAL_RETURN_PLAN_RECORDED','SFI_UNIVERSAL_RETURN_RECORDED',
    'SFI_UNIVERSAL_RETURN_CONTRASTED','SFI_UNIVERSAL_CLOSURE_RECOMMENDED','SFI_UNIVERSAL_CYCLE_CLOSED',
    'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED','SFI_UNIVERSAL_LEARNING_PROMOTED','SFI_UNIVERSAL_LEARNING_REJECTED',
  ]);
  return (history.events ?? []).flatMap((value) => {
    const event = row(value);
    const name = text(event.event_name) ?? '';
    const epistemicClass = text(event.epistemic_class) ?? '';
    if (lifecycle.has(name) || !['observed','imported','extracted','canonical'].includes(epistemicClass)) return [];
    const body = payload(event);
    const metadata = row(body.metadata);
    const attachment = row(metadata.attachment ?? body.attachment);
    return [{
      eventId: text(event.event_id), eventName: name, epistemicClass, observedAt: text(event.occurred_at),
      title: firstNonEmpty(body.title, body.name, attachment.fileName, name),
      url: firstNonEmpty(body.sourceUrl, body.url, row(body.source).url),
      fileName: firstNonEmpty(attachment.fileName, body.fileName),
      sha256: firstNonEmpty(attachment.sha256, body.sha256, body.objectHash, body.evidenceHash),
      sizeBytes: attachment.sizeBytes ?? body.sizeBytes ?? null,
      source: firstNonEmpty(body.source, row(event.source).sourceId),
      summary: firstNonEmpty(body.summary, body.content, body.notes),
    }];
  });
}

export async function readInteractiveCycleDossier(cycleId: string) {
  const history = await readUniversalCycleHistory(cycleId);
  if (!history.ok) throw new Error(history.error ?? 'cycle_history_unavailable');
  const opened = row(history.opened);
  const openedPayload = payload(opened);
  const cognitive = history.cognitiveRuns?.length ? row(history.cognitiveRuns[history.cognitiveRuns.length - 1]) : null;
  const cognitivePayload = payload(cognitive);
  const returnPlanEvent = latestNamed(history, 'SFI_UNIVERSAL_RETURN_PLAN_RECORDED');
  const returnPlan = row(payload(returnPlanEvent).plan);
  const lastReturn = history.returns?.length ? row(history.returns[history.returns.length - 1]) : null;
  const lastContrast = history.returnContrasts?.length ? row(history.returnContrasts[history.returnContrasts.length - 1]) : null;
  const recommendation = latestNamed(history, 'SFI_UNIVERSAL_CLOSURE_RECOMMENDED');
  const denial = latestNamed(history, 'SFI_UNIVERSAL_REPORT_DENIED_BY_USER');
  const closure = history.closures?.length ? row(history.closures[history.closures.length - 1]) : null;
  const learningCandidate = latestNamed(history, 'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED');
  const recommendationActive = Boolean(recommendation) && sequence(recommendation) > sequence(denial) && !closure;
  const structured = structuredSection(history);
  const synthesis = synthesisSection(history);
  const state = closure ? 'CLOSED' : recommendationActive ? 'AWAITING_USER_CLOSE' : lastContrast ? 'CALIBRATED' : lastReturn ? 'RETURN_RECORDED' : history.state ?? 'OPEN';

  return {
    contract: 'SFI-HUMAN-CASE-DOSSIER-1.1',
    kind: 'UNIVERSAL_CYCLE', cycleId: history.cycleId, state,
    title: firstNonEmpty(openedPayload.question, openedPayload.objectKey, structured?.material.logicalName, `Ciclo ${history.cycleId}`),
    objective: firstNonEmpty(openedPayload.objective), openedAt: text(opened.occurred_at), eventCount: history.events.length,
    material: structured?.material ?? { logicalName: null, observedName: null, sha256: firstNonEmpty(openedPayload.objectHash), sizeBytes: null },
    structured,
    cognition: cognitive ? {
      completed: cognitivePayload.completed === true,
      executedAgents: list(cognitivePayload.executedAgents, 100), missingAgents: list(cognitivePayload.missingAgents, 100),
      hypotheses: statements(list(cognitivePayload.hypotheses, 100)), predictions: list(cognitivePayload.predictions, 100),
      contradictions: list(cognitivePayload.contradictions, 100), risks: list(cognitivePayload.risks, 100), opportunities: list(cognitivePayload.opportunities, 100),
    } : null,
    synthesis,
    evidence: evidenceSection(history),
    returnPlan: returnPlanEvent ? {
      status: firstNonEmpty(returnPlan.status), acquisitionState: firstNonEmpty(returnPlan.acquisitionState), responsibility: firstNonEmpty(returnPlan.responsibility),
      humanInputRequired: returnPlan.humanInputRequired === true, requiredHumanInput: list(returnPlan.requiredHumanInput, 30),
      expectedSignals: list(returnPlan.expectedSignals, 30), contradictionSignals: list(returnPlan.contradictionSignals, 30), next: firstNonEmpty(returnPlan.next),
    } : null,
    return: lastReturn ? { eventId: text(lastReturn.event_id), observedAt: text(lastReturn.occurred_at), outcome: payload(lastReturn).outcome ?? null, classification: firstNonEmpty(payload(lastReturn).classification), evidenceRefs: strings(payload(lastReturn).evidenceRefs), notes: firstNonEmpty(payload(lastReturn).notes) } : null,
    contrast: lastContrast ? { eventId: text(lastContrast.event_id), observedAt: text(lastContrast.occurred_at), classification: firstNonEmpty(payload(lastContrast).classification), calibrationStatus: firstNonEmpty(payload(lastContrast).calibrationStatus), expectedSignals: list(payload(lastContrast).expectedSignals, 50), contradictionSignals: list(payload(lastContrast).contradictionSignals, 50), evidenceRefs: strings(payload(lastContrast).returnEvidenceRefs), reason: firstNonEmpty(payload(lastContrast).classificationReason) } : null,
    closure: { readyForUser: recommendationActive, recommendationEventId: recommendation ? text(recommendation.event_id) : null, recommendation: recommendation ? payload(recommendation).closure ?? null : null, deniedEventId: denial ? text(denial.event_id) : null, closedEventId: closure ? text(closure.event_id) : null, finalAuthority: 'AUTHENTICATED_USER' },
    learning: learningCandidate ? { eventId: text(learningCandidate.event_id), candidate: payload(learningCandidate).candidate ?? null } : null,
    next: closure ? 'Reporte cerrado por decisión humana. El aprendizaje queda sujeto a su propia gobernanza.' : recommendationActive ? 'SFI terminó el trabajo metodológico disponible. Revisa el reporte y decide ACEPTAR o DENEGAR.' : returnPlan.humanInputRequired === true ? 'SFI necesita evidencia o autorización humana indicada en el plan de retorno antes de continuar.' : 'SFI puede continuar automáticamente mientras exista una acción permitida y evidencia suficiente.',
    boundary: 'Este expediente reconstruye el mismo ciclo existente. No abre un Case, no reprocesa el material y no convierte inferencias en evidencia.',
    readPlan: { cycleHistoryReads: 1, fullWorkboardReads: 0, continuityDashboardReads: 0, duplicateCycleHistoryReads: 0 },
  };
}
