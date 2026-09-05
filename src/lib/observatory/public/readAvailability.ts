export type ObservatoryReadAvailability = 'LOADING' | 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE' | 'ERROR';
export type ObservatoryReadDomain = 'WORLD' | 'STATE' | 'TIMELINE';

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

function hasAuthoritativeShape(domain: ObservatoryReadDomain, payload: Row) {
  if (payload.ok !== true) return false;
  if (domain === 'WORLD') {
    return Array.isArray(payload.nodes)
      && Array.isArray(payload.hypotheses)
      && Array.isArray(payload.sourceSummary)
      && Array.isArray(payload.warnings)
      && record(payload.filters) !== null
      && record(payload.graph) !== null;
  }
  if (domain === 'STATE') return record(payload.data) !== null;
  return Array.isArray(payload.frames);
}

export function classifyObservatoryRead(
  result: ObservatoryFetchResult,
  domain: ObservatoryReadDomain,
): ObservatoryReadAvailability {
  if (result.status === 0) return 'ERROR';
  if (result.status === 204 || result.status === 404 || result.status === 410) return 'UNAVAILABLE';
  if (!result.ok) return result.status >= 500 ? 'DEGRADED' : 'ERROR';

  const payload = record(result.data);
  if (!payload) return 'UNAVAILABLE';
  if (payload.ok === false || warningsFrom(payload).length > 0) return 'DEGRADED';
  if (!hasAuthoritativeShape(domain, payload)) return 'DEGRADED';

  return 'AVAILABLE';
}

export function observableMetricValue(
  availability: ObservatoryReadAvailability,
  value: number | string,
): number | string {
  return availability === 'AVAILABLE' ? value : availability;
}
