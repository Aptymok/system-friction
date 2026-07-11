import type { EnergySegment } from '../audioTypes';
import { detectTransientIndexes } from '../features/transientFeatures';
import type { StudioAudioMarker } from './segmentationTypes';

export function detectOnsets(segments: EnergySegment[]): StudioAudioMarker[] {
  return detectTransientIndexes(segments).slice(0, 256).map((index, markerIndex) => {
    const segment = segments[index];
    return {
      id: `onset-${markerIndex + 1}`,
      type: 'onset',
      label: 'Onset',
      startSeconds: segment.startSeconds,
      endSeconds: segment.endSeconds,
      confidence: 0.62,
      payload: {
        rms: segment.rms,
        peak: segment.peak,
        centroidHz: segment.centroidHz,
      },
    };
  });
}
