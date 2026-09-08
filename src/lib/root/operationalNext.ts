import 'server-only';

import { readEvidenceReadiness } from '@/lib/evidence/evidenceCandidates';
import { classifyGovernedProposalWork, SFI_GOVERNED_EXECUTION_ADAPTERS } from '@/lib/execution/governedExecutionRouter';
import { classifyProposalDecisionBoundary } from '@/lib/governance/rootDecisionBoundary';
import { normalizeProposalState } from '@/lib/governance/proposalLifecycle';
import { recordValue, stringValue } from '@/lib/operational/common';
import {
  SFI_UNIVERSAL_COGNITIVE_CHECKPOINT,
  SFI_UNIVERSAL_RETURN_PLAN_RECORDED,
} from '@/lib/sfi/cognitive-runtime/cognitiveCycle';
import { readUniversalCycleHistory, readUniversalOpenCycles } from '@/lib/sfi/universalSignalCycle';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

function proposalType(row: Row) {
  const expected = recordValue(row.expected_field_delta);
  const payload = recordValue(expected.payload);
  const proportionality = recordValue(row.proportionality_check);
  return stringValue(row.proposal_type)
    ?? stringValue(expected.proposalType)
    ?? stringValue(expected.proposal_type)
    ?? stringValue(payload.proposalType)
    ?? stringValue(proportionality.proposalType)
    ?? 'unknown';
}

function ageHours(value: unknown) {
  const parsed = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? Math.max(0, (Date.now() - parsed) / 3_600_000) : null;
}

function outcomeState(row: Row) {
  const outcome = recordValue(row.outcome);
  const patch = recordValue(outcome.payloadPatch);
  return {
    recorded: patch.outcomeRecorded === true || outcome.outcomeRecorded === true,
    calibrationState: stringValue(patch.calibrationState ?? outcome.calibrationState),
    returnEventId: stringValue(patch.returnEventId ?? outcome.returnEventId),
  };
}

