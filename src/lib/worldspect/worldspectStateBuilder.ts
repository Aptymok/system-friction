import { getLatestWorldSpectSnapshot } from './snapshotStore'

export type WorldSpectState = {
  observed_at: string | null
  source_state: 'observed' | 'degraded' | 'missing'
  confidence: number
  sources: unknown[]
  source_health: unknown[]
  degraded_sources: string[]
  field_state_signal: unknown
  territory: string
  time_window: string
  dominant_external_pressures: string[]
  relevance_to_sfi: string
  warnings: string[]
}

type SourceLike = Record<string, unknown>

function rawString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function finite(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function sourceRecord(value: unknown): SourceLike | null {
  return value && typeof value === 'object' ? value as SourceLike : null
}

function sourceDomain(source: SourceLike) {
  const explicit = rawString(source.mihm_var, '')
  if (explicit) return explicit.toUpperCase()

  const label = rawString(source.label, '')
  if (label.includes('·')) return label.split('·')[0].trim().toUpperCase()

  const key = rawString(source.key, '')
  if (key.includes('_')) return key.split('_')[0].trim().toUpperCase()

  return 'UNKNOWN'
}

function deriveExternalPressures(sources: unknown[]) {
  const domains = new Map<string, { total: number; active: number; value: number; weight: number; trust: number; examples: string[] }>()

  for (const source of sources.map(sourceRecord).filter((item): item is SourceLike => Boolean(item))) {
    const domain = sourceDomain(source)
    const current = domains.get(domain) ?? { total: 0, active: 0, value: 0, weight: 0, trust: 0, examples: [] }
    current.total += 1
    current.examples.push(rawString(source.key, rawString(source.label, domain)))

    const status = rawString(source.status, '').toUpperCase()
    const isUsable = source.simulated !== true && (status === 'ACTIVE' || status === '') && source.value !== null && typeof source.value !== 'undefined'
    if (isUsable) {
      const weight = Math.max(0.01, finite(source.weight, 1))
      current.active += 1
      current.value += Math.max(0, Math.min(1, finite(source.value, 0))) * weight
      current.weight += weight
      current.trust += Math.max(0, Math.min(1, finite(source.nti, 0)))
    }

    domains.set(domain, current)
  }

  return Array.from(domains.entries())
    .map(([domain, data]) => {
      const value = data.value / Math.max(0.01, data.weight)
      const trust = data.trust / Math.max(1, data.active)
      const level = value >= 0.72 ? 'high' : value >= 0.52 ? 'elevated' : value >= 0.34 ? 'moderate' : 'low'
      return { domain, value, trust, level, active: data.active, total: data.total, examples: data.examples }
    })
    .filter((item) => item.active > 0)
    .sort((a, b) => b.value - a.value)
    .map((item) => `${item.domain}:${item.level}:value=${item.value.toFixed(3)}:active=${item.active}/${item.total}:trust=${item.trust.toFixed(2)}:sources=${item.examples.slice(0, 2).join(',')}`)
}

export async function buildWorldSpectState(): Promise<WorldSpectState> {
  try {
    const latest = await getLatestWorldSpectSnapshot()
    if (!latest) {
      return {
        observed_at: null,
        source_state: 'missing',
        confidence: 0,
        sources: [],
        source_health: [],
        degraded_sources: [],
        field_state_signal: null,
        territory: 'unknown',
        time_window: 'unknown',
        dominant_external_pressures: [],
        relevance_to_sfi: 'WSV no orienta contexto externo sin fuente, fecha y confianza.',
        warnings: ['worldspect_state_missing'],
      }
    }

    const raw = latest.raw_payload && typeof latest.raw_payload === 'object' ? latest.raw_payload as Record<string, unknown> : {}
    const valid = Boolean(latest.observed_at && latest.sources.length > 0 && latest.confidence > 0)
    const rawPressures = Array.isArray(raw.dominant_external_pressures)
      ? raw.dominant_external_pressures.filter((item): item is string => typeof item === 'string')
      : []
    const derivedPressures = deriveExternalPressures(latest.sources)
    const pressures = rawPressures.length ? rawPressures : derivedPressures

    return {
      observed_at: latest.observed_at,
      source_state: valid ? latest.source_state : 'degraded',
      confidence: latest.confidence,
      sources: latest.sources,
      source_health: latest.source_health,
      degraded_sources: latest.degraded_sources,
      field_state_signal: latest.field_state_signal,
      territory: rawString(raw.territory, 'global'),
      time_window: rawString(raw.time_window, 'latest_snapshot'),
      dominant_external_pressures: pressures,
      relevance_to_sfi: rawString(raw.relevance_to_sfi, valid ? `Contexto externo disponible para lectura SFI. Presiones: ${pressures.join(' | ') || 'sin presion dominante derivada'}` : 'WSV degradado; no orienta decision fuerte.'),
      warnings: [
        ...(valid ? [] : ['worldspect_state_degraded: falta fuente, fecha o confianza suficiente']),
        ...(rawPressures.length ? [] : ['dominant_external_pressures_derived_from_sources']),
        ...(latest.degraded_sources.length ? [`degraded_sources:${latest.degraded_sources.join(',')}`] : []),
      ],
    }
  } catch (error) {
    return {
      observed_at: null,
      source_state: 'degraded',
      confidence: 0,
      sources: [],
      source_health: [],
      degraded_sources: [],
      field_state_signal: null,
      territory: 'unknown',
      time_window: 'unknown',
      dominant_external_pressures: [],
      relevance_to_sfi: 'WSV degradado por error de lectura.',
      warnings: [error instanceof Error ? error.message : 'worldspect_state_not_ready'],
    }
  }
}
