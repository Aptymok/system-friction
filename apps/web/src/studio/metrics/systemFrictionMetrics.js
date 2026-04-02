const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n))

export function metricsFromSocsim(psi) {
  const C = clamp(1 - Math.abs(psi.P - psi.T) * 0.8)
  const T = clamp((psi.T * 0.6 + psi.X * 0.4))
  const A = clamp(psi.P * 0.5 + psi.X * 0.5)
  return { C, T, A }
}

export function generationControls(metrics) {
  const tempo = Math.round(82 + metrics.A * 68 - metrics.T * 12)
  const density = clamp(0.2 + metrics.A * 0.7)
  const harmonicVariation = clamp(0.1 + metrics.T * 0.8)
  return { tempo, density, harmonicVariation }
}
