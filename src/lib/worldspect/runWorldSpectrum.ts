import fs from 'fs';
import path from 'path';

export type WorldSpectrumSource = {
  key: string;
  label?: string;
  value: number | null;
  raw?: unknown;
  unit?: string;
  nti?: number;
  nti_base?: number;
  weight?: number;
  mihm_var?: string;
  simulated?: boolean;
  ts?: string;
  error?: string;
};

export type WorldSpectrumCliPayload = {
  sources: WorldSpectrumSource[];
  wsi: number | null;
  nti: number | null;
  ts: string;
  degraded_sources: string[];
};

export type WorldSpectrumRunResult = {
  ok: true;
  status: 'observed' | 'degraded';
  payload: WorldSpectrumCliPayload;
} | {
  ok: false;
  status: 'degraded';
  payload: WorldSpectrumCliPayload;
  errorCode: string;
};

function emptyPayload(errorCode?: string): WorldSpectrumCliPayload {
  return {
    sources: errorCode
      ? [{
        key: 'worldspect_adapter',
        label: 'WorldSpect Adapter',
        value: null,
        nti: 0,
        simulated: true,
        ts: new Date().toISOString(),
        error: errorCode,
      }]
      : [],
    wsi: null,
    nti: null,
    ts: new Date().toISOString(),
    degraded_sources: errorCode ? ['worldspect_adapter'] : [],
  };
}

function degradedResult(errorCode: string): WorldSpectrumRunResult {
  return {
    ok: false,
    status: 'degraded',
    payload: emptyPayload(errorCode),
    errorCode,
  };
}

function sanitizeErrorCode(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) return 'worldspect_adapter_failed';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 96) || 'worldspect_adapter_failed';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function finiteNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseSource(value: unknown): WorldSpectrumSource | null {
  if (!isRecord(value) || typeof value.key !== 'string') return null;
  return {
    key: value.key,
    label: typeof value.label === 'string' ? value.label : undefined,
    value: finiteNumberOrNull(value.value),
    raw: value.raw,
    unit: typeof value.unit === 'string' ? value.unit : undefined,
    nti: finiteNumberOrNull(value.nti) ?? undefined,
    nti_base: finiteNumberOrNull(value.nti_base) ?? undefined,
    weight: finiteNumberOrNull(value.weight) ?? undefined,
    mihm_var: typeof value.mihm_var === 'string' ? value.mihm_var : undefined,
    simulated: value.simulated === true,
    ts: typeof value.ts === 'string' ? value.ts : undefined,
    error: typeof value.error === 'string' ? sanitizeErrorCode(value.error) : undefined,
  };
}

function parseWorldSpectrumPayload(value: unknown): WorldSpectrumCliPayload | null {
  if (!isRecord(value)) return null;
  const sources = Array.isArray(value.sources) ? value.sources.map(parseSource).filter((source): source is WorldSpectrumSource => Boolean(source)) : [];
  const degradedSources = Array.isArray(value.degraded_sources)
    ? value.degraded_sources.filter((source): source is string => typeof source === 'string')
    : sources.filter((source) => source.simulated).map((source) => source.key);
  const ts = typeof value.ts === 'string' && value.ts.length > 0 ? value.ts : new Date().toISOString();

  return {
    sources,
    wsi: finiteNumberOrNull(value.wsi),
    nti: finiteNumberOrNull(value.nti),
    ts,
    degraded_sources: degradedSources,
  };
}

export async function runWorldSpectrum(): Promise<WorldSpectrumRunResult> {
  const cwd = path.join(/*turbopackIgnore: true*/ process.cwd(), 'services', 'python');
  const cliPath = path.join(cwd, 'world_cli.py');

  if (!fs.existsSync(cliPath)) {
    return degradedResult('worldspect_cli_missing');
  }

  return degradedResult('worldspect_python_bridge_disabled_in_next_bundle');
}
