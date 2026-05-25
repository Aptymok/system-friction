import { spawn } from 'child_process';
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

const timeoutMs = 15_000;

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

function classifyAdapterError(stderr: string, fallback: string) {
  const normalized = `${stderr || ''} ${fallback || ''}`.toLowerCase();
  if (normalized.includes('no such file') || normalized.includes('enoent')) return 'worldspect_cli_missing';
  if (normalized.includes('module_not_found') || normalized.includes('modulenotfounderror')) return 'python_dependency_missing';
  if (normalized.includes('permission denied') || normalized.includes('eacces')) return 'worldspect_cli_permission_denied';
  if (normalized.includes('timed out') || normalized.includes('timeout')) return 'worldspect_timeout';
  if (normalized.includes('python')) return sanitizeErrorCode(stderr || fallback || 'python_runtime_error');
  return sanitizeErrorCode(stderr || fallback || 'worldspect_cli_failed');
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
  const python = process.env.PYTHON_BIN || process.env.PYTHON || 'python';
  const cwd = path.join(__dirname, '../../../services/python');
  const cliPath = path.join(cwd, 'world_cli.py');

  if (!fs.existsSync(cliPath)) {
    return degradedResult('worldspect_cli_missing');
  }

  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(/*turbopackIgnore: true*/ python, [cliPath], {
        cwd,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      resolve(degradedResult(classifyAdapterError('', error instanceof Error ? error.message : 'python_spawn_failed')));
      return;
    }

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      resolve(degradedResult('worldspect_timeout'));
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(degradedResult(classifyAdapterError(stderr, error instanceof Error ? error.message : 'python_spawn_error')));
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (code !== 0) {
        resolve(degradedResult(classifyAdapterError(stderr || stdout, `worldspect_cli_exit_${code ?? 'unknown'}`)));
        return;
      }

      try {
        const parsed = parseWorldSpectrumPayload(JSON.parse(stdout));
        if (!parsed) {
          resolve(degradedResult('invalid_worldspect_payload'));
          return;
        }
        const hasRealSources = parsed.sources.some((source) => source.value !== null && source.simulated !== true);
        const hasDegradedSources = parsed.degraded_sources.length > 0 || parsed.sources.some((source) => source.simulated === true);
        resolve({
          ok: true,
          status: hasRealSources && !hasDegradedSources ? 'observed' : 'degraded',
          payload: parsed,
        });
      } catch {
        resolve(degradedResult('invalid_worldspect_json'));
      }
    });
  });
}