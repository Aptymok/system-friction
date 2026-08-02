import { loudnessFromMeanSquare, type LoudnessWindow } from './types';

export const BS1770_RELATIVE_GATE_LU = -10;

export function averageMeanSquare(windows: LoudnessWindow[]) {
  if (!windows.length) return 0;
  return windows.reduce((sum, window) => sum + window.meanSquare, 0) / windows.length;
}

export function applyRelativeGate(windows: LoudnessWindow[], relativeOffsetLu = BS1770_RELATIVE_GATE_LU) {
  const ungatedLoudness = loudnessFromMeanSquare(averageMeanSquare(windows));
  const threshold = ungatedLoudness + relativeOffsetLu;
  return {
    threshold,
    windows: windows
      .filter((window) => window.loudnessLufs >= threshold)
      .map((window) => ({ ...window, gated: true })),
  };
}
