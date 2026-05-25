'use client'

export type WorldSpectRealClientState = {
  sourceState: 'observed' | 'degraded' | 'missing'
  evidenceLevel: 'direct' | 'none'
  confidence: number
  wsi: number | null
  nti: number | null
  degraded_sources: string[]
  sourceHealth: Array<{
    sourceId: string
    status: 'healthy' | 'degraded' | 'unavailable' | 'unknown'
    kind?: string
    lastObservedAt?: string
    checkedAt?: string
    confidence: number
    message?: string
  }>
  warnings: string[]
}

type SourceHealthStatus = WorldSpectRealClientState['sourceHealth'][number]['status']

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function sourceHealthStatus(value: unknown): SourceHealthStatus {
  return value === 'healthy' || value === 'degraded' || value === 'unavailable' || value === 'unknown' ? value : 'unknown'
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeWorldSpectPayload(payload: unknown, warnings: string[] = []): WorldSpectRealClientState {
  if (!isRecord(payload)) return unavailableState(warnings)
  const sourceState = payload.sourceState === 'observed' || payload.sourceState === 'degraded' ? payload.sourceState : 'degraded'
  const sourceHealth = Array.isArray(payload.sourceHealth)
    ? payload.sourceHealth.filter(isRecord).map((source) => ({
      sourceId: typeof source.sourceId === 'string' ? source.sourceId : 'unknown',
      status: sourceHealthStatus(source.status),
      kind: typeof source.kind === 'string' ? source.kind : undefined,
      lastObservedAt: typeof source.lastObservedAt === 'string' ? source.lastObservedAt : undefined,
      checkedAt: typeof source.checkedAt === 'string' ? source.checkedAt : undefined,
      confidence: typeof source.confidence === 'number' ? Math.max(0, Math.min(1, source.confidence)) : 0,
      message: typeof source.message === 'string' ? source.message : undefined,
    }))
    : []

  return {
    sourceState,
    evidenceLevel: payload.evidenceLevel === 'direct' ? 'direct' : 'none',
    confidence: typeof payload.confidence === 'number' ? Math.max(0, Math.min(1, payload.confidence)) : 0,
    wsi: numberOrNull(payload.wsi),
    nti: numberOrNull(payload.nti),
    degraded_sources: Array.isArray(payload.degraded_sources) ? payload.degraded_sources.filter((item): item is string => typeof item === 'string') : [],
    sourceHealth,
    warnings,
  }
}

function unavailableState(warnings: string[] = ['worldspect_unavailable']): WorldSpectRealClientState {
  return {
    sourceState: 'degraded',
    evidenceLevel: 'none',
    confidence: 0,
    wsi: null,
    nti: null,
    degraded_sources: [],
    sourceHealth: [],
    warnings,
  }
}

export async function readWorldSpectReal(): Promise<WorldSpectRealClientState> {
  try {
    const response = await fetch('/api/worldspect/real', { cache: 'no-store' })
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok || !isRecord(body) || body.ok !== true) return unavailableState()
    const warnings = Array.isArray(body.warnings) ? body.warnings.filter((item): item is string => typeof item === 'string') : []
    return normalizeWorldSpectPayload(body.data, warnings)
  } catch {
    return unavailableState()
  }
}
