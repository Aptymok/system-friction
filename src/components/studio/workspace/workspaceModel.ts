import type { MetricStatus, MetricValue, StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import type { StudioLayerId } from '@/stores/studioWorkspaceStore';

export function statusClass(status: MetricStatus | string) {
  return `studio-status-${String(status).toLowerCase().replace(/_/g, '-')}`;
}

export function metricByKey(state: StudioProductionState, key: string) {
  return state.metricValues.find((metric) => metric.key === key) ?? null;
}

export function metricsByKeys(state: StudioProductionState, keys: string[]) {
  return keys.map((key) => metricByKey(state, key)).filter((metric): metric is MetricValue => Boolean(metric));
}

export function featureMetricByKey(state: StudioProductionState, key: string) {
  return state.objectFeatures.metrics.find((metric) => metric.id === key) ?? null;
}

export function featurePayload(state: StudioProductionState, key: string) {
  const payload = featureMetricByKey(state, key)?.payload;
  const featurePayload = payload && typeof payload.featurePayload === 'object' && payload.featurePayload !== null
    ? payload.featurePayload as Record<string, unknown>
    : payload;
  return featurePayload && typeof featurePayload === 'object' ? featurePayload as Record<string, unknown> : {};
}

export function formatMetricValue(metric: Pick<MetricValue, 'value' | 'unit'> | null) {
  if (!metric || metric.value === null) return 'NO_VALUE';
  if (typeof metric.value === 'number') return `${Number(metric.value.toFixed(3))}${metric.unit ? ` ${metric.unit}` : ''}`;
  return metric.unit ? `${metric.value} ${metric.unit}` : metric.value;
}

export function objectAudioHref(state: StudioProductionState) {
  return state.activeObject.id ? `/api/studio/objects/${encodeURIComponent(state.activeObject.id)}/audio` : null;
}

export function metricAvailability(state: StudioProductionState, layer: StudioLayerId) {
  const map: Record<StudioLayerId, string[]> = {
    WAVEFORM: ['active_object'],
    MOMENTARY_LUFS: ['momentary_lufs_summary', 'momentary_lufs_min', 'momentary_lufs_max'],
    SHORT_TERM_LUFS: ['short_term_lufs_summary', 'short_term_lufs_min', 'short_term_lufs_max'],
    TRUE_PEAK_EVENTS: ['true_peak_dbtp'],
    RMS: ['rms_dbfs'],
    SPECTRAL_CENTROID: ['spectral_centroid_hz'],
    TRANSIENTS: ['transient_density', 'percussive_load'],
    ONSETS: ['rhythm_onset_count'],
    BEATS: ['beat_count'],
    TEMPO: ['tempo_global_bpm', 'tempo_candidates'],
    PITCH: ['fundamental_frequency_hz', 'pitch_confidence'],
    CHROMA: ['chroma_distribution', 'chroma_confidence'],
    HARMONIC_CHANGES: ['harmonic_change_count', 'harmonic_stability'],
    SEGMENTS: ['feature_coverage'],
    EVIDENCE: ['storage_verified'],
    PHENOMENA: ['cultural_resonance'],
    ANNOTATIONS: ['active_object'],
  };
  const metrics = metricsByKeys(state, map[layer]);
  if (layer === 'WAVEFORM') return state.audioFeatures.waveform.length ? 'OBSERVED' : 'INSUFFICIENT_SIGNAL';
  if (!metrics.length) return 'CAPABILITY_MISSING';
  const statuses = new Set(metrics.map((metric) => metric.status));
  if ([...statuses].some((status) => ['OBSERVED', 'DERIVED', 'CALIBRATED', 'PARTIAL', 'COMPLETE'].includes(status))) return [...statuses][0];
  return metrics[0]?.status ?? 'CAPABILITY_MISSING';
}

export function statusBucket(status: MetricStatus) {
  if (status === 'OBSERVED' || status === 'DERIVED' || status === 'CALIBRATED' || status === 'COMPLETE') return 'OBSERVED';
  if (status === 'PARTIAL' || status === 'DEGRADED' || status === 'INSUFFICIENT_SIGNAL' || status === 'CALIBRATION_REQUIRED') return 'PARTIAL';
  if (status === 'REQUIRES_DECLARATION' || status === 'REQUIRES_FIELD_EVIDENCE' || status === 'CAPABILITY_MISSING' || status === 'NOT_APPLICABLE') return 'BLOCKED';
  return 'FAILED';
}

export const STUDIO_PIPELINE_STAGES = [
  { key: 'INPUT', metric: 'active_object' },
  { key: 'EXTRACTION', metric: 'feature_coverage' },
  { key: 'LOUDNESS', metric: 'lufs_integrated' },
  { key: 'RHYTHM', metric: 'tempo_global_bpm' },
  { key: 'SPECTRUM', metric: 'spectral_centroid_hz' },
  { key: 'PITCH', metric: 'fundamental_frequency_hz' },
  { key: 'HARMONY', metric: 'harmonic_stability' },
  { key: 'STRUCTURE', metric: 'feature_coverage' },
  { key: 'MIHM', metric: 'mihm_activation' },
  { key: 'MOPH', metric: 'cultural_resonance' },
  { key: 'AMV', metric: 'cultural_resonance' },
  { key: 'PHENOMENON', metric: 'cultural_resonance' },
  { key: 'TRAJECTORY', metric: 'feature_coverage' },
  { key: 'SIMULATION', metric: 'studio.simulation.model' },
  { key: 'INTERVENTION', metric: 'studio.prediction.model' },
  { key: 'FORECAST', metric: 'studio.prediction.model' },
  { key: 'MEMORY', metric: 'storage_verified' },
];
