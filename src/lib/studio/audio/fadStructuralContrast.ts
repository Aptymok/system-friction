// Pure deterministic acoustic submetric; independent of persistence and provider runtimes.
type Segment = { i?: unknown; t0?: unknown; t1?: unknown; rms?: unknown };
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function calculateFadStructuralContrast(input: unknown): number | null {
  if (!Array.isArray(input) || input.length < 2) return null;
  let end = -Infinity, change = 0, magnitude = 0, previous: number | null = null;
  for (let index = 0; index < input.length; index += 1) {
    const segment = input[index] as Segment | null;
    if (!segment || !finite(segment.i) || segment.i !== index ||
        !finite(segment.t0) || !finite(segment.t1) || !finite(segment.rms) ||
        segment.t0 < end - 0.0002 || segment.t1 <= segment.t0 ||
        segment.rms < 0 || segment.rms > 1.000001) return null;
    if (previous !== null) {
      change += Math.abs(segment.rms - previous);
      magnitude += Math.max(segment.rms, previous);
    }
    end = segment.t1;
    previous = segment.rms;
  }
  return magnitude > 0 ? Number((change / magnitude).toFixed(8)) : null;
}

