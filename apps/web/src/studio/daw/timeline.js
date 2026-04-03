export const BEATS_PER_BAR = 4

export function quantizeBeat(beat, grid = 0.25) {
  return Math.round(beat / grid) * grid
}

export function clipEnd(clip) {
  return clip.startBeat + clip.lengthBeats
}

export function findClipAt(clips, beat, trackId) {
  return clips.find((c) => c.trackId === trackId && beat >= c.startBeat && beat <= clipEnd(c))
}
