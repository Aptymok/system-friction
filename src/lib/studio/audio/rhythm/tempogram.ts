import { autocorrelateEnvelope } from './autocorrelation';

export function buildTempogram(envelope: Float64Array, hopSeconds: number, minBpm = 50, maxBpm = 210) {
  const minLag = Math.max(1, Math.floor(60 / maxBpm / hopSeconds));
  const maxLag = Math.max(minLag + 1, Math.ceil(60 / minBpm / hopSeconds));
  return autocorrelateEnvelope(envelope, minLag, maxLag)
    .map((item) => ({
      bpm: 60 / (item.lag * hopSeconds),
      lag: item.lag,
      score: item.score,
    }))
    .filter((item) => Number.isFinite(item.bpm) && item.score > 0);
}
