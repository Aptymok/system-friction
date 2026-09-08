import { NextResponse } from 'next/server';
import { classifyProposalDecisionBoundary } from '@/lib/governance/rootDecisionBoundary';
import { normalizeProposalState, proposalStateMeaning } from '@/lib/governance/proposalLifecycle';
import { requireRootViewer } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, any>;
type RootViewerSuccess = Extract<Awaited<ReturnType<typeof requireRootViewer>>, { ok: true }>;
type RootService = RootViewerSuccess['ctx']['service'];

function rec(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function text(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function strings(value: unknown): string[] { return list(value).filter((item): item is string => typeof item === 'string' && item.trim().length > 0); }

function proposalType(value: Row) {
  const expected = rec(value.expected_field_delta);
  const payload = rec(expected.payload);
  const proportionality = rec(value.proportionality_check);
  return text(value.proposal_type)
    ?? text(expected.proposalType)
    ?? text(expected.proposal_type)
    ?? text(payload.proposalType)
    ?? text(payload.proposal_type)
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
    title: text(value.title) ?? text(source.title) ?? 'Fuente candidata',
    source: {
      title: text(source.title),
      url: text(source.url),
      publisher: text(source.publisher),
      sourceType: text(source.sourceType),
      retrievedAt: text(source.retrievedAt),
    },
    warnings: strings(payload.warnings),
  };
}

function rootReason(decisionClass: string) {
  if (decisionClass === 'LEARNING_PROMOTION') return 'ROOT decide porque SFI quiere convertir un aprendizaje candidato en conocimiento institucional activo.';
  if (decisionClass === 'CAPABILITY_IMPLEMENTATION') return 'ROOT decide porque la propuesta añade, elimina o cambia materialmente una capacidad institucional de SFI.';
  return 'ROOT decide porque la propuesta cambia una regla, autoridad, contrato, definición o configuración institucional.';
}

function acceptanceEffect(decisionClass: string) {
  if (decisionClass === 'LEARNING_PROMOTION') return 'El aprendizaje queda autorizado para promoción institucional bajo su contrato de aprendizaje. No convierte inferencia en observación ni evidencia débil en evidencia fuerte.';
  if (decisionClass === 'CAPABILITY_IMPLEMENTATION') return 'SFI queda autorizado para incorporar o cambiar la capacidad descrita. La ejecución, QA y RETURN siguen teniendo que demostrar que el cambio realmente funciona.';
  return 'El cambio institucional descrito queda autorizado. Sólo cambia la regla o autoridad expresamente indicada; no concede permisos implícitos adicionales.';
}

function denialEffect(decisionClass: string) {
  if (decisionClass === 'LEARNING_PROMOTION') return 'El aprendizaje no se incorpora al conocimiento institucional. Su evidencia, experimento y contraste permanecen reconstruibles.';
  if (decisionClass === 'CAPABILITY_IMPLEMENTATION') return 'SFI no incorpora ese cambio de capacidad. El defecto, necesidad o experimento que lo originó permanece registrado y puede buscar otra solución dentro de la autoridad existente.';
  return 'La regla o cambio institucional no se adopta. El expediente y la evidencia permanecen registrados.';
}

function sfiGain(decisionClass: string, title: string, requested: Row) {
  const explicit = text(requested.capabilityDelta)
    ?? text(requested.institutionalDelta)
    ?? text(requested.learningDelta)
    ?? text(requested.expectedCapability)
    ?? text(requested.expectedOutcome);
  if (explicit) return explicit;
  if (decisionClass === 'LEARNING_PROMOTION') return `SFI incorporaría como aprendizaje institucional el resultado descrito en “${title}”.`;
  if (decisionClass === 'CAPABILITY_IMPLEMENTATION') return `SFI incorporaría o modificaría la capacidad descrita en “${title}”.`;
  return `SFI cambiaría la regla o configuración institucional descrita en “${title}”.`;
}

function actionability(status: string, decisionClass: string) {
  if (status === 'proposed' || status === 'conflicted') return {
    humanActionRequired: true,
    question: decisionClass === 'LEARNING_PROMOTION'
      ? '¿Quieres incorporar este aprendizaje a SFI?'
      : decisionClass === 'CAPABILITY_IMPLEMENTATION'
        ? '¿Quieres que SFI incorpore este cambio de capacidad?'
        : '¿Quieres aplicar este cambio institucional?',
    actions: [
      { id: 'accept', label: 'ACEPTAR', consequence: acceptanceEffect(decisionClass) },
      { id: 'deny', label: 'DENEGAR', consequence: denialEffect(decisionClass) },
    ],
  };
  if (status === 'waiting_evidence') return {
    humanActionRequired: false,
    question: 'Todavía falta evidencia para esta decisión. SFI debe buscarla o declarar que no está disponible. No necesitas aprobar fuentes.',
    actions: [],
  };
  return { humanActionRequired: false, question: 'No hay una decisión ROOT ejecutable en este estado.', actions: [] };
}

async function proposalDossier(service: RootService, id: string) {
  const [proposalRead, candidatesRead, originEventsRead] = await Promise.all([
    service.from('action_proposals').select('*').eq('id', id).maybeSingle(),
    service.from('action_proposals').select('*').eq('expected_field_delta->payload->>parentProposalId', id).order('created_at', { ascending: false }).limit(30),
    service.from('epistemic_events')
      .select('event_id,event_name,epistemic_class,actor_id,source,lineage,payload,logbook_id,occurred_at')
      .eq('logbook_id', `proposal-risk:${id}`)
      .order('occurred_at', { ascending: true })
      .limit(40),
  ]);
  if (proposalRead.error) return NextResponse.json({ ok: false, error: 'proposal_dossier_read_failed', details: proposalRead.error.message }, { status: 503 });
  if (!proposalRead.data) return NextResponse.json({ ok: false, error: 'proposal_not_found' }, { status: 404 });

  const proposal = proposalRead.data as Row;
  const decisionClass = classifyProposalDecisionBoundary(proposal);
  if (decisionClass === 'OPERATIONAL_WORK') {
    return NextResponse.json({
      ok: false,
      error: 'operational_work_is_not_a_sovereign_decision',
      details: 'Este objeto puede observarse en su caso/ejecución correspondiente, pero no debe presentarse como algo que ROOT tenga que aceptar o denegar.',
    }, { status: 409 });
  }

  const status = normalizeProposalState(proposal.status);
  const expected = rec(proposal.expected_field_delta);
  const expectedPayload = rec(expected.payload);
  const requested = rec(expectedPayload.requested_action ?? expectedPayload.requestedAction);
  const proportionality = rec(proposal.proportionality_check);
  const riskAssessment = rec(proportionality.riskAssessment);
  const outcome = rec(proposal.outcome);
  const outcomePatch = rec(outcome.payloadPatch);
  const title = text(proposal.title) ?? proposalType(proposal);
  const description = text(proposal.description)
    ?? text(proposal.objective)
    ?? text(expected.objective)
    ?? text(expectedPayload.summary)
    ?? 'El registro no contiene una explicación adicional.';
  const actor = text(expected.actorId)
    ?? text(expectedPayload.actorId)
    ?? text(expectedPayload.credential_label ?? expectedPayload.credentialLabel)
    ?? 'Actor no normalizado en el registro legacy';
  const source = typeof expectedPayload.source === 'string'
    ? expectedPayload.source
    : text(rec(expectedPayload.source).url) ?? text(rec(expectedPayload.source).sourceId) ?? 'Origen no normalizado';
  const candidates = (candidatesRead.data ?? []).map((item: Row) => evidenceCandidate(item));
  const originEvents = (originEventsRead.data ?? []) as Row[];
  const evidenceRefs = [...new Set([
    ...strings(expectedPayload.evidenceRefs),
    ...strings(expectedPayload.refs),
    ...strings(requested.evidenceRefs),
    ...candidates.map((candidate) => candidate.id).filter(Boolean),
  ])];
  const lineageRefs = [...new Set(originEvents.flatMap((event) => [
    text(event.event_id),
    ...strings(event.lineage),
  ]).filter((value): value is string => Boolean(value)))];
  const sourceEventId = text(riskAssessment.sourceEventId);
  if (sourceEventId && !lineageRefs.includes(sourceEventId)) lineageRefs.push(sourceEventId);

  const plainLanguage = {
    who: actor,
    whatHappened: description,
    whyItMatters: decisionClass === 'LEARNING_PROMOTION'
      ? 'SFI cree que existe un resultado suficientemente contrastado para considerar convertirlo en aprendizaje institucional. Promoverlo cambiaría lo que SFI puede reutilizar como conocimiento.'
      : decisionClass === 'CAPABILITY_IMPLEMENTATION'
        ? 'Resolver esta propuesta cambiaría lo que SFI puede hacer de forma institucional, no sólo arreglar una ejecución aislada.'
        : 'Resolver esta propuesta cambiaría una regla o límite que gobierna cómo opera SFI.',
    proposal: text(expectedPayload.summary) ?? description,
    sfiGain: sfiGain(decisionClass, title, requested),
    evidence: evidenceRefs.length
      ? `${evidenceRefs.length} referencia${evidenceRefs.length === 1 ? '' : 's'} de evidencia/origen están vinculadas al expediente.`
      : 'No hay referencias de evidencia normalizadas en este registro. Si la decisión depende de evidencia, SFI debe conseguirla antes de volverla accionable.',
    ifAccepted: acceptanceEffect(decisionClass),
    ifDenied: denialEffect(decisionClass),
    whyRoot: rootReason(decisionClass),
  };

  const dossier = {
    contract: 'SFI-SOVEREIGN-DECISION-DOSSIER-2.0',
    kind: 'proposal',
    id,
    decisionClass,
    title,
    status,
    statusMeaning: proposalStateMeaning(status),
    plainLanguage,
    actionability: actionability(status, decisionClass),
    origin: {
      actor,
      source,
      credentialLabel: text(expectedPayload.credential_label ?? expectedPayload.credentialLabel),
      submittedAt: text(expectedPayload.submitted_at ?? expectedPayload.submittedAt) ?? text(proposal.created_at),
      originatingCapability: text(expectedPayload.originatingAgent) ?? text(expectedPayload.originatingCapability) ?? null,
      sourceEventId,
    },
    risk: {
      level: text(proposal.risk_level) ?? text(riskAssessment.level) ?? 'unknown',
      rationale: text(riskAssessment.rationale),
      assessedAt: text(riskAssessment.assessedAt),
    },
    evidence: {
      refs: evidenceRefs,
      candidates,
      candidateCount: candidates.length,
      acquisitionOwner: status === 'waiting_evidence' ? 'SFI / evidence_hunter' : null,
      rootEvidenceApprovalRequired: false,
    },
    outcome: {
      recorded: outcomePatch.outcomeRecorded === true || outcome.outcomeRecorded === true,
      governanceDecision: text(outcomePatch.governanceDecision ?? outcome.governanceDecision),
      returnEventId: text(outcomePatch.returnEventId ?? outcome.returnEventId),
      calibrationState: text(outcomePatch.calibrationState ?? outcome.calibrationState),
    },
    technicalTrace: {
      proposalType: proposalType(proposal),
      proposalId: id,
      lineageRefs,
      originEvents,
      expectedFieldDelta: proposal.expected_field_delta ?? null,
      proportionalityCheck: proposal.proportionality_check ?? null,
      authorityBoundary: 'ACCEPT/DENY applies only to the named institutional change/capability change/learning promotion. It does not authorize unrelated execution, publication, truth claims or evidence promotion.',
    },
    readWarnings: [candidatesRead.error?.message, originEventsRead.error?.message].filter(Boolean),
  };
  return NextResponse.json({ ok: true, dossier }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function GET(request: Request) {
  const gate = await requireRootViewer('root.decision_dossier.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim() || null;
  const kind = url.searchParams.get('kind')?.trim().toLowerCase() || 'proposal';
  if (!id) return NextResponse.json({ ok: false, error: 'decision_id_required' }, { status: 400 });
  if (kind === 'report') {
    return NextResponse.json({
      ok: false,
      error: 'report_is_not_a_sovereign_decision',
      details: 'Los reportes se consultan como artefactos operativos. No requieren un expediente ACCEPT/DENY para existir o usarse bajo autoridad vigente.',
    }, { status: 409 });
  }
  if (kind !== 'proposal') return NextResponse.json({ ok: false, error: 'unsupported_decision_kind' }, { status: 400 });
  return proposalDossier(gate.ctx.service, id);
}
