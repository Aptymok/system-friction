'use client';

import type { MetricValue, StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { useStudioWorkspaceStore } from '@/stores/studioWorkspaceStore';
import { formatMetricValue, statusClass } from './workspaceModel';

const primaryKeys = [
  'lufs_integrated',
  'true_peak_dbtp',
  'sample_peak_dbfs',
  'true_peak_headroom_db',
  'dynamic_range_db',
  'tempo_global_bpm',
  'pulse_clarity',
  'beat_count',
  'meter_hypothesis',
  'rhythmic_regularity',
  'syncopation',
  'fundamental_frequency_hz',
  'key_estimate',
  'key_confidence',
  'tonal_centroid_movement',
  'harmonic_change_count',
  'harmonic_stability',
  'tonal_ambiguity',
  'spectral_dissonance',
];

function visibleMetrics(state: StudioProductionState, active: string | null) {
  if (active) return state.metricValues.filter((metric) => metric.key === active || metric.evidenceIds.includes(active));
  return primaryKeys.map((key) => state.metricValues.find((metric) => metric.key === key)).filter((metric): metric is MetricValue => Boolean(metric));
}

export function StudioMetricInspector({ state }: { state: StudioProductionState }) {
  const activeMetric = useStudioWorkspaceStore((store) => store.activeMetricKey);
  const setActiveMetric = useStudioWorkspaceStore((store) => store.setActiveMetric);
  const selection = useStudioWorkspaceStore((store) => store.selection);
  const metrics = visibleMetrics(state, activeMetric);
  return (
    <section className="studio-inspector" aria-label="Metric inspector">
      <header>
        <span>INSPECTOR</span>
        <strong>{activeMetric ?? (selection ? 'RANGE SIGNALS' : 'CURRENT SIGNALS')}</strong>
      </header>
      {selection ? <p className="studio-inspector__context">Range {selection.startSeconds.toFixed(3)}s - {selection.endSeconds.toFixed(3)}s. Metrics below remain persisted object metrics until range recomputation is available.</p> : null}
      <div className="studio-inspector__metrics">
        {metrics.map((metric) => (
          <button key={metric.key} type="button" className={statusClass(metric.status)} onClick={() => setActiveMetric(metric.key)}>
            <span>{metric.label}</span>
            <strong>{formatMetricValue(metric)}</strong>
            <em>{metric.status} / confidence {metric.confidence.toFixed(3)}</em>
            <small>{metric.source ?? 'NO_SOURCE'}</small>
            {metric.warnings.length ? <small>{metric.warnings.join(', ')}</small> : null}
          </button>
        ))}
        {!metrics.length ? <p>No hay metricas persistidas para la seleccion actual.</p> : null}
      </div>
    </section>
  );
}
