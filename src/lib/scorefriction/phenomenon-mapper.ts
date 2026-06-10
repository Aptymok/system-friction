import { clamp01, type CulturalSignalObject } from './cultural-signal-object'

export type PhenomenonMapping = {
  candidate: boolean
  density: number
  regime: 'crystallizing' | 'emerging' | 'latent'
  reason: string[]
}

export function mapCulturalObjectToPhenomenon(input: CulturalSignalObject): PhenomenonMapping {
  const evidence = input.evidenceVector
  const persistence = Number(input.culturalVector?.persistence ?? 0)
  const density = evidence.density
  const trust = evidence.trust
  const culturalStress = Number(input.frictionVector?.culturalStress ?? 0)
  const worldPressure = Number((input.worldSpectVector as Record<string, unknown> | undefined)?.wsi ?? 0)

  const score = clamp01(
    density * 0.25 +
    trust * 0.25 +
    persistence * 0.20 +
    culturalStress * 0.15 +
    worldPressure * 0.15
  )

  return {
    candidate: score >= 0.55,
    density: score,
    regime: score >= 0.75 ? 'crystallizing' : score >= 0.55 ? 'emerging' : 'latent',
    reason: [
      `density=${density.toFixed(2)}`,
      `trust=${trust.toFixed(2)}`,
      `persistence=${clamp01(persistence).toFixed(2)}`,
      `culturalStress=${clamp01(culturalStress).toFixed(2)}`,
      `worldPressure=${clamp01(worldPressure).toFixed(2)}`,
    ],
  }
}

export function applyPhenomenonMapping(input: CulturalSignalObject): CulturalSignalObject {
  const mapping = mapCulturalObjectToPhenomenon(input)
  return {
    ...input,
    phenomenonCandidate: mapping.candidate ? `${input.caseId}:${input.label}` : null,
    verificationStatus: mapping.candidate ? 'tracking' : input.verificationStatus,
  }
}
