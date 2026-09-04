import 'server-only';

import { classifyGovernedProposalWork, SFI_GOVERNED_EXECUTION_ADAPTERS } from '@/lib/execution/governedExecutionRouter';
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
    owner: materialMissing ? 'ROOT_OR_AUTHORIZED_CONTROLLER' : 'project_execution_manager',
    nextExpectedEvent: materialMissing ? 'EXECUTION_CAPABILITY_REMEDIATED' : 'SFI_PROPOSAL_RETURN_RECORDED',
    blocker: materialMissing ? `MISSING_EXECUTION_ADAPTER:${classification.adapterId ?? 'undeclared'}` : null,
    rootActionRequired: materialMissing,
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
  const base = {
    id,
    title: text(value.title) ?? proposalType(value),
    proposalType: proposalType(value),
    status,
    riskLevel: risk,
    ageHours: age,
    stale,
  };

  if (status === 'proposed') {
    if (risk === 'unknown') return { ...base, owner: 'risk_agent', nextExpectedEvent: 'SFI_RISK_DECLARED', blocker: null, rootActionRequired: false, actionLabel: 'SFI evalúa riesgo automáticamente' };
    if (risk === 'unassessable' || risk === 'missing_input_for_risk') return { ...base, owner: 'ROOT', nextExpectedEvent: 'RISK_INPUT_SUPPLIED_OR_PROPOSAL_REJECTED', blocker: 'MISSING_INPUT_FOR_RISK', rootActionRequired: true, actionLabel: 'Completar input o rechazar' };
    return { ...base, owner: 'ROOT_OR_AUTHORIZED_CONTROLLER', nextExpectedEvent: 'ROOT_ACCEPT_OR_REJECT_OR_REQUEST_EVIDENCE', blocker: null, rootActionRequired: true, actionLabel: 'Decidir' };
  }

  if (status === 'waiting_evidence') {
    const proposedCandidates = children.filter((candidate) => normalizeProposalState(candidate.status) === 'proposed');
    const acceptedCandidates = children.filter((candidate) => normalizeProposalState(candidate.status) === 'accepted');
    if (proposedCandidates.length) return {
      ...base,
      owner: 'ROOT',
      nextExpectedEvent: 'ROOT_EVIDENCE_DECISION',
      blocker: null,
      rootActionRequired: true,
      actionLabel: `Revisar ${proposedCandidates.length} evidencia${proposedCandidates.length === 1 ? '' : 's'} candidata${proposedCandidates.length === 1 ? '' : 's'}`,
      evidenceReadiness: { state: 'REVIEW_REQUIRED', candidateCount: proposedCandidates.length, exhaustive: false },
    };
    if (acceptedCandidates.length) return {
      ...base,
      owner: 'transition_watchdog',
      nextExpectedEvent: 'EVIDENCE_READINESS_RECONCILIATION',
      blocker: stale ? 'WAITING_EVIDENCE_RECONCILIATION_STALE' : null,
      rootActionRequired: false,
      actionLabel: 'Ninguna · SFI reconcilia evidencia ya aceptada',
      evidenceReadiness: { state: 'PARTIALLY_OBSERVED_ACCEPTED_CANDIDATE', candidateCount: acceptedCandidates.length, exhaustive: false },
    };
    return {
      ...base,
      owner: 'evidence_hunter',
      nextExpectedEvent: 'EVIDENCE_CANDIDATE_ACQUIRED',
      blocker: stale ? 'WAITING_EVIDENCE_STALE' : null,
      rootActionRequired: false,
      actionLabel: 'Ninguna · SFI busca',
      evidenceReadiness: { state: 'NOT_HYDRATED_IN_OVERVIEW', candidateCount: 0, exhaustive: false },
    };
  }

  if (status === 'design_approved') return {
    ...base,
    owner: 'project_execution_manager',
    nextExpectedEvent: 'QUEUED',
    blocker: stale ? 'LEGACY_APPROVED_NOT_QUEUED' : null,
    rootActionRequired: stale,
    actionLabel: stale ? 'Reconciliar autorización legacy' : 'Ninguna · auto-route esperado',
  };

  if (status === 'queued') {
    const queued = queuedState(value);
    return { ...base, ...queued, actionLabel: queued.rootActionRequired ? 'Autorizar/remediar capacidad faltante' : 'Ninguna · executor trabaja' };
  }

  if (status === 'accepted') {
    const outcome = outcomeState(value);
    if (!outcome.recorded) return {
      ...base,
      owner: 'transition_watchdog',
      nextExpectedEvent: 'RETURN_RECONCILIATION',
      blocker: 'LEGACY_ACCEPTED_WITHOUT_OBSERVED_RETURN',
      rootActionRequired: false,
      actionLabel: 'Ninguna inicialmente · reconciliación automática/diagnóstico',
    };
    if (outcome.calibrationState === 'PENDING_REALITY_CALIBRATION') return {
      ...base,
      owner: 'reality_calibration',
      nextExpectedEvent: 'SFI_REALITY_CALIBRATED',
      blocker: null,
      rootActionRequired: false,
      actionLabel: 'Ninguna · calibración',
    };
    return {
      ...base,
      owner: 'ROOT',
      nextExpectedEvent: 'ROOT_CLOSE_OR_CANON_REVIEW',
      blocker: null,
      rootActionRequired: true,
      actionLabel: 'Cerrar o revisar canon por decisión separada',
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
    state: 'AWAITING_USER_CLOSE',
    stale: false,
    owner: 'ROOT',
    nextExpectedEvent: 'ROOT_ACCEPT_OR_DENY_UNIVERSAL_REPORT',
    blocker: null,
    rootActionRequired: true,
    actionLabel: 'Revisar reporte y decidir cierre',
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
    actionLabel: 'Ninguna · SFI contrasta RETURN',
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
    state: 'HUMAN_INPUT_REQUIRED',
    stale: false,
    owner: 'ROOT',
    nextExpectedEvent: 'REQUIRED_RETURN_SOURCE_OR_AUTHORIZATION_SUPPLIED',
    blocker: text(plan.acquisitionState) ?? 'HUMAN_INPUT_REQUIRED',
    rootActionRequired: true,
    actionLabel: 'Aportar evidencia o autorización indicada',
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
    actionLabel: 'Ninguna · SFI adquiere RETURN',
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
    contract: 'SFI-INTERACTIVE-NEXT-EXPECTED-EVENT-1.0',
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
    rule: 'Interactive overview uses one proposal read and one paged operational event stream. Per-proposal evidence hydration and per-cycle history reconstruction are deferred to explicit dossiers.',
  };
}
