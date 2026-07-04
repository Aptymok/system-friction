export function weightedMean(values: Array<{ value: number; weight: number }>) {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0) || 1;
  return values.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
}
