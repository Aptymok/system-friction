import { roundHarmony, type ChromaFrame, type TonalCentroidFrame } from './types';

function centroid(values: number[]): [number, number, number, number, number, number] {
  let fifthX = 0;
  let fifthY = 0;
  let minorX = 0;
  let minorY = 0;
  let majorX = 0;
  let majorY = 0;
  const fifthMap = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
  for (let pc = 0; pc < 12; pc += 1) {
    const value = values[pc] ?? 0;
    const fifthAngle = (2 * Math.PI * fifthMap[pc]) / 12;
    const minorAngle = (2 * Math.PI * (pc * 3)) / 12;
    const majorAngle = (2 * Math.PI * (pc * 4)) / 12;
    fifthX += value * Math.cos(fifthAngle);
    fifthY += value * Math.sin(fifthAngle);
    minorX += value * Math.cos(minorAngle);
    minorY += value * Math.sin(minorAngle);
    majorX += value * Math.cos(majorAngle);
    majorY += value * Math.sin(majorAngle);
  }
  return [fifthX, fifthY, minorX, minorY, majorX, majorY].map((value) => roundHarmony(value, 5) ?? 0) as [number, number, number, number, number, number];
}

export function distance(left: number[], right: number[]) {
  let sum = 0;
  for (let i = 0; i < Math.min(left.length, right.length); i += 1) {
    const delta = (left[i] ?? 0) - (right[i] ?? 0);
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

export function buildTonalCentroid(frames: ChromaFrame[]) {
  const tonalFrames = frames.filter((frame) => frame.confidence >= 0.1);
  const result: TonalCentroidFrame[] = tonalFrames.map((frame, index) => {
    const values = centroid(frame.values);
    const previous = index > 0 ? centroid(tonalFrames[index - 1].values) : values;
    return {
      timestampSeconds: frame.timestampSeconds,
      values,
      movement: roundHarmony(distance(values, previous), 5) ?? 0,
    };
  });
  const movement = result.length > 1 ? result.slice(1).reduce((sum, frame) => sum + frame.movement, 0) / (result.length - 1) : null;
  const stability = movement === null ? null : Math.max(0, Math.min(1, 1 - movement));
  return {
    frames: result,
    movement: roundHarmony(movement, 5),
    stability: roundHarmony(stability, 4),
  };
}
