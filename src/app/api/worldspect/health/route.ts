import { NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/runtime/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type HealthStatus = 'healthy' | 'degraded' | 'failed'
type TrendQuality = 'missing' | 'thin' | 'usable'
type HealthSnapshotRow = {
  observed_at: string
  sources: unknown[]
  degraded_sources: string[]
  adapter_error: string | null
}

const EXPECTED_MEASUREMENTS_TODAY = 4
const SLOT_HOURS = [0, 6, 12, 18]

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

function trendQuality(sampleCount: number): TrendQuality {
  if (sampleCount === 0) return 'missing'
  if (sampleCount < 3) return 'thin'
  return 'usable'
}

function activeSourceCount(sources: unknown[]) {
  return sources.filter((source) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return false
    const record = source as Record<string, unknown>
    const status = String(record.status ?? record.sourceState ?? record.state ?? '').toLowerCase()
    return status === '' || status === 'active' || status === 'observed' || status === 'healthy'
  }).length
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

async function readHealthSnapshots() {
  const service = createServiceSupabaseClient()
  const observedSince = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await service
    .from('worldspect_snapshots')
    .select('observed_at,sources,degraded_sources,adapter_error')
    .gte('observed_at', observedSince)
    .order('observed_at', { ascending: true })
    .limit(120)

  if (error) throw error

  return Array.isArray(data)
    ? data
      .map((row) => {
        const record = row as Record<string, unknown>
        return {
          observed_at: typeof record.observed_at === 'string' ? record.observed_at : '',
          sources: Array.isArray(record.sources) ? record.sources : [],
          degraded_sources: Array.isArray(record.degraded_sources)
            ? record.degraded_sources.filter((source): source is string => typeof source === 'string')
            : [],
          adapter_error: typeof record.adapter_error === 'string' ? record.adapter_error : null,
        } satisfies HealthSnapshotRow
      })
      .filter((row) => row.observed_at)
    : []
}

export async function GET() {
  const generatedAt = new Date().toISOString()

  try {
    const recent90d = await readHealthSnapshots()
    const latest = recent90d[recent90d.length - 1] ?? null

    const alertWarnings = await alertTableWarnings()

    if (!latest || recent90d.length === 0) {
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
        next_expected_measurement_slot_utc: nextSlotUtc(),
      })
    }

    const today = currentUtcDate()
    const measurementsToday = recent90d.filter((snapshot) => snapshot.observed_at.slice(0, 10) === today).length
    const emptySnapshots90d = recent90d.filter((snapshot) => snapshot.sources.length === 0).length
    const minutes = minutesSince(latest.observed_at)
    const activeSources = activeSourceCount(latest.sources)
    const sourceCoverage = latest.sources.length > 0
      ? Number((activeSources / latest.sources.length).toFixed(4))
      : 0
    const quality = trendQuality(recent90d.length)
    const warnings: string[] = [...alertWarnings]
    let status: HealthStatus = 'healthy'
    let latestError: string | null = latest.adapter_error ?? null

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
      status = 'failed'
      warnings.push('world_vector_silent_over_24h')
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

    if (latest.degraded_sources.length > 0 && status !== 'failed') {
      status = 'degraded'
      warnings.push('degraded_sources_present')
    }

    if (emptySnapshots90d > Math.max(2, Math.ceil(recent90d.length * 0.25)) && status !== 'failed') {
      status = 'degraded'
      warnings.push('high_empty_snapshots_90d')
    }

    return NextResponse.json({
      ok: true,
      status,
      generated_at: generatedAt,
      last_observed_at: latest.observed_at,
      minutes_since_last_measurement: minutes,
      measurements_today: measurementsToday,
      expected_measurements_today: EXPECTED_MEASUREMENTS_TODAY,
      trend_quality: quality,
      source_coverage: sourceCoverage,
      active_sources: activeSources,
      degraded_sources: latest.degraded_sources,
      empty_snapshots_90d: emptySnapshots90d,
      latest_error: latestError,
      warnings,
      next_expected_measurement_slot_utc: nextSlotUtc(),
    })
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
      next_expected_measurement_slot_utc: nextSlotUtc(),
    })
  }
}
