export type SignalEventRecord = {
  id: string;
  nodeId: string;
  content: string;
  signalType: 'manual';
  sourceState: 'declared';
  evidenceLevel: 'direct';
  confidence: number;
  payloadHash: string;
  createdAt: string;
  idempotencyKey: string;
};

export type SignalReadModel = {
  signals: SignalEventRecord[];
  warnings: string[];
};

type LegacySignalRow = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function confidenceValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}

function isSignalDeclaredRow(row: LegacySignalRow): boolean {
  return row.stream_type === 'signal' && row.event_name === 'SIGNAL_DECLARED';
}

export function mapSignalEventRow(row: unknown): { signal: SignalEventRecord | null; warning?: string } {
  if (!isRecord(row)) return { signal: null, warning: 'invalid_row_shape' };
  if (!isSignalDeclaredRow(row)) return { signal: null, warning: 'ignored_non_signal_declared_row' };

  const payload = isRecord(row.payload) ? row.payload : null;
  if (!payload) return { signal: null, warning: 'missing_payload' };

  const id = stringValue(row.id);
  const nodeId = stringValue(row.node_id);
  const content = stringValue(payload.content);
  const signalType = payload.signal_type === 'manual' ? 'manual' : null;
  const sourceState = payload.sourceState === 'declared' ? 'declared' : null;
  const evidenceLevel = payload.evidenceLevel === 'direct' ? 'direct' : null;
  const confidence = confidenceValue(payload.confidence);
  const payloadHash = stringValue(payload.payloadHash);
  const createdAt = stringValue(row.created_at);
  const idempotencyKey = stringValue(payload.idempotencyKey);

  if (!id) return { signal: null, warning: 'missing_event_id' };
  if (!nodeId) return { signal: null, warning: 'missing_node_id' };
  if (!content) return { signal: null, warning: 'missing_content' };
  if (!signalType) return { signal: null, warning: 'invalid_signal_type' };
  if (!sourceState) return { signal: null, warning: 'invalid_source_state' };
  if (!evidenceLevel) return { signal: null, warning: 'invalid_evidence_level' };
  if (confidence === null) return { signal: null, warning: 'invalid_confidence' };
  if (!payloadHash) return { signal: null, warning: 'missing_payload_hash' };
  if (!createdAt) return { signal: null, warning: 'missing_created_at' };
  if (!idempotencyKey) return { signal: null, warning: 'missing_idempotency_key' };

  return {
    signal: {
      id,
      nodeId,
      content,
      signalType,
      sourceState,
      evidenceLevel,
      confidence,
      payloadHash,
      createdAt,
      idempotencyKey,
    },
  };
}

export function buildSignalReadModel(rows: unknown[]): SignalReadModel {
  const signals: SignalEventRecord[] = [];
  const warnings: string[] = [];

  for (const row of rows) {
    const mapped = mapSignalEventRow(row);
    if (mapped.signal) signals.push(mapped.signal);
    if (mapped.warning && mapped.warning !== 'ignored_non_signal_declared_row') warnings.push(mapped.warning);
  }

  return { signals, warnings };
}
