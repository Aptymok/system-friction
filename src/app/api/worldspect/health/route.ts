import { NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/runtime/supabase/server'
import { fetchWorldSpectReadBundle } from '@/lib/worldspect/readBundleClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type HealthStatus = 'healthy' | 'degraded' | 'failed'
type TrendQuality = 'missing' | 'thin' | 'usable'

const EXPECTED_MEASUREMENTS_TODAY = 4
const SLOT_HOURS = [0, 6, 12, 18]
const PUBLIC_CDN_CACHE = { 'Vercel-CDN-Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } as const

function minutesSince(value: string | null) {
  if (!value) return null
  const observed = new Date(value).getTime()
  if (!Number.isFinite(observed)) return null
  return Math.max(0, Math.round((Date.now() - observed) / 60000))
}

function currentUtcDate(value = new Date()) {
  return value.toISOString().slice(0, 10)
}

function nextSlotUtc(value = new Date()) {
  const hour = value.getUTCHours()
  const next = SLOT_HOURS.find((slot) => slot > hour) ?? 0
  return String(next).padStart(2, '0') as '00' | '06' | '12' | '18'
}

function expectedMeasurementsSoFar(value = new Date()) {
  const hour = value.getUTCHours()
  return SLOT_HOURS.filter((slot) => slot <= hour).length || 1
}

async function alertTableWarnings() {
  try {
    const service = createServiceSupabaseClient()
    const { error } = await service
      .from('world_vector_alerts')
      .select('id')
      .limit(1)

    if (!error) return []
    const message = error.message || 'world_vector_alerts_read_failed'
    if (/does not exist|schema cache|not find|relation/i.test(message)) {
      return ['world_vector_alerts_table_missing_pending_manual_migration']
    }
    return [`world_vector_alerts_read_warning:${message}`]
  } catch (error) {
    return [error instanceof Error ? `world_vector_alerts_unavailable:${error.message}` : 'world_vector_alerts_unavailable']
  }
}

export async function GET(request: Request) {
  const generatedAt = new Date().toISOString()

  try {
    const bundle = await fetchWorldSpectReadBundle(request, { days: 90, ingestMode: 'all', limit: 120 })
    const continuityRead = bundle.read_plane === 'NEON'
    const latestObservedAt = bundle.observed_to

    const alertWarnings = bundle.read_plane === 'SUPABASE' ? await alertTableWarnings() : []

    if (!latestObservedAt || bundle.sample_count === 0) {
      return NextResponse.json({
        ok: true,
        status: 'failed' satisfies HealthStatus,
        generated_at: generatedAt,
        last_observed_at: null,
        minutes_since_last_measurement: null,
        measurements_today: 0,
        expected_measurements_today: EXPECTED_MEASUREMENTS_TODAY,
        trend_quality: 'missing' satisfies TrendQuality,
        source_coverage: 0,
        active_sources: 0,
        degraded_sources: [],
        empty_snapshots_90d: 0,
        latest_error: 'worldspect_snapshot_missing',
        warnings: ['no_snapshots', ...alertWarnings],
        read_plane: bundle.read_plane,
        continuity_state: continuityRead ? 'DEGRADED_CONTINUITY' : bundle.read_plane === 'UNAVAILABLE' ? 'FAILED' : 'PRIMARY',
        primary_diagnostic: bundle.primary_diagnostic,
        read_cache: bundle.read_cache,
        next_expected_measurement_slot_utc: nextSlotUtc(),
      }, { headers: PUBLIC_CDN_CACHE })
    }

    const today = currentUtcDate()
    const measurementsToday = bundle.health.observed_ats.filter((observedAt) => observedAt.slice(0, 10) === today).length
    const emptySnapshots90d = bundle.health.empty_snapshots
    const minutes = minutesSince(latestObservedAt)
    const activeSources = bundle.health.active_sources
    const sourceCoverage = bundle.health.source_coverage
    const quality = bundle.health.trend_quality
    const warnings: string[] = [...alertWarnings]
    let status: HealthStatus = 'healthy'
    let latestError: string | null = bundle.health.latest_error

    if (minutes === null) {
      status = 'failed'
      latestError = latestError ?? 'latest_snapshot_unreadable'
      warnings.push('latest_snapshot_unreadable')
    }

    if (activeSources === 0) {
      status = 'failed'
      warnings.push('no_active_sources')
    }

    if (minutes !== null && minutes > 1440) {
      status = continuityRead ? 'degraded' : 'failed'
      warnings.push(continuityRead ? 'world_vector_stale_during_primary_restriction' : 'world_vector_silent_over_24h')
    } else if (minutes !== null && minutes > 390 && status !== 'failed') {
      status = 'degraded'
      warnings.push('latest_measurement_stale')
    }

    if (measurementsToday < expectedMeasurementsSoFar() && status !== 'failed') {
      status = 'degraded'
      warnings.push('measurements_today_below_current_utc_slot_expectation')
    }

    if (quality === 'missing') {
      status = 'failed'
      warnings.push('trend_quality_missing')
    } else if (quality === 'thin' && status !== 'failed') {
      status = 'degraded'
      warnings.push('trend_quality_thin')
    }

    if (sourceCoverage < 0.5 && status !== 'failed') {
      status = 'degraded'
      warnings.push('low_active_source_coverage')
    }

    if (bundle.health.degraded_sources.length > 0 && status !== 'failed') {
      status = 'degraded'
      warnings.push('degraded_sources_present')
    }

    if (emptySnapshots90d > Math.max(2, Math.ceil(bundle.sample_count * 0.25)) && status !== 'failed') {
      status = 'degraded'
      warnings.push('high_empty_snapshots_90d')
    }

    return NextResponse.json({
      ok: true,
      status,
      generated_at: generatedAt,
      last_observed_at: latestObservedAt,
      minutes_since_last_measurement: minutes,
      measurements_today: measurementsToday,
      expected_measurements_today: EXPECTED_MEASUREMENTS_TODAY,
      trend_quality: quality,
      source_coverage: sourceCoverage,
      active_sources: activeSources,
      degraded_sources: bundle.health.degraded_sources,
      empty_snapshots_90d: emptySnapshots90d,
      latest_error: latestError,
      warnings,
      read_plane: bundle.read_plane,
      continuity_state: continuityRead ? 'DEGRADED_CONTINUITY' : 'PRIMARY',
      primary_diagnostic: bundle.primary_diagnostic,
      read_cache: bundle.read_cache,
      next_expected_measurement_slot_utc: nextSlotUtc(),
    }, { headers: PUBLIC_CDN_CACHE })
  } catch (error) {
    return NextResponse.json({
      ok: true,
      status: 'failed' satisfies HealthStatus,
      generated_at: generatedAt,
      last_observed_at: null,
      minutes_since_last_measurement: null,
      measurements_today: 0,
      expected_measurements_today: EXPECTED_MEASUREMENTS_TODAY,
      trend_quality: 'missing' satisfies TrendQuality,
      source_coverage: 0,
      active_sources: 0,
      degraded_sources: [],
      empty_snapshots_90d: 0,
      latest_error: error instanceof Error ? error.message : 'worldspect_health_failed',
      warnings: ['persistence_read_exception'],
      read_plane: 'UNAVAILABLE',
      continuity_state: 'FAILED',
      primary_diagnostic: null,
      next_expected_measurement_slot_utc: nextSlotUtc(),
    }, { headers: PUBLIC_CDN_CACHE })
  }
}
