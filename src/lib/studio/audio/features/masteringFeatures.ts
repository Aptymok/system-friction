import type { StudioAudioFeature } from '../audioTypes';
import { missingFeature } from './basicFeatures';

export function extractMasteringFeatures(): StudioAudioFeature[] {
  return [
    missingFeature(
      'lufs_integrated',
      'Integrated LUFS',
      'Integrated LUFS requires a standards-aligned BS.1770 loudness engine. RMS is not relabeled as LUFS.',
      ['LOUDNESS_ENGINE_REQUIRED']
    ),
    missingFeature(
      'true_peak_dbtp',
      'True Peak',
      'True peak requires oversampled peak detection. Sample peak is reported separately and is not relabeled as true peak.',
      ['TRUE_PEAK_ENGINE_REQUIRED']
    ),
    missingFeature(
      'loudness_range_lu',
      'Loudness Range',
      'Loudness range requires standards-aligned gated loudness windows.',
      ['LOUDNESS_ENGINE_REQUIRED']
    ),
    missingFeature(
      'short_term_lufs_summary',
      'Short Term LUFS',
      'Short-term LUFS requires a standards-aligned loudness engine.',
      ['LOUDNESS_ENGINE_REQUIRED']
    ),
  ];
}
