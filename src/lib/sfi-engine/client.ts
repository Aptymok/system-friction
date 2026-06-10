import { evaluateSfi, type SfiMetrics } from '@/lib/sfi/math';

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
  montecarlo?: unknown;
  warnings: string[];
};

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
        return {
          ok: true,
          source: 'python',
          metrics: evaluateSfi({
            ihg: Number(json.ihg ?? 0.5),
            nti: Number(json.nti ?? 0.5),
            ldi: Number(json.ldi ?? 0.5),
            xi: Number(json.xi ?? 0.03),
          }),
          montecarlo: json.montecarlo,
          warnings: Array.isArray(json.warnings) ? json.warnings : [],
        };
      }
    } catch (error) {
      return fallback(input, `python_engine_unavailable:${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  return fallback(input, 'python_engine_url_missing');
}

function fallback(input: SfiEngineInput, warning: string): SfiEngineResult {
  const evidenceCount = Array.isArray(input.evidence) ? input.evidence.length : 0;
  const ihg = Math.min(1, 0.35 + evidenceCount * 0.04);
  const nti = Math.min(1, 0.25 + evidenceCount * 0.05);
  const ldi = evidenceCount > 0 ? Math.max(0.15, 0.75 - evidenceCount * 0.03) : 0.85;

  return {
    ok: true,
    source: 'typescript-fallback',
    metrics: evaluateSfi({ ihg, nti, ldi, xi: 0.03 }),
    warnings: [warning],
  };
}
