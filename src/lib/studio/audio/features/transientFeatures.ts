import type { EnergySegment, StudioAudioFeature, StudioDecodedAudio } from '../audioTypes';
import { feature, missingFeature } from './basicFeatures';

export function detectTransientIndexes(segments: EnergySegment[]) {
  if (segments.length < 3) return [];
  const deltas = segments.slice(1).map((segment, index) => segment.rms - segments[index].rms);
  const positive = deltas.filter((delta) => delta > 0);
  const mean = positive.reduce((sum, value) => sum + value, 0) / Math.max(1, positive.length);
  const variance = positive.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / Math.max(1, positive.length);
  const threshold = mean + Math.sqrt(variance);
  return deltas
    .map((delta, index) => ({ delta, index: index + 1 }))
    .filter((item) => item.delta > threshold && segments[item.index].peak > 0.04)
    .map((item) => item.index);
}

export function extractTransientFeatures(decoded: StudioDecodedAudio, segments: EnergySegment[]): StudioAudioFeature[] {
  if (!segments.length) {
    return [
      missingFeature('transient_density', 'Transient Density', 'Transient density requires energy segment evidence.', ['ENERGY_SEGMENTS_REQUIRED']),
      missingFeature('percussive_load', 'Percussive Load', 'Percussive load requires energy segment evidence.', ['ENERGY_SEGMENTS_REQUIRED']),
    ];
  }

  const indexes = detectTransientIndexes(segments);
  const density = indexes.length / Math.max(1, decoded.durationSeconds);
  const percussiveLoad = indexes.reduce((sum, index) => sum + segments[index].peak, 0) / Math.max(1, indexes.length);

  return [
    feature('transient_density', 'Transient Density', density, 'events/s', 'Transient count per second from positive short-window energy deltas.', 0.62),
    feature('percussive_load', 'Percussive Load', indexes.length ? percussiveLoad : 0, null, 'Mean peak amplitude of detected transient windows.', 0.58),
    missingFeature('harmonic_stability', 'Harmonic Stability', 'Harmonic stability requires a pitch or harmonic tracker that is not present in this engine.', ['HARMONIC_TRACKER_REQUIRED']),
  ];
}
