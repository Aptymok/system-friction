import 'server-only';

import { randomUUID } from 'node:crypto';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import {
  describeUniversalSignalContract,
  persistUniversalSignal,
  readUniversalCycleHistory,
  recordUniversalReturn,
  runUniversalCognitiveCycle,
  type UniversalCycleInput,
  type UniversalSignalInput,
} from '@/lib/sfi/universalSignalCycle';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function eventId(value: unknown) {
  const row = record(value);
  if (row.ok === false) return null;
  return text(record(row.data).event_id) ?? text(row.event_id);
}

function openedPayload(history: Awaited<ReturnType<typeof readUniversalCycleHistory>>) {
  return record(record(history.opened).payload);
}

export function humanSignalTenantId(userId: string) {
  return `personal:${userId}`;
}

export async function readOwnedHumanUniversalCycle(cycleId: string, actorId: string) {
  const history = await readUniversalCycleHistory(cycleId);
  if (!history.ok) throw new Error(`SFI_HUMAN_SIGNAL_HISTORY_UNAVAILABLE:${history.error ?? 'unknown'}`);
  const opened = openedPayload(history);
  if (text(opened.actorId) !== actorId) throw new Error('SFI_HUMAN_SIGNAL_OWNER_REQUIRED');
  return history;
}

export async function openHumanUniversalSignalCycle(input: UniversalCycleInput, actorId: string, tenantId: string) {
  const persisted = await persistUniversalSignal(input, actorId, tenantId);
  if (!persisted.event.ok) throw new Error('SFI_HUMAN_SIGNAL_PERSIST_FAILED');
  const cycleId = randomUUID();
  const logbookId = `universal-cycle:${cycleId}`;
  const contract = describeUniversalSignalContract(input);
  const opened = await appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_CYCLE_OPENED',
    epistemicClass: 'derived',
    confidence: 1,
    payload: {
      cycleId,
      actorId,
      tenantId,
      objectKey: persisted.signal.objectKey,
      objectHash: persisted.signal.objectHash,
      humanIngress: true,
      input: {
        signal: persisted.signal,
        question: input.question ?? null,
        objective: input.objective ?? null,
        declaredFunction: input.declaredFunction ?? null,
        systemType: input.systemType ?? null,
        context: input.context ?? {},
        declaredTarget: input.declaredTarget ?? null,
        declaredExclusions: input.declaredExclusions ?? [],
        invariants: input.invariants ?? [],
        constraints: input.constraints ?? [],
        hypotheses: input.hypotheses ?? [],
        requestedAgents: input.requestedAgents ?? [],
        llmAugmentation: input.llmAugmentation === true,
      },
      methodPlan: contract.methodPlan,
      agentPlan: contract.agentPlan,
      clarifyingQuestions: contract.clarifyingQuestions,
      epistemicBoundary: 'Opening a human cycle persists identity and declared material only. No analysis has executed yet.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: actorId, sourceType: 'human_signal_ingress' },
    logbookId,
    lineage: [persisted.signal.objectHash, eventId(persisted.event)].filter((value): value is string => Boolean(value)),
  });
  if (!opened.ok) throw new Error('SFI_HUMAN_SIGNAL_CYCLE_OPEN_FAILED');
  return { cycleId, signal: persisted.signal, persistedEventId: eventId(persisted.event), openedEventId: eventId(opened), contract };
}

export async function linkHumanEvidenceToUniversalCycle(input: {
  cycleId: string;
  signal: UniversalSignalInput;
  notes?: string;
}, actorId: string, tenantId: string) {
  await readOwnedHumanUniversalCycle(input.cycleId, actorId);
  const persisted = await persistUniversalSignal({
    signal: input.signal,
    context: { parentCycleId: input.cycleId, humanEvidenceCandidate: true },
  }, actorId, tenantId);
  if (!persisted.event.ok) throw new Error('SFI_HUMAN_EVIDENCE_PERSIST_FAILED');
  const linked = await appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_CYCLE_EVIDENCE_LINKED',
    epistemicClass: 'declared',
    confidence: 1,
    payload: {
      cycleId: input.cycleId,
      actorId,
      tenantId,
      evidenceSignal: persisted.signal,
      evidenceEventId: eventId(persisted.event),
      notes: input.notes?.trim() || null,
      epistemicBoundary: 'Human-linked material is a declared evidence candidate. It does not become verified evidence merely by attachment.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: actorId, sourceType: 'human_evidence_ingress' },
    logbookId: `universal-cycle:${input.cycleId}`,
    lineage: [persisted.signal.objectHash, eventId(persisted.event)].filter((value): value is string => Boolean(value)),
  });
  if (!linked.ok) throw new Error('SFI_HUMAN_EVIDENCE_LINK_FAILED');
  return { signal: persisted.signal, persistedEventId: eventId(persisted.event), linkedEventId: eventId(linked) };
}

export async function runOwnedHumanUniversalCycle(cycleId: string, actorId: string, tenantId: string) {
  const history = await readOwnedHumanUniversalCycle(cycleId, actorId);
  if (history.state === 'CLOSED') throw new Error('SFI_HUMAN_SIGNAL_CYCLE_CLOSED');
  const opened = openedPayload(history);
  const baseInput = record(opened.input) as UniversalCycleInput;
  if (!record(baseInput.signal).contract) throw new Error('SFI_HUMAN_SIGNAL_OPEN_INPUT_MISSING');
  const linkedEvidence = history.events
    .filter((event) => event.event_name === 'SFI_UNIVERSAL_CYCLE_EVIDENCE_LINKED')
    .map((event) => record(record(event).payload).evidenceSignal)
    .filter(Boolean);
  const lastEvent = history.events.length ? history.events[history.events.length - 1] : null;
  const cycleInput: UniversalCycleInput = {
    ...baseInput,
    context: {
      ...record(baseInput.context),
      humanLinkedEvidence: linkedEvidence,
      humanLinkedEvidenceBoundary: 'Declared evidence candidates remain non-authoritative until independently verified.',
    },
  };
  return runUniversalCognitiveCycle(cycleInput, actorId, tenantId, {
    resumeCycleId: cycleId,
    resumeReason: 'HUMAN_REENTRY_RUN',
    resumeLineageEventId: text(record(lastEvent).event_id),
  });
}

export async function recordOwnedHumanUniversalReturn(input: { cycleId: string; outcome: unknown; notes?: string }, actorId: string, tenantId: string) {
  await readOwnedHumanUniversalCycle(input.cycleId, actorId);
  return recordUniversalReturn({ cycleId: input.cycleId, outcome: input.outcome, notes: input.notes }, actorId, tenantId);
}
