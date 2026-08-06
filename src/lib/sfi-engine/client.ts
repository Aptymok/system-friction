import { clamp01, evaluateSfi, type SfiMetrics } from '@/lib/sfi/math';

const ENGINE_URL = process.env.SFI_ENGINE_URL;

export type SfiEngineInput = {
  object_id: string;
  module: string;
  evidence: unknown[];
  worldspect?: unknown;
  vectors?: Record<string, unknown>;
};

export type SfiEngineResult = {
  ok: boolean;
  source: 'python' | 'typescript-fallback';
  metrics: SfiMetrics;
  metric: {
    symbol: 'PHI_S';
    objectId: string;
    dimension: 'bounded_system_or_object';
    epistemicStatus: 'DERIVED' | 'INFERRED' | 'SIMULATED';
    formulaVersion: string;
  };
  montecarlo?: unknown;
  warnings: string[];
};

export function evaluateCoreSfi(input: {
  evidenceCount: number;
  trust: number;
  worldNti: number;
  degradation: number;
  vectorDensity: number;
}) {
  const evidenceFactor = Math.min(1, input.evidenceCount / 10);
  const ihg = clamp01(0.25 + input.trust * 0.35 + input.vectorDensity * 0.25 + evidenceFactor * 0.15);
  const nti = clamp01(0.20 + input.worldNti * 0.35 + input.vectorDensity * 0.25 + input.trust * 0.20);
  const ldi = clamp01(0.85 - input.trust * 0.30 - evidenceFactor * 0.25 + input.degradation * 0.35);
  const xi = clamp01(0.03 + Math.max(0, input.worldNti - input.trust) * 0.07);
  const metrics = evaluateSfi({ ihg, nti, ldi, xi });
  return { ...metrics, engine: 'TYPESCRIPT_CORE' as const };
}

function hashToNumber(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededMonteCarlo(input: {
  seed: string;
  ihg: number;
  nti: number;
  ldi: number;
  xi: number;
  runs?: number;
  horizon?: number;
}) {
  const runs = input.runs ?? 128;
  const horizon = input.horizon ?? 21;
  let seed = hashToNumber(input.seed);
  function rand() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }
  const paths = [];
  for (let r = 0; r < runs; r += 1) {
    let ihg = input.ihg;
    let nti = input.nti;
    let ldi = input.ldi;
    let xi = input.xi;
    const path = [];
    for (let d = 1; d <= horizon; d += 1) {
      ihg = clamp01(ihg + (rand() - 0.5) * 0.04);
      nti = clamp01(nti + (rand() - 0.5) * 0.05);
      ldi = clamp01(ldi + (rand() - 0.5) * 0.04);
      xi = clamp01(xi + (rand() - 0.5) * 0.01);
      const metrics = evaluateSfi({ ihg, nti, ldi, xi });
      path.push({ day: d, ihg, nti, ldi, xi, phiS: metrics.phi, fs: metrics.fs });
    }
    paths.push(path);
  }
  return {
    engine: 'TYPESCRIPT_MONTECARLO' as const,
    metricSymbol: 'PHI_S' as const,
    epistemicStatus: 'SIMULATED' as const,
    runs,
    horizon,
    paths,
  };
}

function finiteMetric(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function evaluateWithSfiEngine(input: SfiEngineInput): Promise<SfiEngineResult> {
  if (ENGINE_URL) {
    try {
      const response = await fetch(`${ENGINE_URL}/evaluate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
        cache: 'no-store',
      });

      if (response.ok) {
        const json = await response.json();
        const ihg = finiteMetric(json.ihg);
        const nti = finiteMetric(json.nti);
        const ldi = finiteMetric(json.ldi);
        const xi = finiteMetric(json.xi);
        if (ihg !== null && nti !== null && ldi !== null && xi !== null) {
          return {
            ok: true,
            source: 'python',
            metrics: evaluateSfi({ ihg, nti, ldi, xi }),
            metric: {
              symbol: 'PHI_S',
              objectId: input.object_id,
              dimension: 'bounded_system_or_object',
              epistemicStatus: input.evidence.length > 0 ? 'DERIVED' : 'SIMULATED',
              formulaVersion: '2026-08-06.phi-s.v2',
            },
            montecarlo: json.montecarlo,
            warnings: [
              ...(Array.isArray(json.warnings) ? json.warnings : []),
              ...(input.evidence.length > 0 ? [] : ['phi_s_without_observed_evidence']),
            ],
          };
        }
        return fallback(input, 'python_engine_metrics_incomplete');
      }
    } catch (error) {
      return fallback(input, `python_engine_not_ready:${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  return fallback(input, 'python_engine_url_missing');
}

function fallback(input: SfiEngineInput, warning: string): SfiEngineResult {
  const evidenceCount = Array.isArray(input.evidence) ? input.evidence.length : 0;
  const world = input.worldspect && typeof input.worldspect === 'object' ? input.worldspect as Record<string, unknown> : {};
  const metrics = evaluateCoreSfi({
    evidenceCount,
    trust: evidenceCount > 0 ? 0.45 : 0,
    worldNti: Number(world.nti ?? 0),
    degradation: evidenceCount > 0 ? 0.35 : 1,
    vectorDensity: Object.keys(input.vectors ?? {}).length / 10,
  });

  return {
    ok: true,
    source: 'typescript-fallback',
    metrics,
    metric: {
      symbol: 'PHI_S',
      objectId: input.object_id,
      dimension: 'bounded_system_or_object',
      epistemicStatus: evidenceCount > 0 ? 'INFERRED' : 'SIMULATED',
      formulaVersion: '2026-08-06.phi-s.v2',
    },
    montecarlo: seededMonteCarlo({ seed: input.object_id, ihg: metrics.ihg, nti: metrics.nti, ldi: metrics.ldi, xi: metrics.xi }),
    warnings: [warning, evidenceCount > 0 ? 'typescript_phi_s_inferred' : 'typescript_phi_s_simulated_without_evidence'],
  };
}
