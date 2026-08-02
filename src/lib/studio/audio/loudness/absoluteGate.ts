import type { LoudnessWindow } from './types';

export const BS1770_ABSOLUTE_GATE_LUFS = -70;

export function applyAbsoluteGate(windows: LoudnessWindow[], threshold = BS1770_ABSOLUTE_GATE_LUFS) {
  return windows
    .filter((window) => window.loudnessLufs >= threshold)
    .map((window) => ({ ...window, gated: true }));
}
