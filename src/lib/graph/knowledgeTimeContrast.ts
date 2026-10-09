/**
 * Reality Passport — bounded temporal reading of persisted knowledge.
 * Record/knowledge timestamps are NEVER inferred from the event's effective time
 * or from a node's last database update. No source records are mutated.
 */
export type KnowledgeEpoch = {
  eventId: string;
  occurredAt: string;
  state: string | null;
  previousState: string | null;
  censoring: string;
};

export type KnowledgeHistory = {
  epochCount: number;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  persistedHistory: boolean;
  recentEpochs: KnowledgeEpoch[];
};

export type KnowledgeMoment = {
  state: string;
  statement: string | null;
  knownAt: string | null;
  eventAt: string | null;
  observedAt: string | null;
  recordUpdatedAt: string | null;
  sourceRef: string | null;
  provenance: 'EXPLICIT_PRIOR_SNAPSHOT' | 'PERSISTED_EPOCH' | 'CURRENT_READING' | 'NOT_OBSERVED';
  boundary: string;
};

export type KnowledgeTimeContrast = {
  then: KnowledgeMoment;
  now: KnowledgeMoment;
  history: KnowledgeEpoch[];
  selectedCutoff: string | null;
  historySampleBounded: boolean;
  totalPersistedEpochs: number;
  comparison: 'CHANGED' | 'UNCHANGED' | 'INSUFFICIENT_TEMPORAL_EVIDENCE';
  recordBoundary: 'LATER_KNOWLEDGE_DOES_NOT_REWRITE_EARLIER_KNOWLEDGE';
};

type Input = {
  attributes: Record<string, unknown>;
  epistemicState: string;
  captureTime: string | null;
  nodeUpdatedAt: string | null;
  sourceVersion: string | null;
  provenance: string;
  lineage: string[];
  fieldHistory?: KnowledgeHistory | null;
  selectedCutoff?: string | null;
};

function string(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function fromKeys(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = string(row[key]);
    if (value) return value;
  }
  return null;
}
function dated(value: unknown): string | null {
  const candidate = string(value);
  return candidate && Number.isFinite(Date.parse(candidate)) ? new Date(candidate).toISOString() : null;
}
function dateFromKeys(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = dated(row[key]);
    if (value) return value;
  }
  return null;
}
function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function explicitPast(attributes: Record<string, unknown>): Record<string, unknown> | null {
  return object(attributes.knownThen) ??
    object(attributes.known_then) ??
    object(attributes.priorKnowledge) ??
    object(attributes.prior_knowledge) ??
    object(attributes.previousEpistemicSnapshot) ??
    object(attributes.previous_epistemic_snapshot);
}

