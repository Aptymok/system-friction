import type { EnergySegment, StudioAudioFeature, StudioDecodedAudio } from '../audioTypes';
import { extractBasicFeatures } from './basicFeatures';
import { extractDynamicFeatures } from './dynamicFeatures';
import { extractMasteringFeatures } from './masteringFeatures';
import { extractHarmonyFeatures } from './harmonyFeatures';
import { extractRhythmFeatures } from './rhythmFeatures';
import { extractSpectralFeatures } from './spectralFeatures';
import { extractStereoFeatures } from './stereoFeatures';
import { extractTonalFeatures } from './tonalFeatures';
import { extractTransientFeatures } from './transientFeatures';
import type { LoudnessAnalysisOptions } from '../loudness';
import type { RhythmAnalysisOptions } from '../rhythm';
import type { HarmonyAnalysisOptions } from '../harmony';

export type StudioAudioFeatureExtraction = {
  features: StudioAudioFeature[];
  energySegments: EnergySegment[];
  frequencyBands: number[];
};

function frequencyBandsFromSummary(summary: { low: number; mid: number; high: number } | null) {
  if (!summary) return [];
  const total = Math.max(1e-12, summary.low + summary.mid + summary.high);
  return [summary.low / total, summary.mid / total, summary.high / total];
}

export function extractStudioAudioFeatures(
  decoded: StudioDecodedAudio,
  options: LoudnessAnalysisOptions & RhythmAnalysisOptions & HarmonyAnalysisOptions = {},
): StudioAudioFeatureExtraction {
  const spectral = extractSpectralFeatures(decoded);
  const frequencyBands = frequencyBandsFromSummary(spectral.summary);
  const features = [
    ...extractBasicFeatures(decoded),
    ...extractDynamicFeatures(decoded),
    ...spectral.features,
    ...extractStereoFeatures(decoded),
    ...extractTonalFeatures(spectral.summary),
    ...extractTransientFeatures(decoded, spectral.energySegments),
    ...extractRhythmFeatures(decoded, options),
    ...extractHarmonyFeatures(decoded, options),
    ...extractMasteringFeatures(decoded, options),
  ];

  return {
    features,
    energySegments: spectral.energySegments,
    frequencyBands,
  };
}
