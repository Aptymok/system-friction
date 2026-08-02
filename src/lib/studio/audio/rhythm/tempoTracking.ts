import { buildTempogram } from './tempogram';
import { selectTempoCandidate, tempoCandidatesFromTempogram } from './tempoCandidates';

export function trackLocalTempo(envelope: Float64Array, hopSeconds: number) {
  const windowSeconds = 8;
  const stepSeconds = 4;
  const windowFrames = Math.max(8, Math.round(windowSeconds / hopSeconds));
  const stepFrames = Math.max(1, Math.round(stepSeconds / hopSeconds));
  const values: Array<{ timestampSeconds: number; bpm: number; confidence: number }> = [];
  if (envelope.length < windowFrames) return values;
  for (let start = 0; start + windowFrames <= envelope.length; start += stepFrames) {
    const segment = envelope.subarray(start, start + windowFrames);
    const candidates = tempoCandidatesFromTempogram(buildTempogram(segment, hopSeconds));
    const selected = selectTempoCandidate(candidates);
    if (!selected) continue;
    values.push({
      timestampSeconds: Number(((start + windowFrames / 2) * hopSeconds).toFixed(3)),
      bpm: selected.bpm,
      confidence: selected.confidence,
    });
  }
  return values;
}
