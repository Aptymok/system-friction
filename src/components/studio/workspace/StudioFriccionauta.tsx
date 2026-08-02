'use client';

import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { useStudioWorkspaceStore } from '@/stores/studioWorkspaceStore';
import { formatMetricValue, metricByKey } from './workspaceModel';

export function StudioFriccionauta({ state }: { state: StudioProductionState }) {
  const selection = useStudioWorkspaceStore((store) => store.selection);
  const activeMetric = useStudioWorkspaceStore((store) => store.activeMetricKey);
  const metric = activeMetric ? metricByKey(state, activeMetric) : null;
  const truePeak = metricByKey(state, 'true_peak_dbtp');
  const key = metricByKey(state, 'key_estimate');
  const harmonicStability = metricByKey(state, 'harmonic_stability');
  const dCog = metricByKey(state, 'D_cog') ?? { status: 'CALIBRATION_REQUIRED' as const };
  let message = 'Observando el objeto y las capas habilitadas.';
  if (metric) {
    message = `${metric.label}: ${formatMetricValue(metric)} / ${metric.status}.`;
  } else if (selection) {
    message = `Rango seleccionado ${selection.startSeconds.toFixed(2)}s-${selection.endSeconds.toFixed(2)}s. La recomputacion por rango queda pendiente; no se derivan metricas nuevas.`;
  } else if (key && key.value !== null) {
    message = `Tonalidad defensible: ${formatMetricValue(key)}. Harmonic stability ${formatMetricValue(harmonicStability)}.`;
  } else if (typeof truePeak?.value === 'number' && truePeak.value > 0) {
    message = `Se detecto true peak positivo de ${formatMetricValue(truePeak)}.`;
  } else if (dCog.status === 'CALIBRATION_REQUIRED') {
    message = 'D_cog no puede cerrarse todavia: rhythm y harmony foundation disponibles; faltan estructura, expectativa y calibracion.';
  }
  return (
    <section className="studio-friccionauta" aria-label="Friccionauta contextual">
      <span>{selection ? 'OBSERVING RANGE' : 'OBSERVING'}</span>
      <p>{message}</p>
    </section>
  );
}
