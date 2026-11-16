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
  metrics: SfiMetrics | null;
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
              epistemicStatus: 'INFERRED',
              formulaVersion: '2026-08-06.phi-s.v2',
            },
            montecarlo: json.montecarlo,
            warnings: [
              ...(Array.isArray(json.warnings) ? json.warnings : []),
              'phi_s_derivation_not_empirically_calibrated',
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

/**
 * Transport/model unavailability is not permission to synthesize indicators from
 * preset trust, degradation or arbitrary vector-count factors. Fail closed:
 * downstream APIs return 502 with no model output masquerading as observation.
 */
function fallback(input: SfiEngineInput, warning: string): SfiEngineResult {
  return {
    ok: false,
    source: 'typescript-fallback',
    metrics: null,
    metric: {
      symbol: 'PHI_S',
      objectId: input.object_id,
      dimension: 'bounded_system_or_object',
      epistemicStatus: 'SIMULATED',
      formulaVersion: '2026-08-06.phi-s.v2',
    },
    montecarlo: null,
    warnings: [warning, 'unavailable_model_is_not_an_observation',
      'historical_heuristic_fallback_disabled_no_calibrated_inputs'],
  };
}
