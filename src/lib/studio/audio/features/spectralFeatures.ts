import { mixdownToMono } from '../audioDecode';
import type { EnergySegment, StudioAudioFeature, StudioDecodedAudio } from '../audioTypes';
import { feature, missingFeature, rms, zeroCrossingRate } from './basicFeatures';

type SpectrumSummary = {
  centroidHz: number;
  rolloffHz: number;
  bandwidthHz: number;
  flux: number;
  low: number;
  mid: number;
  high: number;
  noiseFloorDb: number;
  energySegments: EnergySegment[];
};

const FRAME_SIZE = 2048;
const MAX_FRAMES = 140;

function hanning(index: number, size: number) {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / Math.max(1, size - 1));
}

function frameOffsets(length: number) {
  if (length <= FRAME_SIZE) return [0];
  const available = Math.floor((length - FRAME_SIZE) / FRAME_SIZE) + 1;
  const count = Math.min(MAX_FRAMES, available);
  return Array.from({ length: count }, (_, index) => Math.floor((index * (length - FRAME_SIZE)) / Math.max(1, count - 1)));
}

function magnitudeSpectrum(samples: Float32Array, start: number, sampleRate: number) {
  const bins = FRAME_SIZE / 2;
  const magnitudes = new Float64Array(bins);
  for (let bin = 0; bin < bins; bin += 1) {
    let real = 0;
    let imag = 0;
    for (let n = 0; n < FRAME_SIZE; n += 1) {
      const sample = (samples[start + n] ?? 0) * hanning(n, FRAME_SIZE);
      const angle = (-2 * Math.PI * bin * n) / FRAME_SIZE;
      real += sample * Math.cos(angle);
      imag += sample * Math.sin(angle);
    }
    magnitudes[bin] = Math.sqrt(real * real + imag * imag);
  }

  let total = 0;
  let weighted = 0;
  let low = 0;
  let mid = 0;
  let high = 0;
  for (let bin = 1; bin < magnitudes.length; bin += 1) {
    const frequency = (bin * sampleRate) / FRAME_SIZE;
    const magnitude = magnitudes[bin];
    total += magnitude;
    weighted += magnitude * frequency;
    if (frequency < 250) low += magnitude;
    else if (frequency < 4000) mid += magnitude;
    else high += magnitude;
  }

  const centroid = total > 0 ? weighted / total : 0;
  let cumulative = 0;
  let rolloff = 0;
  for (let bin = 1; bin < magnitudes.length; bin += 1) {
    cumulative += magnitudes[bin];
    if (total > 0 && cumulative >= total * 0.85) {
      rolloff = (bin * sampleRate) / FRAME_SIZE;
      break;
    }
  }

  let variance = 0;
  for (let bin = 1; bin < magnitudes.length; bin += 1) {
    const frequency = (bin * sampleRate) / FRAME_SIZE;
    variance += magnitudes[bin] * Math.pow(frequency - centroid, 2);
  }

  return {
    magnitudes,
    centroid,
    rolloff,
    bandwidth: total > 0 ? Math.sqrt(variance / total) : 0,
    low,
    mid,
    high,
    total,
  };
}

export function summarizeSpectrum(decoded: StudioDecodedAudio): SpectrumSummary | null {
  const mono = mixdownToMono(decoded);
  if (!mono.length) return null;

  const offsets = frameOffsets(mono.length);
  let centroid = 0;
  let rolloff = 0;
  let bandwidth = 0;
  let low = 0;
  let mid = 0;
  let high = 0;
  let flux = 0;
  let noiseFloor = 0;
  let previous: Float64Array | null = null;

  const energySegments: EnergySegment[] = [];
  for (const [index, offset] of offsets.entries()) {
    const summary = magnitudeSpectrum(mono, offset, decoded.sampleRate);
    centroid += summary.centroid;
    rolloff += summary.rolloff;
    bandwidth += summary.bandwidth;
    low += summary.low;
    mid += summary.mid;
    high += summary.high;
    noiseFloor += 20 * Math.log10(Math.max(1e-8, summary.total / summary.magnitudes.length));

    if (previous) {
      let frameFlux = 0;
      for (let bin = 0; bin < summary.magnitudes.length; bin += 1) {
        const delta = summary.magnitudes[bin] - previous[bin];
        if (delta > 0) frameFlux += delta;
      }
      flux += frameFlux / summary.magnitudes.length;
    }
    previous = summary.magnitudes;

    const end = Math.min(offset + FRAME_SIZE, mono.length);
    const frame = mono.subarray(offset, end);
    energySegments.push({
      index,
      startSeconds: offset / decoded.sampleRate,
      endSeconds: end / decoded.sampleRate,
      rms: rms(frame),
      peak: Math.max(...Array.from(frame, (sample) => Math.abs(sample))),
      centroidHz: summary.centroid || null,
    });
  }

  const divisor = Math.max(1, offsets.length);
  return {
    centroidHz: centroid / divisor,
    rolloffHz: rolloff / divisor,
    bandwidthHz: bandwidth / divisor,
    flux: flux / Math.max(1, offsets.length - 1),
    low,
    mid,
    high,
    noiseFloorDb: noiseFloor / divisor,
    energySegments,
  };
}

export function extractSpectralFeatures(decoded: StudioDecodedAudio): { features: StudioAudioFeature[]; energySegments: EnergySegment[]; summary: SpectrumSummary | null } {
  const summary = summarizeSpectrum(decoded);
  if (!summary) {
    return {
      features: [
        missingFeature('spectral_centroid_hz', 'Spectral Centroid', 'No decoded samples were available for spectral analysis.', ['AUDIO_SAMPLES_REQUIRED']),
        missingFeature('spectral_rolloff_hz', 'Spectral Rolloff', 'No decoded samples were available for spectral analysis.', ['AUDIO_SAMPLES_REQUIRED']),
        missingFeature('spectral_flux', 'Spectral Flux', 'No decoded samples were available for spectral analysis.', ['AUDIO_SAMPLES_REQUIRED']),
      ],
      energySegments: [],
      summary,
    };
  }

  return {
    features: [
      feature('spectral_centroid_hz', 'Spectral Centroid', summary.centroidHz, 'Hz', 'Mean spectral centroid from bounded DFT frames over decoded mono mixdown.', 0.76),
      feature('spectral_rolloff_hz', 'Spectral Rolloff', summary.rolloffHz, 'Hz', 'Mean 85 percent spectral rolloff from bounded DFT frames.', 0.74),
      feature('spectral_bandwidth_hz', 'Spectral Bandwidth', summary.bandwidthHz, 'Hz', 'Mean spectral bandwidth from bounded DFT frames.', 0.72),
      feature('spectral_flux', 'Spectral Flux', summary.flux, null, 'Positive frame-to-frame spectral magnitude change over bounded DFT frames.', 0.7),
      feature('noise_floor_dbfs', 'Noise Floor', summary.noiseFloorDb, 'dBFS', 'Low-level spectral energy floor estimated from bounded DFT frame magnitudes.', 0.62),
      feature('zero_crossing_rate_spectral', 'Zero Crossing Rate', zeroCrossingRate(mixdownToMono(decoded)), null, 'Zero crossing rate measured over decoded mono samples.', 0.82),
    ],
    energySegments: summary.energySegments,
    summary,
  };
}