function queuedState(row: Row) {
  const classification = classifyGovernedProposalWork(row);
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

function eventSequence(value: unknown) {
  const sequence = Number(recordValue(value).sequence ?? 0);
  return Number.isFinite(sequence) ? sequence : 0;
}

function latestEvent(values: unknown[]) {
  return values.reduce<Row | null>((latest, value) => {
    const current = recordValue(value);
    return !latest || eventSequence(current) > eventSequence(latest) ? current : latest;
  }, null);
}

function namedEvents(events: unknown[], eventName: string) {
  return events.filter((event) => stringValue(recordValue(event).event_name) === eventName);
}

function latestNamedEvent(events: unknown[], eventName: string) {
  return latestEvent(namedEvents(events, eventName));
}

function eventPayload(event: Row | null) {
  return event ? recordValue(event.payload) : {};
}

function eventOccurredAt(event: Row | null) {
  return event ? stringValue(event.occurred_at) : null;
}

async function proposalOperationalState(row: Row, staleAfterHours: number) {
  const id = stringValue(row.id) ?? 'unknown';
  const status = normalizeProposalState(row.status);
  const risk = stringValue(row.risk_level)?.toLowerCase() ?? 'unknown';
  const age = ageHours(row.updated_at ?? row.approved_at ?? row.created_at);
  const stale = age !== null && age >= staleAfterHours;
  const decisionClass = classifyProposalDecisionBoundary(row);
  const sovereign = decisionClass !== 'OPERATIONAL_WORK';
  const base = {
    id,
    title: stringValue(row.title) ?? proposalType(row),
    proposalType: proposalType(row),
    decisionClass,
    status,
    riskLevel: risk,
    ageHours: age,
    stale,
  };

  if (status === 'proposed') {
    if (risk === 'unknown') return {
      ...base,
      owner: 'risk_agent',
      nextExpectedEvent: 'SFI_RISK_DECLARED',
      blocker: null,
      rootActionRequired: false,
      actionLabel: 'SFI evalúa riesgo; no requiere decisión humana todavía',
    };
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
          : 'Decidir este cambio institucional',
    };
  }

  if (status === 'waiting_evidence') {
    const readiness = await readEvidenceReadiness(id).catch(() => null);
    const evidence = readiness?.readiness ?? null;
    if (!evidence || evidence.state === 'MISSING') return {
      ...base,
      owner: 'evidence_hunter',
      nextExpectedEvent: 'EVIDENCE_CANDIDATE_ACQUIRED_OR_MISSING_DECLARED',
      blocker: stale ? 'WAITING_EVIDENCE_STALE' : null,
      rootActionRequired: false,
      actionLabel: 'Falta evidencia · SFI busca y mantiene visible qué falta',
      evidenceReadiness: evidence,
    };
    if (evidence.state === 'REVIEW_REQUIRED') return {
      ...base,
      owner: 'evidence_assessment',
      nextExpectedEvent: 'EVIDENCE_CLASSIFIED_OR_CONTESTED',
      blocker: null,
      rootActionRequired: false,
      actionLabel: 'Evidencia candidata disponible · SFI la clasifica; no es una aprobación soberana',
      evidenceReadiness: evidence,
    };
    if (!sovereign) return {
      ...base,
      owner: 'project_execution_manager',
      nextExpectedEvent: 'OPERATIONAL_WORK_ROUTED_OR_EXECUTED',
      blocker: null,
      rootActionRequired: false,
      actionLabel: 'Evidencia suficiente · SFI continúa',
      evidenceReadiness: evidence,
    };
    return {
      ...base,
      owner: 'ROOT',
      nextExpectedEvent: 'ROOT_ACCEPT_OR_DENY_OR_REQUIRE_MORE_EVIDENCE',
      blocker: null,
      rootActionRequired: true,
      actionLabel: 'Evidencia disponible · decidir únicamente el cambio institucional',
      evidenceReadiness: evidence,
    };
  }

  if (status === 'design_approved') return {
    ...base,
    owner: stale ? 'transition_watchdog' : 'project_execution_manager',
    nextExpectedEvent: stale ? 'LEGACY_APPROVAL_RECONCILED' : 'QUEUED',
    blocker: stale ? 'LEGACY_APPROVED_NOT_QUEUED' : null,
    rootActionRequired: false,
    actionLabel: stale ? 'SFI reconcilia una aprobación antigua' : 'Ninguna · auto-route esperado',
  };

  if (status === 'queued') {
    const queued = queuedState(row);
    return { ...base, ...queued, actionLabel: queued.blocker ? 'SFI remedia la capacidad faltante o genera una propuesta separada si debe ampliar capacidad' : 'Ninguna · executor trabaja' };
  }

  if (status === 'accepted') {
    const outcome = outcomeState(row);
    if (!outcome.recorded) return {
      ...base,
      owner: 'transition_watchdog',
      nextExpectedEvent: 'RETURN_RECONCILIATION',
      blocker: 'LEGACY_ACCEPTED_WITHOUT_OBSERVED_RETURN',
      rootActionRequired: false,
      actionLabel: 'SFI reconcilia RETURN; no requiere cierre humano',
    };
    if (outcome.calibrationState === 'PENDING_REALITY_CALIBRATION') return {
      ...base,
      owner: 'reality_calibration',
      nextExpectedEvent: 'SFI_REALITY_CALIBRATED',
      blocker: null,
      rootActionRequired: false,
      actionLabel: 'Ninguna · calibración automática',
    };
    return {
      ...base,
      owner: 'sfi_universal_continuation',
      nextExpectedEvent: 'OPERATIONAL_CLOSURE_OR_SEPARATE_LEARNING_PROMOTION',
      blocker: null,
      rootActionRequired: false,
      actionLabel: 'SFI cierra/reconcilia; cualquier aprendizaje a promover aparece como decisión separada',
    };
  }

  return { ...base, owner: null, nextExpectedEvent: null, blocker: null, rootActionRequired: false, actionLabel: 'Terminal / sin transición automática' };
}

