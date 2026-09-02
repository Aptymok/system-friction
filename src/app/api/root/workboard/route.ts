import { NextRequest, NextResponse } from 'next/server';
import { getLlmProviderStatus } from '@/lib/ai/providerRouter';
import { readContinuityDashboard } from '@/lib/continuity/runtime';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { resolveProposalReviewerAuthority } from '@/lib/governance/proposalReviewer';
import { readRootOperationalNext } from '@/lib/root/operationalNext';
import { readRootOperationalWorkboard } from '@/lib/root/operationalWorkboard';
import { auditRootAction, requireRootActor, requireRootViewer } from '@/lib/root/server';
import { runUniversalEmpiricalContinuation } from '@/lib/sfi/universalEmpiricalContinuation';
import { closeUniversalCycle, readUniversalCycleHistory, type UniversalCycleHistory } from '@/lib/sfi/universalSignalCycle';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, max = 6000) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function strings(value: unknown, max = 100) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, max)
    : [];
}

function list(value: unknown, max = 250) {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

function payload(value: unknown) {
  return row(row(value).payload);
}

function sequence(value: unknown) {
  const parsed = Number(row(value).sequence);
  return Number.isFinite(parsed) ? parsed : -1;
}

function latestNamed(history: UniversalCycleHistory, name: string) {
  const values = (history.events ?? []).filter((item) => text(row(item).event_name) === name);
  return values.length ? row(values[values.length - 1]) : null;
}

function ageMinutes(value: unknown) {
  const parsed = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? Math.max(0, (Date.now() - parsed) / 60_000) : null;
}

function firstNonEmpty(...values: unknown[]) {
  for (const value of values) {
    const candidate = text(value);
    if (candidate) return candidate;
  }
  return null;
}

function statements(values: unknown[]) {
  return values.flatMap((value) => {
    const item = row(value);
    const statement = firstNonEmpty(item.statement, item.hypothesis, item.claim, item.description, item.prediction, item.summary);
    return statement ? [{ statement, confidence: typeof item.confidence === 'number' ? item.confidence : null, id: text(item.id) }] : [];
  });
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
  const measurements = row(result.measurements ?? result.metrics ?? result.profile);
  return {
    eventId: text(event.event_id),
    observedAt: text(event.occurred_at),
    material: {
      logicalName: firstNonEmpty(material.logicalFilename, material.logicalName, result.logicalFilename, result.filename, result.name),
      observedName: firstNonEmpty(material.observedTransportFilename, material.observedName, result.observedTransportFilename),
      sha256: firstNonEmpty(material.sha256, material.hash, result.sha256, result.objectHash),
      sizeBytes: material.sizeBytes ?? material.size ?? result.sizeBytes ?? result.size ?? null,
    },
    measurements,
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
      eventId: text(event.event_id),
      eventName: name,
      epistemicClass,
      observedAt: text(event.occurred_at),
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

function buildCycleDossier(history: UniversalCycleHistory) {
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
  const recommendationActive = Boolean(recommendation)
    && sequence(recommendation) > sequence(denial)
    && !closure;
  const structured = structuredSection(history);
  const synthesis = synthesisSection(history);
  const hypotheses = statements(list(cognitivePayload.hypotheses, 100));
  const predictions = list(cognitivePayload.predictions, 100);
  const contradictions = list(cognitivePayload.contradictions, 100);
  const risks = list(cognitivePayload.risks, 100);
  const opportunities = list(cognitivePayload.opportunities, 100);
  const state = closure
    ? 'CLOSED'
    : recommendationActive
      ? 'AWAITING_USER_CLOSE'
      : lastContrast
        ? 'CALIBRATED'
        : lastReturn
          ? 'RETURN_RECORDED'
          : history.state ?? 'OPEN';

  return {
    contract: 'SFI-HUMAN-CASE-DOSSIER-1.0',
    kind: 'UNIVERSAL_CYCLE',
    cycleId: history.cycleId,
    state,
    title: firstNonEmpty(openedPayload.question, openedPayload.objectKey, structured?.material.logicalName, `Ciclo ${history.cycleId}`),
    objective: firstNonEmpty(openedPayload.objective),
    openedAt: text(opened.occurred_at),
    eventCount: history.events.length,
    material: structured?.material ?? {
      logicalName: null,
      observedName: null,
      sha256: firstNonEmpty(openedPayload.objectHash),
      sizeBytes: null,
    },
    structured,
    cognition: cognitive ? {
      completed: cognitivePayload.completed === true,
      executedAgents: list(cognitivePayload.executedAgents, 100),
      missingAgents: list(cognitivePayload.missingAgents, 100),
      hypotheses,
      predictions,
      contradictions,
      risks,
      opportunities,
    } : null,
    synthesis,
    evidence: evidenceSection(history),
    returnPlan: returnPlanEvent ? {
      status: firstNonEmpty(returnPlan.status),
      acquisitionState: firstNonEmpty(returnPlan.acquisitionState),
      responsibility: firstNonEmpty(returnPlan.responsibility),
      humanInputRequired: returnPlan.humanInputRequired === true,
      requiredHumanInput: list(returnPlan.requiredHumanInput, 30),
      expectedSignals: list(returnPlan.expectedSignals, 30),
      contradictionSignals: list(returnPlan.contradictionSignals, 30),
      next: firstNonEmpty(returnPlan.next),
    } : null,
    return: lastReturn ? {
      eventId: text(lastReturn.event_id),
      observedAt: text(lastReturn.occurred_at),
      outcome: payload(lastReturn).outcome ?? null,
      classification: firstNonEmpty(payload(lastReturn).classification),
      evidenceRefs: strings(payload(lastReturn).evidenceRefs),
      notes: firstNonEmpty(payload(lastReturn).notes),
    } : null,
    contrast: lastContrast ? {
      eventId: text(lastContrast.event_id),
      observedAt: text(lastContrast.occurred_at),
      classification: firstNonEmpty(payload(lastContrast).classification),
      calibrationStatus: firstNonEmpty(payload(lastContrast).calibrationStatus),
      expectedSignals: list(payload(lastContrast).expectedSignals, 50),
      contradictionSignals: list(payload(lastContrast).contradictionSignals, 50),
      evidenceRefs: strings(payload(lastContrast).returnEvidenceRefs),
      reason: firstNonEmpty(payload(lastContrast).classificationReason),
    } : null,
    closure: {
      readyForUser: recommendationActive,
      recommendationEventId: recommendation ? text(recommendation.event_id) : null,
      recommendation: recommendation ? payload(recommendation).closure ?? null : null,
      deniedEventId: denial ? text(denial.event_id) : null,
      closedEventId: closure ? text(closure.event_id) : null,
      finalAuthority: 'AUTHENTICATED_USER',
    },
    learning: learningCandidate ? {
      eventId: text(learningCandidate.event_id),
      candidate: payload(learningCandidate).candidate ?? null,
    } : null,
    next: closure
      ? 'Reporte cerrado por decisión humana. El aprendizaje queda sujeto a su propia gobernanza.'
      : recommendationActive
        ? 'SFI terminó el trabajo metodológico disponible. Revisa el reporte y decide ACEPTAR o DENEGAR.'
        : returnPlan.humanInputRequired === true
          ? 'SFI necesita evidencia o autorización humana indicada en el plan de retorno antes de continuar.'
          : 'SFI puede continuar automáticamente mientras exista una acción permitida y evidencia suficiente.',
    boundary: 'Este expediente reconstruye el mismo ciclo existente. No abre un Case, no reprocesa el material y no convierte inferencias en evidencia.',
  };
}

async function readCycleDossier(cycleId: string) {
  const history = await readUniversalCycleHistory(cycleId);
  if (!history.ok) return { ok: false as const, error: history.error ?? 'cycle_history_unavailable', dossier: null };
  return { ok: true as const, dossier: buildCycleDossier(history) };
}

export async function GET(request: NextRequest) {
  const gate = await requireRootViewer('root.workboard.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const authority = resolveProposalReviewerAuthority(gate.ctx);
  try {
    const cycleId = request.nextUrl.searchParams.get('cycleId')?.trim() || null;
    const [base, operationalNext, continuityDashboard, cycleDossier] = await Promise.all([
      readRootOperationalWorkboard({ authority }),
      readRootOperationalNext(),
      readContinuityDashboard(),
      cycleId ? readCycleDossier(cycleId) : Promise.resolve(null),
    ]);
    const providers = getLlmProviderStatus();
    const reports = {
      ...base.reports,
      health: {
        ...base.reports.health,
        providers,
        degradedProviderCount: providers.filter((provider) => provider.state === 'DEGRADED' || provider.state === 'BLOCKED').length,
        providerHealthBoundary: 'configured/credential_present is not execution proof. HEALTHY requires an observed successful model call; UNTESTED means configured without observed canary/runtime success in this process.',
      },
    };

    const continuityState = continuityDashboard.state ?? {};
    const latestRun = continuityDashboard.runs?.[0] ?? null;
    const lastHeartbeatAt = continuityState.last_heartbeat_at ?? null;
    const heartbeatAgeMinutes = ageMinutes(lastHeartbeatAt);
    const heartbeatHealth = heartbeatAgeMinutes === null ? 'UNKNOWN' : heartbeatAgeMinutes <= 75 ? 'HEALTHY' : 'STALE';
    const continuity = {
      mode: continuityState.mode ?? 'UNKNOWN',
      lastHeartbeatAt,
      lastSuccessfulRunAt: continuityState.last_successful_run_at ?? null,
      heartbeatAgeMinutes,
      health: heartbeatHealth,
      expectedCadenceMinutes: 30,
      staleAfterMinutes: 75,
      scheduler: 'github_actions_oidc',
      fallback: 'vercel_daily',
      latestRun: latestRun ? {
        id: latestRun.id ?? null,
        status: latestRun.status ?? null,
        trigger: latestRun.trigger ?? null,
        startedAt: latestRun.started_at ?? null,
        completedAt: latestRun.completed_at ?? null,
      } : null,
      errors: continuityDashboard.errors,
      boundary: 'Heartbeat health is operational evidence that SFI was awakened. It is not proof that any specific cognitive cycle completed, acquired RETURN, contrasted reality or learned.',
    };

    const workboard = { ...base, reports, operationalNext, continuity };
    return NextResponse.json({ ok: true, workboard, cycleDossier }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'root_workboard_read_failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireRootActor('root.workboard.decide');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const body = await request.json().catch(() => ({})) as Row;
  const action = text(body.action, 80);
  if (action !== 'decide_universal_report') {
    return NextResponse.json({ ok: false, error: 'unsupported_workboard_action' }, { status: 400 });
  }
  const cycleId = text(body.cycleId, 120);
  const decision = text(body.decision, 20)?.toUpperCase();
  const note = text(body.note, 2000);
  if (!cycleId || !['ACCEPT','DENY'].includes(decision ?? '')) {
    return NextResponse.json({ ok: false, error: 'cycle_and_decision_required' }, { status: 400 });
  }

  const history = await readUniversalCycleHistory(cycleId);
  if (!history.ok) return NextResponse.json({ ok: false, error: history.error ?? 'cycle_history_unavailable' }, { status: 404 });
  if (history.closures?.length) return NextResponse.json({ ok: false, error: 'cycle_already_closed' }, { status: 409 });
  const recommendation = latestNamed(history, 'SFI_UNIVERSAL_CLOSURE_RECOMMENDED');
  const denial = latestNamed(history, 'SFI_UNIVERSAL_REPORT_DENIED_BY_USER');
  if (!recommendation || sequence(recommendation) <= sequence(denial)) {
    return NextResponse.json({ ok: false, error: 'cycle_report_not_ready_for_user_decision' }, { status: 409 });
  }
  const recommendationPayload = payload(recommendation);
  const tenantId = firstNonEmpty(recommendationPayload.tenantId, payload(history.returns?.[history.returns.length - 1]).tenantId, payload(history.opened).tenantId) ?? 'sfi';
  const evidenceRefs = strings(row(recommendationPayload.closure).evidenceRefs ?? recommendationPayload.evidenceRefs);

  if (decision === 'DENY') {
    const event = await appendEpistemicEvent({
      eventName: 'SFI_UNIVERSAL_REPORT_DENIED_BY_USER',
      epistemicClass: 'observed',
      confidence: 1,
      payload: {
        cycleId,
        actorId: gate.ctx.user.id,
        tenantId,
        recommendationEventId: text(recommendation.event_id),
        note,
        decision: 'DENY',
        next: 'The cycle remains open. New evidence, analysis or a revised contrast is required before SFI may recommend closure again.',
      },
      occurredAt: new Date().toISOString(),
      source: { sourceId: gate.ctx.user.id, sourceType: 'root_user_report_decision' },
      logbookId: `universal-cycle:${cycleId}`,
      lineage: [text(recommendation.event_id)].filter((item): item is string => Boolean(item)),
    });
    if (!event.ok) return NextResponse.json(event, { status: 500 });
    await auditRootAction({ actorId: gate.ctx.user.id, action: 'universal_report.deny', target: cycleId, request, payload: { recommendationEventId: text(recommendation.event_id), note } });
    return NextResponse.json({ ok: true, decision: 'DENY', cycleDossier: await readCycleDossier(cycleId) });
  }

  const closed = await closeUniversalCycle({
    cycleId,
    reason: 'REPORT_ACCEPTED_BY_AUTHENTICATED_USER',
    evidenceRefs,
  }, gate.ctx.user.id, tenantId);
  if (!closed.ok) return NextResponse.json(closed, { status: 500 });
  await auditRootAction({ actorId: gate.ctx.user.id, action: 'universal_report.accept_and_close', target: cycleId, request, payload: { recommendationEventId: text(recommendation.event_id), closeEventId: String(closed.data.event_id ?? ''), note } });
  const learning = await runUniversalEmpiricalContinuation({ cycleId }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  return NextResponse.json({ ok: true, decision: 'ACCEPT', learning, cycleDossier: await readCycleDossier(cycleId) });
}
