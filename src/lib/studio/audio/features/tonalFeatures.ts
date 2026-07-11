import type { StudioAudioFeature } from '../audioTypes';
import { feature, missingFeature } from './basicFeatures';

export type TonalBandSummary = {
  low: number;
  mid: number;
  high: number;
};

export function extractTonalFeatures(summary: TonalBandSummary | null): StudioAudioFeature[] {
  if (!summary) {
    return [
      missingFeature('tonal_balance_low', 'Tonal Balance Low', 'Tonal balance requires spectral summary evidence.', ['SPECTRAL_FEATURE_REQUIRED']),
      missingFeature('tonal_balance_mid', 'Tonal Balance Mid', 'Tonal balance requires spectral summary evidence.', ['SPECTRAL_FEATURE_REQUIRED']),
      missingFeature('tonal_balance_high', 'Tonal Balance High', 'Tonal balance requires spectral summary evidence.', ['SPECTRAL_FEATURE_REQUIRED']),
    ];
  }

  const total = Math.max(1e-12, summary.low + summary.mid + summary.high);
  const low = summary.low / total;
  const mid = summary.mid / total;
  const high = summary.high / total;
  const descriptor = `low:${low.toFixed(3)} mid:${mid.toFixed(3)} high:${high.toFixed(3)}`;

  return [
    feature('tonal_balance_low', 'Tonal Balance Low', low, null, 'Low-band spectral energy share below 250 Hz.', 0.66),
    feature('tonal_balance_mid', 'Tonal Balance Mid', mid, null, 'Mid-band spectral energy share from 250 Hz to 4 kHz.', 0.66),
    feature('tonal_balance_high', 'Tonal Balance High', high, null, 'High-band spectral energy share above 4 kHz.', 0.66),
    feature('tonal_balance', 'Tonal Balance', descriptor, null, 'Text summary of observed low, mid, and high spectral energy shares.', 0.66),
  ];
}