async function cycleOperationalState(cycle: Row, staleAfterHours: number) {
  const cycleId = stringValue(cycle.cycleId) ?? stringValue(cycle.eventId) ?? 'unknown';
  const history = cycleId !== 'unknown' ? await readUniversalCycleHistory(cycleId).catch(() => null) : null;
  const historyEvents = history?.ok ? history.events as unknown[] : [];
  const lastObservedEvent = latestEvent(historyEvents);
  const lastProgressAt = eventOccurredAt(lastObservedEvent) ?? stringValue(cycle.occurredAt);
  const inactivityHours = ageHours(lastProgressAt);
  const internalStale = inactivityHours !== null && inactivityHours >= staleAfterHours;
  const title = stringValue(cycle.question) ?? stringValue(cycle.objectKey) ?? 'Universal cycle';

  if (!history?.ok) return {
    cycleId,
    title,
    state: internalStale ? 'CONTINUITY_STATE_UNKNOWN' : 'OPEN',
    ageHours: inactivityHours,
    stale: internalStale,
    owner: 'sfi_universal_continuation',
    nextExpectedEvent: 'SFI_UNIVERSAL_CYCLE_STATE_RECONSTRUCTED',
    blocker: internalStale ? 'CONTINUITY_HISTORY_UNAVAILABLE' : null,
    rootActionRequired: false,
  };

  if (history.state === 'RETURN_RECORDED') return {
    cycleId,
    title,
    state: 'READY_TO_CLOSE',
    ageHours: inactivityHours,
    stale: false,
    owner: 'reality_calibration',
    nextExpectedEvent: 'SFI_UNIVERSAL_RETURN_CONTRASTED_OR_CYCLE_CLOSED',
    blocker: null,
    rootActionRequired: false,
  };

  const cognitiveRuns = history.cognitiveRuns as unknown[];
  const completedRuns = cognitiveRuns.filter((event) => eventPayload(recordValue(event)).completed === true);
  const incompleteRuns = cognitiveRuns.filter((event) => eventPayload(recordValue(event)).completed !== true);
  const latestCompleted = latestEvent(completedRuns);
  const latestIncomplete = latestEvent(incompleteRuns);
  const latestResume = latestEvent(history.resumptions as unknown[]);
  const latestCheckpoint = latestNamedEvent(historyEvents, SFI_UNIVERSAL_COGNITIVE_CHECKPOINT);
  const latestSynthesis = latestEvent(history.aiSyntheses as unknown[]);
  const latestReturnPlan = latestNamedEvent(historyEvents, SFI_UNIVERSAL_RETURN_PLAN_RECORDED);

  const completedSequence = eventSequence(latestCompleted);
  const continuationSequence = Math.max(
    eventSequence(latestResume),
    eventSequence(latestCheckpoint),
    eventSequence(latestIncomplete),
  );
  const cognitionInterrupted = continuationSequence > completedSequence;

  if (cognitionInterrupted) return {
    cycleId,
    title,
    state: 'COGNITION_CONTINUING',
    ageHours: inactivityHours,
    stale: internalStale,
    owner: 'sfi_universal_continuation',
    nextExpectedEvent: 'SFI_UNIVERSAL_COGNITIVE_CHECKPOINT_OR_CYCLE_EXECUTED',
    blocker: internalStale ? 'CONTINUITY_HEARTBEAT_OVERDUE' : null,
    rootActionRequired: false,
  };

  if (!latestCompleted) return {
    cycleId,
    title,
    state: 'COGNITION_PENDING',
    ageHours: inactivityHours,
    stale: internalStale,
    owner: 'sfi_universal_continuation',
    nextExpectedEvent: 'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED',
    blocker: internalStale ? 'CONTINUITY_HEARTBEAT_OVERDUE' : null,
    rootActionRequired: false,
  };

  if (!latestSynthesis || eventSequence(latestSynthesis) < completedSequence) return {
    cycleId,
    title,
    state: 'SYNTHESIS_PENDING',
    ageHours: inactivityHours,
    stale: internalStale,
    owner: 'sfi_universal_continuation',
    nextExpectedEvent: 'SFI_UNIVERSAL_AI_SYNTHESIS_COMPLETED',
    blocker: internalStale ? 'CONTINUITY_HEARTBEAT_OVERDUE' : null,
    rootActionRequired: false,
  };

  const completedTaskId = stringValue(eventPayload(latestCompleted).taskId);
  const returnPlanPayload = eventPayload(latestReturnPlan);
  const returnPlanTaskId = stringValue(returnPlanPayload.taskId);
  const returnPlanIsCurrent = Boolean(latestReturnPlan && completedTaskId && completedTaskId === returnPlanTaskId);

  if (!returnPlanIsCurrent) return {
    cycleId,
    title,
    state: 'RETURN_PLAN_PENDING',
    ageHours: inactivityHours,
    stale: internalStale,
    owner: 'sfi_universal_continuation',
    nextExpectedEvent: SFI_UNIVERSAL_RETURN_PLAN_RECORDED,
    blocker: internalStale ? 'CONTINUITY_HEARTBEAT_OVERDUE' : null,
    rootActionRequired: false,
  };

  const plan = recordValue(returnPlanPayload.plan);
  if (plan.humanInputRequired === true) return {
    cycleId,
    title,
    state: 'HUMAN_INPUT_AVAILABLE_OR_REQUIRED',
    ageHours: inactivityHours,
    stale: false,
    owner: 'case_user_or_evidence_hunter',
    nextExpectedEvent: 'REQUIRED_RETURN_SOURCE_OR_INPUT_SUPPLIED_OR_LIMITATION_RECORDED',
    blocker: stringValue(plan.acquisitionState) ?? 'INPUT_OR_EVIDENCE_MISSING',
    rootActionRequired: false,
    actionLabel: 'Falta un dato o fuente · puedes aportarlo; no es una aprobación',
    returnPlan: plan,
  };

  return {
    cycleId,
    title,
    state: 'RETURN_ACQUISITION',
    ageHours: inactivityHours,
    stale: false,
    owner: 'SFI',
    nextExpectedEvent: 'SFI_UNIVERSAL_RETURN_RECORDED',
    blocker: null,
    rootActionRequired: false,
    returnPlan: plan,
  };
}

