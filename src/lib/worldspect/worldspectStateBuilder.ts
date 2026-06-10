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

function rawString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
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
      dominant_external_pressures: Array.isArray(raw.dominant_external_pressures)
        ? raw.dominant_external_pressures.filter((item): item is string => typeof item === 'string')
        : [],
      relevance_to_sfi: rawString(raw.relevance_to_sfi, valid ? 'Contexto externo disponible para lectura SFI.' : 'WSV degradado; no orienta decision fuerte.'),
      warnings: valid ? [] : ['worldspect_state_degraded: falta fuente, fecha o confianza suficiente'],
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
