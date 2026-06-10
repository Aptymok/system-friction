export type CulturalSource = {
  kind: 'youtube' | 'soundcloud' | 'spotify' | 'tiktok' | 'reddit' | 'lyrics' | 'audio' | 'manual' | 'json'
  url?: string
  label?: string
  observedAt: string
  trust: number
}

export type CulturalSignalObject = {
  id: string
  caseId: string
  label: string
  territory: string
  sources: CulturalSource[]
  audioVector?: Record<string, number>
  frequencyVector?: Record<string, number>
  lyricsVector?: Record<string, number>
  culturalVector?: Record<string, number>
  worldSpectVector?: Record<string, unknown>
  mihmVector?: Record<string, number>
  frictionVector?: Record<string, number>
  evidenceVector: {
    evidenceCount: number
    privateEvidenceCount: number
    trust: number
    density: number
    degradation: number
  }
  interpretation: string
  phenomenonCandidate: string | null
  attractors: string[]
  ejectors: string[]
  verificationStatus: 'unverified' | 'tracking' | 'verified' | 'refuted'
}

export function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

export function sourceKindFromUrl(url: string): CulturalSource['kind'] {
  const lower = url.toLowerCase()
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube'
  if (lower.includes('soundcloud.com')) return 'soundcloud'
  if (lower.includes('spotify.com')) return 'spotify'
  if (lower.includes('tiktok.com')) return 'tiktok'
  if (lower.includes('reddit.com')) return 'reddit'
  if (lower.endsWith('.json')) return 'json'
  return 'manual'
}

export function createCulturalSignalObject(input: Partial<CulturalSignalObject> & {
  caseId: string
  label: string
  territory?: string
  sourceUrl?: string
}): CulturalSignalObject {
  const observedAt = new Date().toISOString()
  const sources = input.sources?.length
    ? input.sources
    : [{
      kind: input.sourceUrl ? sourceKindFromUrl(input.sourceUrl) : 'manual',
      url: input.sourceUrl,
      label: input.label,
      observedAt,
      trust: clamp01(input.evidenceVector?.trust ?? 0.35),
    }]

  const evidenceCount = input.evidenceVector?.evidenceCount ?? sources.length
  const trust = clamp01(input.evidenceVector?.trust ?? (sources.reduce((sum, source) => sum + clamp01(source.trust), 0) / Math.max(1, sources.length)))
  const density = clamp01(input.evidenceVector?.density ?? Math.min(1, evidenceCount / 6 + sources.length * 0.08))
  const degradation = clamp01(input.evidenceVector?.degradation ?? (1 - trust) * 0.7)

  return {
    id: input.id ?? `cso_${input.caseId}_${Date.now().toString(36)}`,
    caseId: input.caseId,
    label: input.label,
    territory: input.territory ?? 'UNSPECIFIED',
    sources,
    audioVector: input.audioVector,
    frequencyVector: input.frequencyVector,
    lyricsVector: input.lyricsVector,
    culturalVector: input.culturalVector,
    worldSpectVector: input.worldSpectVector,
    mihmVector: input.mihmVector,
    frictionVector: input.frictionVector,
    evidenceVector: {
      evidenceCount,
      privateEvidenceCount: input.evidenceVector?.privateEvidenceCount ?? 0,
      trust,
      density,
      degradation,
    },
    interpretation: input.interpretation ?? 'Objeto cultural observado como fuente o conjunto de fuentes; no se promueve a fenomeno sin densidad, persistencia y trust.',
    phenomenonCandidate: input.phenomenonCandidate ?? null,
    attractors: input.attractors ?? [],
    ejectors: input.ejectors ?? [],
    verificationStatus: input.verificationStatus ?? 'unverified',
  }
}
