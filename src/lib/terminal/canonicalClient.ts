import type { ApiResult, FieldStateDTO, SourceHealthDTO } from '../../../packages/api-contracts/src';
import type { SignalReadModel } from '../../../packages/events/src/signal-read-model';
import { readRealObservations, type RealObservationsReadModel } from './ingestClient';

export type TerminalCanonicalClientResult = {
  fieldState: FieldStateDTO | null;
  signals: SignalReadModel | null;
  ingest: RealObservationsReadModel | null;
  sourceHealth: SourceHealthDTO | null;
  warnings: string[];
};

async function readJson<T>(url: string): Promise<ApiResult<T>> {
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const body = await response.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'invalid_json_response' };
  }

  return body as ApiResult<T>;
}

export async function readTerminalCanonicalFieldState(nodeId: string): Promise<ApiResult<FieldStateDTO>> {
  return readJson<FieldStateDTO>(`/api/field/state?node_id=${encodeURIComponent(nodeId)}`);
}

export async function readTerminalCanonicalSignals(nodeId: string): Promise<ApiResult<SignalReadModel>> {
  return readJson<SignalReadModel>(`/api/signals/read?node_id=${encodeURIComponent(nodeId)}`);
}

export async function readTerminalInternalSourceHealth(): Promise<ApiResult<{ sourceHealth: SourceHealthDTO }>> {
  return readJson<{ sourceHealth: SourceHealthDTO }>('/api/source-health/internal');
}

export async function readTerminalCanonicalState(nodeId: string): Promise<TerminalCanonicalClientResult> {
  const warnings: string[] = [];

  const [fieldStateResult, signalsResult, sourceHealthResult] = await Promise.all([
    readTerminalCanonicalFieldState(nodeId),
    readTerminalCanonicalSignals(nodeId),
    readTerminalInternalSourceHealth(),
  ]);
  const ingestResult = await readRealObservations(nodeId);

  if (!fieldStateResult.ok) warnings.push('field_state_not_ready');
  if (!signalsResult.ok) warnings.push('signals_not_ready');
  if (!sourceHealthResult.ok) warnings.push('source_health_not_ready');
  if (!ingestResult.ok) warnings.push('ingest_not_ready');

  return {
    fieldState: fieldStateResult.ok ? fieldStateResult.data : null,
    signals: signalsResult.ok ? signalsResult.data : null,
    ingest: ingestResult.ok ? ingestResult.data : null,
    sourceHealth: sourceHealthResult.ok ? sourceHealthResult.data.sourceHealth : null,
    warnings,
  };
}