export function projectKnowledgeTimeContrast(input: Input): KnowledgeTimeContrast {
  // A bounded sample is never presented as the full historical record.
  const epochs = (input.fieldHistory?.recentEpochs ?? [])
    .filter((epoch) => Boolean(epoch.eventId && dated(epoch.occurredAt)))
    .map((epoch) => ({ ...epoch, occurredAt: dated(epoch.occurredAt)! }))
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.eventId.localeCompare(b.eventId));

  const cutoff = dated(input.selectedCutoff);
  const selectedPast = cutoff
    ? epochs.filter((epoch) => epoch.occurredAt <= cutoff).at(-1) ?? null
    : epochs.length >= 2 ? epochs[0] : null;
  const latest = epochs.at(-1) ?? null;
  const persistedSample = input.fieldHistory?.persistedHistory === true;
  const persistedPast = persistedSample && selectedPast &&
    (!latest || selectedPast.eventId !== latest.eventId) ? selectedPast : null;
  const past = explicitPast(input.attributes);

  const then: KnowledgeMoment = past ? {
    state: fromKeys(past, ['epistemicState', 'epistemic_state', 'state']) ?? 'UNKNOWN',
    statement: fromKeys(past, ['statement', 'claim', 'knowledge', 'observation']),
    knownAt: dateFromKeys(past, ['knownAt', 'known_at', 'knowledgeRecordedAt', 'recordedAt', 'recorded_at']),
    eventAt: dateFromKeys(past, ['eventAt', 'event_at', 'effectiveAt', 'effective_at', 'occurredAt', 'occurred_at']),
    observedAt: dateFromKeys(past, ['observedAt', 'observed_at', 'capturedAt', 'captureTime']),
    recordUpdatedAt: null,
    sourceRef: fromKeys(past, ['sourceRef', 'source_ref', 'eventId', 'event_id', 'recordId']),
    provenance: 'EXPLICIT_PRIOR_SNAPSHOT',
    boundary: 'Historical claim is only attributed to the supplied, independently inspectable prior snapshot.',
  } : persistedPast ? {
    state: persistedPast.state ?? 'UNKNOWN',
    statement: null,
    knownAt: persistedPast.occurredAt,
    eventAt: null,
    observedAt: null,
    recordUpdatedAt: null,
    sourceRef: persistedPast.eventId,
    provenance: 'PERSISTED_EPOCH',
    boundary: 'Only a historical STATE was persisted in this epoch; its historical claim text and real-world effective time are NOT RECORDED here.',
  } : {
    state: 'NOT OBSERVED',
    statement: null,
    knownAt: null,
    eventAt: null,
    observedAt: null,
    recordUpdatedAt: null,
    sourceRef: null,
    provenance: 'NOT_OBSERVED',
    boundary: 'No eligible earlier epistemic snapshot is available. Do not reconstruct it from the current claim.',
  };

  const explicitKnownAt = dateFromKeys(input.attributes, ['knowledgeKnownAt', 'knowledge_known_at', 'knownAt', 'known_at', 'knowledgeRecordedAt', 'knowledge_recorded_at', 'recordedAt', 'recorded_at']);
  // Event timestamps may only establish knowledge time for their own recorded state.
  const matchingLatestEpoch = persistedSample && latest && latest.state === input.epistemicState ? latest : null;
  const now: KnowledgeMoment = {
    state: input.epistemicState || 'UNKNOWN',
    statement: fromKeys(input.attributes, ['statement', 'claim', 'observedOutcome', 'observed_outcome', 'inference', 'hypothesis']),
    knownAt: explicitKnownAt ?? matchingLatestEpoch?.occurredAt ?? null,
    eventAt: dateFromKeys(input.attributes, ['effectiveAt', 'effective_at', 'eventAt', 'event_at', 'occurredAt', 'occurred_at']),
    observedAt: dated(input.captureTime),
    recordUpdatedAt: dated(input.nodeUpdatedAt),
    sourceRef: matchingLatestEpoch?.eventId ?? input.lineage[0] ?? string(input.provenance),
    provenance: 'CURRENT_READING',
    boundary: 'A node update or world event date does not establish when a proposition became known. The current reading may be derived.',
  };
  // Only compare historical and current status when both dates are backed by valid knowledge records.
  const comparable = then.knownAt !== null && now.knownAt !== null &&
    then.provenance !== 'NOT_OBSERVED' && then.knownAt <= now.knownAt;
  const comparison: KnowledgeTimeContrast['comparison'] = !comparable
    ? 'INSUFFICIENT_TEMPORAL_EVIDENCE'
    : then.state === now.state ? 'UNCHANGED' : 'CHANGED';

  return {
    then,
    now,
    history: epochs,
    selectedCutoff: persistedPast?.occurredAt ?? then.knownAt,
    historySampleBounded: Math.max(0, input.fieldHistory?.epochCount ?? 0) > epochs.length,
    totalPersistedEpochs: input.fieldHistory?.epochCount ?? 0,
    comparison,
    recordBoundary: 'LATER_KNOWLEDGE_DOES_NOT_REWRITE_EARLIER_KNOWLEDGE',
  };
}
