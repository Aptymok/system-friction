export function normalizeVector(vector: Record<string, number>) {
  return Object.fromEntries(Object.entries(vector).map(([key, value]) => [key, Math.max(-1, Math.min(1, Number(value) || 0))]));
}
