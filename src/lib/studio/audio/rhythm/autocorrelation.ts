export function autocorrelateEnvelope(envelope: Float64Array, minLag: number, maxLag: number) {
  const mean = envelope.reduce((sum, value) => sum + value, 0) / Math.max(1, envelope.length);
  const values: Array<{ lag: number; score: number }> = [];
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    let energyA = 0;
    let energyB = 0;
    for (let index = lag; index < envelope.length; index += 1) {
      const a = envelope[index] - mean;
      const b = envelope[index - lag] - mean;
      sum += a * b;
      energyA += a * a;
      energyB += b * b;
    }
    const denom = Math.sqrt(energyA * energyB);
    values.push({ lag, score: denom > 0 ? sum / denom : 0 });
  }
  return values;
}
