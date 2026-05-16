import { getFriction } from "./frictionMemory";

export function analyzeFriction() {
  const log = getFriction();

  const map = new Map<string, number>();

  for (const f of log) {
    map.set(f.type, (map.get(f.type) || 0) + 1);
  }

  const hotspots = [...map.entries()]
    .filter(([_, count]) => count > 10)
    .map(([type, count]) => ({ type, count }));

  return hotspots;
}