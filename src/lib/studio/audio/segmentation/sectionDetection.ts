import type { EnergySegment } from '../audioTypes';
import type { StudioAudioMarker } from './segmentationTypes';

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

export function detectSections(segments: EnergySegment[]): StudioAudioMarker[] {
  if (segments.length < 4) return [];
  const averageRms = mean(segments.map((segment) => segment.rms));
  const sections: StudioAudioMarker[] = [];
  let currentStart = segments[0].startSeconds;
  let currentEnergyClass = segments[0].rms >= averageRms ? 'high' : 'low';

  for (let index = 1; index < segments.length; index += 1) {
    const segment = segments[index];
    const energyClass = segment.rms >= averageRms ? 'high' : 'low';
    const changed = energyClass !== currentEnergyClass;
    const longEnough = segment.startSeconds - currentStart >= 6;
    if (changed && longEnough) {
      sections.push({
        id: `section-${sections.length + 1}`,
        type: 'section',
        label: `Section ${sections.length + 1}`,
        startSeconds: currentStart,
        endSeconds: segment.startSeconds,
        confidence: 0.48,
        payload: { basis: 'energy_class_change', energyClass: currentEnergyClass, averageRms },
      });
      currentStart = segment.startSeconds;
      currentEnergyClass = energyClass;
    }
  }

  const last = segments[segments.length - 1];
  if (last.endSeconds - currentStart >= 1) {
    sections.push({
      id: `section-${sections.length + 1}`,
      type: 'section',
      label: `Section ${sections.length + 1}`,
      startSeconds: currentStart,
      endSeconds: last.endSeconds,
      confidence: 0.48,
      payload: { basis: 'energy_class_change', energyClass: currentEnergyClass, averageRms },
    });
  }

  return sections;
}
