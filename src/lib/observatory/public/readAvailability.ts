export type ObservatoryReadAvailability = 'LOADING' | 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE' | 'ERROR';

export type ObservatoryFetchResult = {
  ok: boolean;
  data: unknown;
  status: number;
  error?: string;
};

type Row = Record<string, unknown>;

function record(value: unknown): Row | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : null;
}

function warningsFrom(payload: Row) {
  const nested = record(payload.data);
  return [
    ...(Array.isArray(payload.warnings) ? payload.warnings : []),
    ...(Array.isArray(nested?.warnings) ? nested.warnings : []),
  ].filter(Boolean);
}

export function classifyObservatoryRead(result: ObservatoryFetchResult): ObservatoryReadAvailability {
  if (result.status === 0) return 'ERROR';
  if (result.status === 204 || result.status === 404 || result.status === 410) return 'UNAVAILABLE';
  if (!result.ok) return result.status >= 500 ? 'DEGRADED' : 'ERROR';

  const payload = record(result.data);
  if (!payload) return 'UNAVAILABLE';
  if (payload.ok === false || warningsFrom(payload).length > 0) return 'DEGRADED';

  return 'AVAILABLE';
}

export function observableMetricValue(
  availability: ObservatoryReadAvailability,
  value: number | string,
): number | string {
  return availability === 'AVAILABLE' ? value : availability;
}
