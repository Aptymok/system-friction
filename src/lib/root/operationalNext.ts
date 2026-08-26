import 'server-only';

import { readEvidenceReadiness } from '@/lib/evidence/evidenceCandidates';
import { classifyGovernedProposalWork, SFI_GOVERNED_EXECUTION_ADAPTERS } from '@/lib/execution/governedExecutionRouter';
import { normalizeProposalState } from '@/lib/governance/proposalLifecycle';
import { recordValue, stringValue } from '@/lib/operational/common';
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
    owner: materialMissing ? 'ROOT_OR_AUTHORIZED_CONTROLLER' : 'project_execution_manager',
    nextExpectedEvent: materialMissing ? 'EXECUTION_CAPABILITY_REMEDIATED' : 'SFI_PROPOSAL_RETURN_RECORDED',
    blocker: materialMissing ? `MISSING_EXECUTION_ADAPTER:${classification.adapterId ?? 'undeclared'}` : null,
    rootActionRequired: materialMissing,
    executionClass: classification.executionClass,
    adapterId: classification.adapterId,
  };
}

async function proposalOperationalState(row: Row, staleAfterHours: number) {
  const id = stringValue(row.id) ?? 'unknown';
  const status = normalizeProposalState(row.status);
  const risk = stringValue(row.risk_level)?.toLowerCase() ?? 'unknown';
  const age = ageHours(row.updated_at ?? row.approved_at ?? row.created_at);
  const stale = age !== null && age >= staleAfterHours;
  const base = {
    id,
    title: stringValue(row.title) ?? proposalType(row),
    proposalType: proposalType(row),
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
    const readiness = await readEvidenceReadiness(id).catch(() => null);
    const evidence = readiness?.readiness ?? null;
    if (!evidence || evidence.state === 'MISSING') return {
      ...base,
      owner: 'evidence_hunter',
      nextExpectedEvent: 'EVIDENCE_CANDIDATE_ACQUIRED',
      blocker: stale ? 'WAITING_EVIDENCE_STALE' : null,
      rootActionRequired: false,
      actionLabel: 'Ninguna · SFI busca',
      evidenceReadiness: evidence,
    };
    if (evidence.state === 'REVIEW_REQUIRED') return {
      ...base,
      owner: 'ROOT',
      nextExpectedEvent: 'ROOT_EVIDENCE_DECISION',
      blocker: null,
      rootActionRequired: true,
      actionLabel: 'Aceptar/rechazar evidencia candidata',
      evidenceReadiness: evidence,
    };
    return {
      ...base,
      owner: 'ROOT',
      nextExpectedEvent: 'ROOT_ACCEPT_OR_REJECT_PROPOSAL',
      blocker: null,
      rootActionRequired: true,
      actionLabel: 'Evidencia satisfecha · decidir propuesta',
      evidenceReadiness: evidence,
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
    const queued = queuedState(row);
    return { ...base, ...queued, actionLabel: queued.rootActionRequired ? 'Autorizar/remediar capacidad faltante' : 'Ninguna · executor trabaja' };
  }

  if (status === 'accepted') {
    const outcome = outcomeState(row);
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

async function cycleOperationalState(cycle: Row, staleAfterHours: number) {
  const cycleId = stringValue(cycle.cycleId) ?? stringValue(cycle.eventId) ?? 'unknown';
  const age = ageHours(cycle.occurredAt);
  const stale = age !== null && age >= staleAfterHours;
  const history = cycleId !== 'unknown' ? await readUniversalCycleHistory(cycleId).catch(() => null) : null;
  const state = history?.ok ? history.state : 'OPEN';
  if (state === 'RETURN_RECORDED') return {
    cycleId,
    title: stringValue(cycle.question) ?? stringValue(cycle.objectKey) ?? 'Universal cycle',
    state: 'READY_TO_CLOSE',
    ageHours: age,
    stale,
    owner: 'reality_calibration',
    nextExpectedEvent: 'SFI_UNIVERSAL_CYCLE_CLOSED',
    blocker: null,
    rootActionRequired: false,
  };
  if (state === 'AWAITING_RETURN') return {
    cycleId,
    title: stringValue(cycle.question) ?? stringValue(cycle.objectKey) ?? 'Universal cycle',
    state: stale ? 'STALE' : 'AWAITING_RETURN',
    ageHours: age,
    stale,
    owner: 'reality_calibration',
    nextExpectedEvent: 'SFI_UNIVERSAL_RETURN_RECORDED',
    blocker: stale ? 'RETURN_OVERDUE' : null,
    rootActionRequired: false,
  };
  return {
    cycleId,
    title: stringValue(cycle.question) ?? stringValue(cycle.objectKey) ?? 'Universal cycle',
    state: stale ? 'STALE' : 'OPEN',
    ageHours: age,
    stale,
    owner: 'project_execution_manager',
    nextExpectedEvent: 'SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED_OR_RETURN',
    blocker: stale ? 'NO_NEXT_EVENT_OBSERVED_WITHIN_WATCHDOG_WINDOW' : null,
    rootActionRequired: false,
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
  return {
    generatedAt: new Date().toISOString(),
    contract: 'SFI-NEXT-EXPECTED-EVENT-1.0',
    items,
    cycles,
    summary: {
      nonTerminal: items.length,
      rootActionRequired: rootRequired.length,
      automaticNext: items.length - rootRequired.length,
      blocked: blocked.length,
      staleCycles: cycles.filter((cycle) => cycle.stale).length,
    },
    rule: 'Every non-terminal state declares nextExpectedEvent, owner, blocker and rootActionRequired. ROOT is asked only when authority/evidence eligibility/scope changes require a human decision.',
    warnings: [proposals.error ? `action_proposals:${proposals.error.message}` : null, ...openCycles.warnings].filter(Boolean),
  };
}
