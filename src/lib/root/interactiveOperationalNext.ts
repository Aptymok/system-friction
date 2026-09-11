import 'server-only';

import { classifyGovernedProposalWork, SFI_GOVERNED_EXECUTION_ADAPTERS } from '@/lib/execution/governedExecutionRouter';
import { classifyProposalDecisionBoundary } from '@/lib/governance/rootDecisionBoundary';
import { normalizeProposalState } from '@/lib/governance/proposalLifecycle';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

const EVENT_PAGE_SIZE = 500;
const EVENT_WINDOW_LIMIT = 5000;
const OPERATIONAL_EVENT_NAMES = [
  'SFI_UNIVERSAL_CYCLE_OPENED',
  'SFI_UNIVERSAL_CYCLE_CLOSED',
  'SFI_UNIVERSAL_CYCLE_RESUMED',
  'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED',
  'SFI_UNIVERSAL_COGNITIVE_CHECKPOINT',
  'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED',
  'SFI_UNIVERSAL_RETURN_PLAN_RECORDED',
  'SFI_UNIVERSAL_RETURN_RECORDED',
  'SFI_UNIVERSAL_RETURN_CONTRASTED',
  'SFI_UNIVERSAL_CLOSURE_RECOMMENDED',
  'SFI_UNIVERSAL_REPORT_DENIED_BY_USER',
] as const;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function sequence(value: unknown) {
  const parsed = Number(row(value).sequence ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
function payload(value: unknown) { return row(row(value).payload); }
function ageHours(value: unknown) {
  const parsed = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? Math.max(0, (Date.now() - parsed) / 3_600_000) : null;
}
function proposalType(value: Row) {
  const expected = row(value.expected_field_delta);
  const body = row(expected.payload);
  const proposal = row(body.proposal);
  const proportionality = row(value.proportionality_check);
  return text(value.proposal_type)
    ?? text(expected.proposalType)
    ?? text(expected.proposal_type)
    ?? text(proposal.proposalType)
    ?? text(proposal.proposal_type)
    ?? text(proportionality.proposalType)
    ?? text(proportionality.proposal_type)
    ?? 'unknown';
}
function parentProposalId(value: Row) {
  const body = row(row(value.expected_field_delta).payload);
  return text(body.parentProposalId);
}
function outcomeState(value: Row) {
  const outcome = row(value.outcome);
  const patch = row(outcome.payloadPatch);
  return {
    recorded: patch.outcomeRecorded === true || outcome.outcomeRecorded === true,
    calibrationState: text(patch.calibrationState ?? outcome.calibrationState),
  };
}
function queuedState(value: Row) {
  const classification = classifyGovernedProposalWork(value);
  const adapter = classification.adapterId
    ? SFI_GOVERNED_EXECUTION_ADAPTERS.find((item) => item.capabilityId === classification.adapterId && item.healthStatus === 'AVAILABLE') ?? null
    : null;
  const materialMissing = classification.executionClass === 'EXTERNAL_ACTION' && !adapter;
  return {
    owner: materialMissing ? 'capability_broker' : 'project_execution_manager',
    nextExpectedEvent: materialMissing ? 'EXECUTION_CAPABILITY_REMEDIATED_OR_SEPARATE_CAPABILITY_CHANGE_PROPOSED' : 'SFI_PROPOSAL_RETURN_RECORDED',
    blocker: materialMissing ? `MISSING_EXECUTION_ADAPTER:${classification.adapterId ?? 'undeclared'}` : null,
    rootActionRequired: false,
    executionClass: classification.executionClass,
    adapterId: classification.adapterId,
  };
}

function proposalState(value: Row, children: Row[], staleAfterHours: number) {
  const id = text(value.id) ?? 'unknown';
  const status = normalizeProposalState(value.status);
  const risk = text(value.risk_level)?.toLowerCase() ?? 'unknown';
  const age = ageHours(value.updated_at ?? value.approved_at ?? value.created_at);
  const stale = age !== null && age >= staleAfterHours;
  const decisionClass = classifyProposalDecisionBoundary(value);
  const sovereign = decisionClass !== 'OPERATIONAL_WORK';
  const base = {
    id,
    title: text(value.title) ?? proposalType(value),
    proposalType: proposalType(value),
    decisionClass,
    status,
    riskLevel: risk,
    ageHours: age,
    stale,
  };

  if (status === 'proposed') {
    if (risk === 'unknown') return { ...base, owner: 'risk_agent', nextExpectedEvent: 'SFI_RISK_DECLARED', blocker: null, rootActionRequired: false, actionLabel: 'SFI evalúa riesgo; no requiere decisión humana todavía' };
    if (risk === 'unassessable' || risk === 'missing_input_for_risk') return {
      ...base,
      owner: 'risk_agent',
      nextExpectedEvent: 'RISK_INPUT_ACQUIRED_OR_LIMITATION_RECORDED',
      blocker: 'MISSING_INPUT_FOR_RISK',
      rootActionRequired: false,
      actionLabel: 'Falta información para evaluar riesgo; SFI la busca o declara la limitación',
    };
    if (!sovereign) return {
      ...base,
      owner: 'project_execution_manager',
      nextExpectedEvent: 'OPERATIONAL_WORK_ROUTED_OR_EXECUTED',
      blocker: null,
      rootActionRequired: false,
      actionLabel: 'Ninguna · SFI continúa dentro de la autoridad existente',
    };
    return {
      ...base,
      owner: 'ROOT',
      nextExpectedEvent: 'ROOT_ACCEPT_OR_DENY_OR_REQUIRE_MORE_EVIDENCE',
      blocker: null,
      rootActionRequired: true,
      actionLabel: decisionClass === 'LEARNING_PROMOTION'
        ? 'Decidir si este aprendizaje se vuelve institucional'
        : decisionClass === 'CAPABILITY_IMPLEMENTATION'
          ? 'Decidir si SFI incorpora o cambia esta capacidad'
          : decisionClass === 'RESERVED_EXTERNAL_OPERATION'
            ? 'Decidir si SFI ejecuta esta acción externa/material'
            : 'Decidir este cambio institucional',
    };
  }

  if (status === 'waiting_evidence') {
    const workingCandidates = children.filter((candidate) => normalizeProposalState(candidate.status) === 'proposed');
    const acceptedCandidates = children.filter((candidate) => normalizeProposalState(candidate.status) === 'accepted');
    if (workingCandidates.length) return {
      ...base,
      owner: 'evidence_assessment',
      nextExpectedEvent: sovereign ? 'EVIDENCE_CLASSIFIED_THEN_SOVEREIGN_DECISION' : 'EVIDENCE_CLASSIFIED_THEN_OPERATIONAL_CONTINUATION',
      blocker: null,
      rootActionRequired: false,
      actionLabel: `Ninguna · SFI clasifica ${workingCandidates.length} fuente${workingCandidates.length === 1 ? '' : 's'} de trabajo`,
      evidenceReadiness: { state: 'WORKING_SOURCES_AVAILABLE', candidateCount: workingCandidates.length, exhaustive: false },
    };
    if (acceptedCandidates.length) return {
      ...base,
      owner: sovereign ? 'ROOT' : 'transition_watchdog',
      nextExpectedEvent: sovereign ? 'ROOT_ACCEPT_OR_DENY_OR_REQUIRE_MORE_EVIDENCE' : 'OPERATIONAL_WORK_ROUTED_OR_EXECUTED',
      blocker: null,
      rootActionRequired: sovereign,
      actionLabel: sovereign ? 'Evidencia disponible · decidir únicamente la acción soberana' : 'Ninguna · SFI continúa',
      evidenceReadiness: { state: 'ACCEPTED_EVIDENCE_AVAILABLE', candidateCount: acceptedCandidates.length, exhaustive: false },
    };
    return {
      ...base,
      owner: 'evidence_hunter',
      nextExpectedEvent: 'EVIDENCE_CANDIDATE_ACQUIRED',
      blocker: stale ? 'WAITING_EVIDENCE_STALE' : null,
      rootActionRequired: false,
      actionLabel: 'Ninguna · SFI busca fuentes',
      evidenceReadiness: { state: 'NOT_HYDRATED_IN_OVERVIEW', candidateCount: 0, exhaustive: false },
    };
  }

  if (status === 'design_approved') return {
    ...base,
    owner: stale ? 'transition_watchdog' : 'project_execution_manager',
    nextExpectedEvent: stale ? 'LEGACY_APPROVAL_RECONCILED' : 'QUEUED',
    blocker: stale ? 'LEGACY_APPROVED_NOT_QUEUED' : null,
    rootActionRequired: false,
    actionLabel: stale ? 'SFI reconcilia una autorización antigua' : 'Ninguna · SFI enruta el trabajo',
  };

  if (status === 'queued') {
    const queued = queuedState(value);
    return { ...base, ...queued, actionLabel: queued.blocker ? 'SFI remedia la capacidad faltante o genera una propuesta separada si debe ampliar capacidad' : 'Ninguna · el ejecutor trabaja' };
  }

  if (status === 'accepted') {
    const outcome = outcomeState(value);
    if (!outcome.recorded) return {
      ...base,
      owner: 'transition_watchdog',
      nextExpectedEvent: 'RETURN_RECONCILIATION',
      blocker: 'LEGACY_ACCEPTED_WITHOUT_OBSERVED_RETURN',
      rootActionRequired: false,
      actionLabel: 'SFI reconcilia el resultado; no requiere cierre humano',
    };
    if (outcome.calibrationState === 'PENDING_REALITY_CALIBRATION') return {
      ...base,
      owner: 'reality_calibration',
      nextExpectedEvent: 'SFI_REALITY_CALIBRATED',
      blocker: null,
      rootActionRequired: false,
      actionLabel: 'Ninguna · SFI calibra contra lo ocurrido',
    };
    return {
      ...base,
      owner: 'sfi_universal_continuation',
      nextExpectedEvent: 'OPERATIONAL_CLOSURE_OR_SEPARATE_LEARNING_PROMOTION',
      blocker: null,
      rootActionRequired: false,
      actionLabel: 'SFI cierra el trabajo; si hay aprendizaje institucional, aparece como una decisión separada',
    };
  }

  return { ...base, owner: null, nextExpectedEvent: null, blocker: null, rootActionRequired: false, actionLabel: 'Terminal / sin transición automática' };
}

function cycleIdOf(value: Row) {
  const direct = text(payload(value).cycleId);
  if (direct) return direct;
  const logbook = text(value.logbook_id);
  return logbook?.startsWith('universal-cycle:') ? logbook.slice('universal-cycle:'.length) : null;
}
function latest(values: Row[], name: string) {
  return values.filter((item) => text(item.event_name) === name).sort((a, b) => sequence(b) - sequence(a))[0] ?? null;
}
function eventAt(value: Row | null) { return value ? text(value.occurred_at) : null; }

function cycleState(cycleId: string, events: Row[], staleAfterHours: number) {
  const opened = latest(events, 'SFI_UNIVERSAL_CYCLE_OPENED');
  const openBody = payload(opened);
  const closed = latest(events, 'SFI_UNIVERSAL_CYCLE_CLOSED');
  const lastEvent = [...events].sort((a, b) => sequence(b) - sequence(a))[0] ?? opened;
  const lastProgressAt = eventAt(lastEvent) ?? eventAt(opened);
  const inactivityHours = ageHours(lastProgressAt);
  const stale = inactivityHours !== null && inactivityHours >= staleAfterHours;
  const title = text(openBody.question) ?? text(openBody.objectKey) ?? `Ciclo ${cycleId}`;
  const base = { cycleId, title, ageHours: inactivityHours, stale };

  if (closed) return { ...base, state: 'CLOSED', owner: null, nextExpectedEvent: null, blocker: null, rootActionRequired: false };

  const recommendation = latest(events, 'SFI_UNIVERSAL_CLOSURE_RECOMMENDED');
  const denial = latest(events, 'SFI_UNIVERSAL_REPORT_DENIED_BY_USER');
  if (recommendation && sequence(recommendation) > sequence(denial)) return {
    ...base,
    state: 'READY_TO_CLOSE',
    stale: false,
    owner: 'sfi_universal_closure_assessor',
    nextExpectedEvent: 'SFI_UNIVERSAL_CYCLE_CLOSED_OR_CONTINUED',
    blocker: null,
    rootActionRequired: false,
    actionLabel: 'Ninguna · el cierre metodológico es trabajo operativo; canon permanece separado',
  };

  const contrast = latest(events, 'SFI_UNIVERSAL_RETURN_CONTRASTED');
  if (contrast) return {
    ...base,
    state: 'CALIBRATED',
    stale: false,
    owner: 'sfi_universal_closure_assessor',
    nextExpectedEvent: 'SFI_UNIVERSAL_CLOSURE_RECOMMENDED_OR_CONTINUATION',
    blocker: null,
    rootActionRequired: false,
    actionLabel: 'Ninguna · SFI evalúa cierre',
  };

  const observedReturn = latest(events, 'SFI_UNIVERSAL_RETURN_RECORDED');
  if (observedReturn) return {
    ...base,
    state: 'RETURN_RECORDED',
    stale: false,
    owner: 'reality_calibration',
    nextExpectedEvent: 'SFI_UNIVERSAL_RETURN_CONTRASTED',
    blocker: null,
    rootActionRequired: false,
    actionLabel: 'Ninguna · SFI contrasta el resultado',
  };

  const completedRuns = events.filter((event) => text(event.event_name) === 'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED' && payload(event).completed === true);
  const incompleteRuns = events.filter((event) => text(event.event_name) === 'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED' && payload(event).completed !== true);
  const latestCompleted = [...completedRuns].sort((a, b) => sequence(b) - sequence(a))[0] ?? null;
  const latestIncomplete = [...incompleteRuns].sort((a, b) => sequence(b) - sequence(a))[0] ?? null;
  const latestResume = latest(events, 'SFI_UNIVERSAL_CYCLE_RESUMED');
  const latestCheckpoint = latest(events, 'SFI_UNIVERSAL_COGNITIVE_CHECKPOINT');
  const latestSynthesis = latest(events, 'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED');
  const latestReturnPlan = latest(events, 'SFI_UNIVERSAL_RETURN_PLAN_RECORDED');
  const completedSequence = sequence(latestCompleted);
  const continuationSequence = Math.max(sequence(latestResume), sequence(latestCheckpoint), sequence(latestIncomplete));

  if (continuationSequence > completedSequence) return {
    ...base,
    state: 'COGNITION_CONTINUING',
    owner: 'sfi_universal_continuation',
    nextExpectedEvent: 'SFI_UNIVERSAL_COGNITIVE_CHECKPOINT_OR_CYCLE_EXECUTED',
    blocker: stale ? 'CONTINUITY_HEARTBEAT_OVERDUE' : null,
    rootActionRequired: false,
    actionLabel: 'Ninguna · SFI continúa',
  };
  if (!latestCompleted) return {
    ...base,
    state: 'COGNITION_PENDING',
    owner: 'sfi_universal_continuation',
    nextExpectedEvent: 'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED',
    blocker: stale ? 'CONTINUITY_HEARTBEAT_OVERDUE' : null,
    rootActionRequired: false,
    actionLabel: 'Ninguna · SFI continúa',
  };
  if (!latestSynthesis || sequence(latestSynthesis) < sequence(latestCompleted)) return {
    ...base,
    state: 'SYNTHESIS_PENDING',
    owner: 'sfi_universal_continuation',
    nextExpectedEvent: 'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED',
    blocker: stale ? 'CONTINUITY_HEARTBEAT_OVERDUE' : null,
    rootActionRequired: false,
    actionLabel: 'Ninguna · SFI sintetiza',
  };
  const completedTaskId = text(payload(latestCompleted).taskId);
  const planBody = payload(latestReturnPlan);
  const returnPlanIsCurrent = Boolean(latestReturnPlan && completedTaskId && completedTaskId === text(planBody.taskId));
  if (!returnPlanIsCurrent) return {
    ...base,
    state: 'RETURN_PLAN_PENDING',
    owner: 'sfi_universal_continuation',
    nextExpectedEvent: 'SFI_UNIVERSAL_RETURN_PLAN_RECORDED',
    blocker: stale ? 'CONTINUITY_HEARTBEAT_OVERDUE' : null,
    rootActionRequired: false,
    actionLabel: 'Ninguna · SFI prepara comprobación',
  };
  const plan = row(planBody.plan);
  if (plan.humanInputRequired === true) return {
    ...base,
    state: 'HUMAN_INPUT_AVAILABLE_OR_REQUIRED',
    stale: false,
    owner: 'case_user_or_evidence_hunter',
    nextExpectedEvent: 'REQUIRED_RETURN_SOURCE_OR_INPUT_SUPPLIED_OR_LIMITATION_RECORDED',
    blocker: text(plan.acquisitionState) ?? 'INPUT_OR_EVIDENCE_MISSING',
    rootActionRequired: false,
    actionLabel: 'Falta un dato o fuente · puedes aportarlo; no es una aprobación',
    returnPlan: plan,
  };
  return {
    ...base,
    state: 'RETURN_ACQUISITION',
    stale: false,
    owner: 'SFI',
    nextExpectedEvent: 'SFI_UNIVERSAL_RETURN_RECORDED',
    blocker: null,
    rootActionRequired: false,
    actionLabel: 'Ninguna · SFI adquiere el resultado',
    returnPlan: plan,
  };
}

async function readOperationalCycleEvents() {
  const db = createServiceSupabaseClient();
  const events: Row[] = [];
  for (let from = 0; from < EVENT_WINDOW_LIMIT; from += EVENT_PAGE_SIZE) {
    const result = await db.from('epistemic_events')
      .select('sequence,event_id,event_name,payload,occurred_at,logbook_id')
      .in('event_name', [...OPERATIONAL_EVENT_NAMES])
      .order('sequence', { ascending: false })
      .range(from, from + EVENT_PAGE_SIZE - 1);
    if (result.error) return { events: [] as Row[], warning: `epistemic_events:${result.error.message}` };
    const page = (result.data ?? []) as Row[];
    events.push(...page);
    if (page.length < EVENT_PAGE_SIZE) return { events, warning: null as string | null };
  }
  return { events, warning: 'epistemic_events:INTERACTIVE_OPERATIONAL_WINDOW_LIMIT_REACHED' };
}

export async function readInteractiveOperationalNext(staleAfterHours = 24, cycleLimit = 8) {
  const db = createServiceSupabaseClient();
  const [proposals, cycleRead] = await Promise.all([
    db.from('action_proposals')
      .select('*')
      .in('status', ['proposed', 'waiting_evidence', 'design_approved', 'queued', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(120),
    readOperationalCycleEvents(),
  ]);

  const sourceRows = (proposals.data ?? []) as Row[];
  const evidenceChildren = sourceRows.filter((item) => proposalType(item) === 'evidence_candidate');
  const childrenByParent = new Map<string, Row[]>();
  for (const candidate of evidenceChildren) {
    const parentId = parentProposalId(candidate);
    if (!parentId) continue;
    const current = childrenByParent.get(parentId) ?? [];
    current.push(candidate);
    childrenByParent.set(parentId, current);
  }
  const parentRows = sourceRows.filter((item) => proposalType(item) !== 'evidence_candidate');
  const items = parentRows.map((item) => proposalState(item, childrenByParent.get(text(item.id) ?? '') ?? [], staleAfterHours));

  const byCycle = new Map<string, Row[]>();
  for (const event of cycleRead.events) {
    const cycleId = cycleIdOf(event);
    if (!cycleId) continue;
    const current = byCycle.get(cycleId) ?? [];
    current.push(event);
    byCycle.set(cycleId, current);
  }
  const openCycleIds = [...byCycle.entries()]
    .filter(([, events]) => Boolean(latest(events, 'SFI_UNIVERSAL_CYCLE_OPENED')) && !latest(events, 'SFI_UNIVERSAL_CYCLE_CLOSED'))
    .sort(([, a], [, b]) => sequence(latest(b, 'SFI_UNIVERSAL_CYCLE_OPENED')) - sequence(latest(a, 'SFI_UNIVERSAL_CYCLE_OPENED')))
    .slice(0, Math.max(1, Math.min(24, cycleLimit)))
    .map(([cycleId]) => cycleId);
  const cycles = openCycleIds.map((cycleId) => cycleState(cycleId, byCycle.get(cycleId) ?? [], staleAfterHours));

  const rootRequired = items.filter((item) => item.rootActionRequired);
  const rootRequiredCycles = cycles.filter((item) => item.rootActionRequired);
  const blocked = items.filter((item) => Boolean(item.blocker));
  const warnings = [
    proposals.error ? `action_proposals:${proposals.error.message}` : null,
    cycleRead.warning,
  ].filter((value): value is string => Boolean(value));

  return {
    generatedAt: new Date().toISOString(),
    contract: 'SFI-INTERACTIVE-NEXT-EXPECTED-EVENT-1.1',
    items,
    cycles,
    summary: {
      nonTerminal: items.length + cycles.length,
      rootActionRequired: rootRequired.length + rootRequiredCycles.length,
      automaticNext: (items.length - rootRequired.length) + (cycles.length - rootRequiredCycles.length),
      blocked: blocked.length + cycles.filter((item) => Boolean(item.blocker)).length,
      staleCycles: cycles.filter((item) => item.stale).length,
    },
    warnings,
    readPlan: {
      actionProposalReads: 1,
      evidenceReadinessPerProposalReads: 0,
      universalCycleHistoryPerCycleReads: 0,
      operationalEventPages: Math.max(1, Math.ceil(cycleRead.events.length / EVENT_PAGE_SIZE)),
      duplicateActionProposalReads: 0,
      nPlusOneReads: 0,
    },
    rule: 'The human queue contains sovereign decisions only. Evidence review, routine execution, RETURN, calibration and methodological closure remain operational work. This overview uses one proposal read and one paged operational event stream; detailed evidence/cycle reconstruction is deferred to dossiers.',
  };
}