export async function readRootOperationalNext(staleAfterHours = 24) {
  const db = createServiceSupabaseClient();
  const proposals = await db.from('action_proposals').select('*').in('status', ['proposed', 'waiting_evidence', 'design_approved', 'queued', 'accepted']).order('created_at', { ascending: false }).limit(120);
  const sourceRows = (proposals.data ?? []) as Row[];
  const parentRows = sourceRows.filter((row) => proposalType(row) !== 'evidence_candidate');
  const items = await Promise.all(parentRows.map((row) => proposalOperationalState(row, staleAfterHours)));
  const openCycles = await readUniversalOpenCycles(12);
  const cycles = await Promise.all((openCycles.universal as Row[]).slice(0, 8).map((cycle) => cycleOperationalState(cycle, staleAfterHours)));
  const blocked = items.filter((item) => Boolean(item.blocker));
  const rootRequired = items.filter((item) => item.rootActionRequired);
  const rootRequiredCycles = cycles.filter((cycle) => cycle.rootActionRequired);
  return {
    generatedAt: new Date().toISOString(),
    contract: 'SFI-NEXT-EXPECTED-EVENT-2.0',
    items,
    cycles,
    summary: {
      nonTerminal: items.length + cycles.length,
      rootActionRequired: rootRequired.length + rootRequiredCycles.length,
      automaticNext: (items.length - rootRequired.length) + (cycles.length - rootRequiredCycles.length),
      blocked: blocked.length + cycles.filter((cycle) => Boolean(cycle.blocker)).length,
      staleCycles: cycles.filter((cycle) => cycle.stale).length,
    },
    rule: 'ROOT is a narrow sovereign boundary, not workflow middleware. Routine evidence work, execution within existing authority, RETURN, calibration and closure stay machine/operational-owned. Only institutional change, material capability implementation/change, and learning promotion become ROOT decisions.',
    warnings: [proposals.error ? `action_proposals:${proposals.error.message}` : null, ...openCycles.warnings].filter(Boolean),
  };
}
