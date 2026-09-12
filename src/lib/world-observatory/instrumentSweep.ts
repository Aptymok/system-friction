import 'server-only';

import { runAmvRuntime } from '@/lib/amv/core/amvRuntime';
import { getPredictiveEngineHealth } from '@/lib/predictive-engine/service';

type SweepInput = {
  observedAt: string;
  worldSignalObserver: unknown;
  hypothesis: unknown;
  calibration: unknown;
};

export async function runWorldInstrumentSweep(input: SweepInput) {
  const selectedContext = {
    contract: 'SFI-WORLD-INSTRUMENT-SWEEP-1.0',
    observedAt: input.observedAt,
    worldSignalObserver: input.worldSignalObserver,
    hypothesisCycle: input.hypothesis,
    calibrationCycle: input.calibration,
    epistemicBoundary: 'The sweep receives outputs from the governed World observation/hypothesis/calibration cycle. Signal Vane and Cluster Atlas remain context-driven readings. Predictive health is operational telemetry. None of these values becomes observed causality or execution authority through composition.',
  };

  const [vane, atlas, predictiveHealth] = await Promise.all([
    runAmvRuntime({
      scope: 'signal-vane',
      message: 'Evalúa el ciclo World más reciente. Distingue señal de ruido, umbrales y early warning. Mantén contrafactuales y proyecciones en sandbox.',
      selectedContext,
    }).catch((error) => ({ ok: false as const, error: error instanceof Error ? error.message : String(error) })),
    runAmvRuntime({
      scope: 'cluster-atlas',
      message: 'Evalúa el ciclo World más reciente. Identifica agrupamientos, persistencia y posibles cambios de régimen sin inferir causalidad ni crear entidades.',
      selectedContext,
    }).catch((error) => ({ ok: false as const, error: error instanceof Error ? error.message : String(error) })),
    getPredictiveEngineHealth().catch(() => null),
  ]);

  const warnings = [
    vane.ok === false ? `signal_vane:${vane.error}` : null,
    atlas.ok === false ? `cluster_atlas:${atlas.error}` : null,
    predictiveHealth ? null : 'predictive_health_unavailable',
  ].filter((value): value is string => Boolean(value));

  return {
    ok: warnings.length === 0,
    contract: 'SFI-WORLD-INSTRUMENT-SWEEP-1.0',
    generatedAt: new Date().toISOString(),
    signalVane: vane,
    clusterAtlas: atlas,
    predictiveHealth,
    warnings,
    writesPerformed: false,
    boundary: 'Daily sweep is read-only instrumentation over the existing World cycle. Continuity, Predictive reconciliation and governed execution retain their existing persistence and authority owners.',
  };
}
