import { NextResponse } from 'next/server';
import { normalizeProposalState, proposalStateMeaning } from '@/lib/governance/proposalLifecycle';
import { requireRootViewer } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, any>;
type RootViewerSuccess = Extract<Awaited<ReturnType<typeof requireRootViewer>>, { ok: true }>;
type RootService = RootViewerSuccess['ctx']['service'];

function rec(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function text(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function arr(value: unknown): any[] { return Array.isArray(value) ? value : []; }
function strings(value: unknown): string[] { return arr(value).filter((item): item is string => typeof item === 'string' && item.trim().length > 0); }

function proposalType(value: Row) {
  const expected = rec(value.expected_field_delta);
  const payload = rec(expected.payload);
  const proposal = rec(payload.proposal);
  const proportionality = rec(value.proportionality_check);
  return text(value.proposal_type)
    ?? text(expected.proposalType)
    ?? text(expected.proposal_type)
    ?? text(proposal.proposalType)
    ?? text(proposal.proposal_type)
    ?? text(proportionality.proposalType)
    ?? text(proportionality.proposal_type)
    ?? 'unknown';
}

function evidenceCandidate(value: Row) {
  const expected = rec(value.expected_field_delta);
  const payload = rec(expected.payload);
  const source = rec(payload.source);
  return {
    id: String(value.id ?? ''),
    status: normalizeProposalState(value.status),
    title: text(value.title) ?? text(source.title) ?? 'Evidence candidate',
    description: text(value.description),
    source: {
      title: text(source.title),
      url: text(source.url),
      publisher: text(source.publisher),
      sourceType: text(source.sourceType),
      snippet: text(source.snippet),
      referenceHash: text(source.referenceHash),
      contentHash: text(source.contentHash),
      reliability: typeof source.reliability === 'number' ? source.reliability : null,
      retrievedAt: text(source.retrievedAt),
    },
    requestNote: text(payload.requestNote),
    warnings: strings(payload.warnings),
    epistemicBoundary: text(payload.epistemicBoundary),
    identityBoundary: text(payload.identityBoundary),
  };
}

function proposalActionModel(status: string, candidates: ReturnType<typeof evidenceCandidate>[]) {
  const proposedCandidates = candidates.filter((item) => item.status === 'proposed');
  const acceptedCandidates = candidates.filter((item) => item.status === 'accepted');
  if (status === 'proposed') return {
    humanActionRequired: true,
    question: '¿Apruebas el diseño, solicitas evidencia adicional o rechazas esta propuesta?',
    actions: [
      { id: 'accept', label: 'APROBAR DISEÑO', consequence: 'Cambia a design_approved. No ejecuta, publica ni canoniza.' },
      { id: 'request_evidence', label: 'PEDIR EVIDENCIA', consequence: 'Retiene la decisión en waiting_evidence y devuelve la siguiente acción a SFI/Evidence Hunter.' },
      { id: 'deny', label: 'RECHAZAR', consequence: 'Cambia a rejected preservando lineage, evidencia y recibo de decisión.' },
    ],
    nextOwnerByAction: { accept: 'SFI / project_execution_manager', request_evidence: 'SFI / evidence_hunter', deny: 'TERMINAL' },
  };
  if (status === 'waiting_evidence' && proposedCandidates.length) return {
    humanActionRequired: true,
    question: `SFI encontró ${proposedCandidates.length} candidato${proposedCandidates.length === 1 ? '' : 's'} de evidencia. Revísalos antes de volver a decidir la propuesta.`,
    actions: [
      { id: 'review_evidence', label: 'REVISAR EVIDENCIA', consequence: 'Cada fuente se acepta o rechaza por separado. Aceptarla no verifica automáticamente todas sus afirmaciones.' },
      { id: 'deny', label: 'RECHAZAR PROPUESTA', consequence: 'Cierra la propuesta como rejected sin borrar la evidencia ya registrada.' },
    ],
    nextOwnerByAction: { review_evidence: 'ROOT → luego SFI reconcilia evidence readiness', deny: 'TERMINAL' },
  };
  if (status === 'waiting_evidence') return {
    humanActionRequired: false,
    question: acceptedCandidates.length
      ? 'Ya existe evidencia aceptada. SFI debe reconciliar readiness; no necesitas volver a pedir la misma evidencia.'
      : 'La propuesta espera evidencia y todavía no existe un candidato que requiera tu revisión.',
    actions: [{ id: 'deny', label: 'RECHAZAR PROPUESTA', consequence: 'Disponible si decides abandonar la propuesta; no es una obligación pendiente.' }],
    nextOwnerByAction: { wait: acceptedCandidates.length ? 'SFI / transition_watchdog' : 'SFI / evidence_hunter', deny: 'TERMINAL' },
  };
  return { humanActionRequired: false, question: 'Este objeto es revisable, pero no tiene una transición humana contractual ejecutable desde NEEDS YOU.', actions: [], nextOwnerByAction: {} };
}

function reportActionModel(approvalStatus: string) {
  if (approvalStatus === 'queued_for_approval') return {
    humanActionRequired: true,
    question: '¿Apruebas este reporte para uso humano o lo rechazas?',
    actions: [
      { id: 'accept', label: 'APROBAR PARA USO HUMANO', consequence: 'Cambia el reporte a approved_for_human_use. No lo publica, ejecuta ni vuelve verdadero.' },
      { id: 'deny', label: 'RECHAZAR REPORTE', consequence: 'Cambia el reporte a rejected y conserva contenido, evidencia, limitaciones y recibo.' },
    ],
    nextOwnerByAction: { accept: 'HUMAN_READER / downstream use under existing authority', deny: 'TERMINAL_REPORT_REJECTION' },
  };
  if (approvalStatus === 'waiting_evidence') return {
    humanActionRequired: false,
    question: 'El reporte está retenido por evidencia. El writer actual no crea una adquisición verificable; ROOT no debe repetir “pedir evidencia” como si existiera un owner automático.',
    actions: [],
    nextOwnerByAction: { wait: 'REPORT_EVIDENCE_REVIEW_UNRESOLVED' },
  };
  return { humanActionRequired: false, question: 'Este reporte ya no tiene una decisión soberana pendiente.', actions: [], nextOwnerByAction: {} };
}

async function reportDossier(service: RootService, id: string) {
  const reportRead = await service.from('sfi_cognitive_twin_runs')
    .select('id,task_id,role,status,objective,input_snapshot,output_envelope,evidence_refs,limitations,provider,model,created_at')
    .eq('id', id)
    .eq('role', 'report_agent')
    .maybeSingle();
  if (reportRead.error) return NextResponse.json({ ok: false, error: 'report_dossier_read_failed', details: reportRead.error.message }, { status: 503 });
  if (!reportRead.data) return NextResponse.json({ ok: false, error: 'report_not_found' }, { status: 404 });

  const report = reportRead.data as Row;
  const envelope = rec(report.output_envelope);
  const approval = rec(envelope.approval_queue);
  const snapshot = rec(report.input_snapshot);
  const approvalStatus = (text(approval.status) ?? 'unknown').toLowerCase();
  const evidenceRefs = strings(report.evidence_refs);
  const limitations = strings(report.limitations);
  const body = text(envelope.body) ?? text(envelope.report) ?? text(envelope.summary);
  const dossier = {
    contract: 'SFI-SOVEREIGN-DECISION-DOSSIER-1.1',
    kind: 'report', id,
    title: text(envelope.title) ?? text(report.objective) ?? 'Reporte institucional',
    proposalType: 'institutional_report',
    status: approvalStatus,
    statusMeaning: approvalStatus === 'queued_for_approval' ? 'Reporte generado y retenido hasta una decisión ROOT explícita para uso humano.' : approvalStatus === 'waiting_evidence' ? 'Reporte retenido porque la evidencia no está resuelta.' : 'Reporte sin decisión ROOT pendiente.',
    description: body,
    objective: text(report.objective),
    origin: { source: 'sfi_cognitive_twin_runs/report_agent', actorId: 'report_agent', credentialLabel: `${text(report.provider) ?? 'provider?'} / ${text(report.model) ?? 'model?'}`, submittedAt: text(report.created_at), createdAt: text(report.created_at), updatedAt: text(approval.decidedAt) ?? text(report.created_at) },
    risk: {
      level: limitations.length ? 'attention' : 'observed',
      state: limitations.length ? 'LIMITATIONS_PRESENT' : 'NO_PERSISTED_LIMITATION_TEXT',
      rationale: limitations.length ? `${limitations.length} limitación${limitations.length === 1 ? '' : 'es'} persistida${limitations.length === 1 ? '' : 's'}; revisa antes de aprobar para uso humano.` : 'No hay texto de limitación persistido en este run. Eso no convierte el contenido en verdad ni en evidencia.',
      confidence: null, assessedAt: text(report.created_at),
    },
    request: { humanApprovalRequired: approvalStatus === 'queued_for_approval', requestedAction: null, summary: 'ROOT decide únicamente si este reporte puede pasar a uso humano.' },
    evidenceCandidates: [], evidenceRefs, limitations,
    report: { taskId: text(report.task_id), reportType: text(envelope.type) ?? text(snapshot.reportType) ?? 'report', provider: text(report.provider), model: text(report.model), body },
    outcome: { recorded: Boolean(text(approval.founderDecision)), governanceDecision: text(approval.founderDecision), note: text(approval.founderNote), outcomeStatus: approvalStatus, returnEventId: null, expectedReturn: null, calibrationState: null, executionState: null, closureCondition: null, executionPlan: null },
    authorityBoundary: {
      approvalRequired: approvalStatus === 'queued_for_approval', executionAuthorizedByThisDecision: false, canonicalPromotionAuthorizedByThisDecision: false, publicationAuthorizedByThisDecision: false, truthAuthorizedByThisDecision: false,
      statement: 'Aprobar un reporte significa approved_for_human_use. No publica, contacta, ejecuta, establece verdad, cierra caso/ciclo ni promueve canon.',
    },
    actionability: reportActionModel(approvalStatus),
    terminalCondition: 'La decisión soberana de este objeto termina cuando ROOT lo aprueba para uso humano o lo rechaza. Publicación, ejecución, cierre y canon son autoridades separadas.',
    readWarnings: [],
  };
  return NextResponse.json({ ok: true, dossier, readPlan: { authGates: 1, reportReads: 1, proposalReads: 0, evidenceCandidateReads: 0, fullConsoleReads: 0, duplicateReportReads: 0 } }, { headers: { 'Cache-Control': 'private, no-store' } });
}

async function proposalDossier(service: RootService, id: string) {
  const [proposalRead, candidatesRead] = await Promise.all([
    service.from('action_proposals').select('*').eq('id', id).maybeSingle(),
    service.from('action_proposals').select('*').eq('expected_field_delta->payload->>parentProposalId', id).order('created_at', { ascending: false }).limit(30),
  ]);
  if (proposalRead.error) return NextResponse.json({ ok: false, error: 'proposal_dossier_read_failed', details: proposalRead.error.message }, { status: 503 });
  if (!proposalRead.data) return NextResponse.json({ ok: false, error: 'proposal_not_found' }, { status: 404 });

  const proposal = proposalRead.data as Row;
  const status = normalizeProposalState(proposal.status);
  const expected = rec(proposal.expected_field_delta);
  const expectedPayload = rec(expected.payload);
  const proportionality = rec(proposal.proportionality_check);
  const riskAssessment = rec(proportionality.riskAssessment);
  const outcome = rec(proposal.outcome);
  const outcomePatch = rec(outcome.payloadPatch);
  const requestedAction = rec(expectedPayload.requested_action ?? expectedPayload.requestedAction);
  const candidates = (candidatesRead.data ?? []).map((item: Row) => evidenceCandidate(item));
  const dossier = {
    contract: 'SFI-SOVEREIGN-DECISION-DOSSIER-1.1', kind: 'proposal', id,
    title: text(proposal.title) ?? proposalType(proposal), proposalType: proposalType(proposal), status, statusMeaning: proposalStateMeaning(status),
    description: text(proposal.description), objective: text(proposal.objective) ?? text(expected.objective) ?? text(expectedPayload.summary) ?? text(proposal.description),
    origin: { source: typeof expectedPayload.source === 'string' ? expectedPayload.source : text(rec(expectedPayload.source).url), actorId: text(expected.actorId), credentialLabel: text(expectedPayload.credential_label ?? expectedPayload.credentialLabel), submittedAt: text(expectedPayload.submitted_at ?? expectedPayload.submittedAt) ?? text(proposal.created_at), createdAt: text(proposal.created_at), updatedAt: text(proposal.updated_at) },
    risk: { level: text(proposal.risk_level) ?? text(riskAssessment.level) ?? 'unknown', state: text(riskAssessment.state) ?? text(proportionality.riskAssessmentState), rationale: text(riskAssessment.rationale), confidence: typeof riskAssessment.confidence === 'number' ? riskAssessment.confidence : null, assessedAt: text(riskAssessment.assessedAt) },
    request: { humanApprovalRequired: expectedPayload.human_approval_required === true || proportionality.approvalRequired === true || proposal.approval_required !== false, requestedAction: Object.keys(requestedAction).length ? requestedAction : null, summary: text(expectedPayload.summary) },
    evidenceCandidates: candidates,
    outcome: { recorded: outcomePatch.outcomeRecorded === true || outcome.outcomeRecorded === true, governanceDecision: text(outcomePatch.governanceDecision ?? outcome.governanceDecision), note: text(outcomePatch.note ?? outcomePatch.notes ?? outcome.note), outcomeStatus: text(outcomePatch.outcomeStatus ?? outcome.outcomeStatus), returnEventId: text(outcomePatch.returnEventId ?? outcome.returnEventId), expectedReturn: text(outcomePatch.expectedReturn ?? outcome.expectedReturn), calibrationState: text(outcomePatch.calibrationState ?? outcome.calibrationState), executionState: text(outcomePatch.executionState ?? outcome.executionState), closureCondition: text(outcomePatch.closureCondition ?? outcome.closureCondition), executionPlan: Object.keys(rec(outcomePatch.executionPlan ?? outcome.plan)).length ? rec(outcomePatch.executionPlan ?? outcome.plan) : null },
    authorityBoundary: { approvalRequired: proposal.approval_required !== false, executionAuthorizedByThisDecision: false, canonicalPromotionAuthorizedByThisDecision: false, statement: 'Una decisión de propuesta aprueba/rechaza/retiene el diseño. No equivale a ejecución, RETURN, cierre ni promoción canónica.' },
    actionability: proposalActionModel(status, candidates),
    terminalCondition: text(outcomePatch.closureCondition) ?? text(requestedAction.returnRequired) ?? text(requestedAction.requiredReturn) ?? 'No existe una condición terminal estructurada adicional en este registro; no se inventa una.',
    readWarnings: [candidatesRead.error?.message].filter(Boolean),
  };
  return NextResponse.json({ ok: true, dossier, readPlan: { authGates: 1, proposalReads: 1, evidenceCandidateReads: 1, reportReads: 0, fullConsoleReads: 0, duplicateProposalReads: 0 } }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function GET(request: Request) {
  const gate = await requireRootViewer('root.decision_dossier.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim() || null;
  const kind = url.searchParams.get('kind')?.trim().toLowerCase() || 'proposal';
  if (!id) return NextResponse.json({ ok: false, error: 'decision_id_required' }, { status: 400 });
  if (kind === 'report') return reportDossier(gate.ctx.service, id);
  if (kind === 'proposal') return proposalDossier(gate.ctx.service, id);
  return NextResponse.json({ ok: false, error: 'unsupported_decision_kind', allowed: ['proposal', 'report'] }, { status: 400 });
}
