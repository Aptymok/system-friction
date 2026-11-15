import 'server-only'

import { createServiceSupabaseClient } from '@/runtime/supabase/server'
import { emitEpistemicEvent } from '@/core/memory/epistemicEventWriter'
import { deriveCoreIndicators } from './coreIndicators'
import type { SfiWorldInterfaceState } from './worldInterfaceState'
import type { WorldVectorDomainValue } from '@/lib/world-vector/types'

export type SfiIndicatorSnapshotRow = {
  captured_at: string
  ihg: number
  nti: number
  ldi: number
  wsv: number
  domain_breakdown: WorldVectorDomainValue[]
  source_status:
    | 'observed'
    | 'thin'
    | 'degraded'
    | 'failed'
}

const TOLERANCE_HOURS = 4

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed =
    typeof value === 'number'
      ? value
      : Number(value)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : null
}

function resolveSourceStatus(
  warnings: string[],
): SfiIndicatorSnapshotRow['source_status'] {
  if (
    warnings.some((warning) =>
      warning.includes('failed'),
    )
  ) {
    return 'failed'
  }

  if (warnings.length > 2) {
    return 'degraded'
  }

  if (warnings.length > 0) {
    return 'thin'
  }

  return 'observed'
}

export async function persistIndicatorSnapshot(
  state: SfiWorldInterfaceState,
  domainBreakdown: WorldVectorDomainValue[],
): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  try {
    const {
      ihg,
      nti,
      ldi,
      wsv,
    } = deriveCoreIndicators(state)

    const sourceStatus =
      resolveSourceStatus(
        state.warnings,
      )

    const supabase =
      createServiceSupabaseClient()

    const { error } =
      await supabase
        .from('sfi_indicator_snapshots')
        .insert({
          captured_at:
            state.generatedAt,
          ihg,
          nti,
          ldi,
          wsv,
          domain_breakdown:
            domainBreakdown,
          source_status:
            sourceStatus,
          warnings:
            state.warnings,
        })

    if (error) {
      return {
        ok: false,
        error: error.message,
      }
    }

    await emitEpistemicEvent({
      eventName: 'telemetry.signal_ingested',
      logbookId: 'SFI:INDICATOR_SNAPSHOT',
      epistemicClass: 'derived',
      schemaVersion: '2026-09-22.system-telemetry.v1',
      sourceId: state.generatedAt,
      sourceType: 'SFI_INDICATOR_SNAPSHOT',
      actorId: null,
      nodeId: null,
      confidence:
        sourceStatus === 'observed'
          ? 0.9
          : sourceStatus === 'thin'
            ? 0.7
            : sourceStatus === 'degraded'
              ? 0.5
              : 0.2,
      payload: {
        type:
          'indicator_snapshot',
        captured_at:
          state.generatedAt,
        source_status:
          sourceStatus,
        ihg,
        nti,
        ldi,
        wsv,
      },
    }).catch(() => null)

    return {
      ok: true,
    }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'unknown_persist_error',
    }
  }
}

export async function readSnapshotNear24hAgo(): Promise<
  SfiIndicatorSnapshotRow | null
> {
  try {
    const supabase =
      createServiceSupabaseClient()

    const target =
      Date.now() -
      24 * 60 * 60 * 1000

    const lowerBound =
      new Date(
        target -
          TOLERANCE_HOURS *
            60 *
            60 *
            1000,
      ).toISOString()

    const upperBound =
      new Date(
        target +
          TOLERANCE_HOURS *
            60 *
            60 *
            1000,
      ).toISOString()

    const {
      data,
      error,
    } = await supabase
      .from('sfi_indicator_snapshots')
      .select(
        'captured_at,ihg,nti,ldi,wsv,domain_breakdown,source_status',
      )
      .gte(
        'captured_at',
        lowerBound,
      )
      .lte(
        'captured_at',
        upperBound,
      )
      .order(
        'captured_at',
        {
          ascending: true,
        },
      )
      .limit(1)

    if (
      error ||
      !data ||
      data.length === 0
    ) {
      return null
    }

    const row =
      data[0] as Record<
        string,
        unknown
      >

    // Historical failed acquisitions must never become comparison baselines:
    // no fake 24-hour delta and no missing numeric value coerced to zero.
    const sourceStatus = row.source_status
    if (sourceStatus !== 'observed' && sourceStatus !== 'thin') return null
    const ihg = toNumber(row.ihg)
    const nti = toNumber(row.nti)
    const ldi = toNumber(row.ldi)
    const wsv = toNumber(row.wsv)
    if (ihg === null || nti === null || ldi === null || wsv === null) return null

    return {
      captured_at:
        String(row.captured_at),
      ihg:
        ihg,
      nti:
        nti,
      ldi:
        ldi,
      wsv:
        wsv,
      domain_breakdown:
        Array.isArray(
          row.domain_breakdown,
        )
          ? (row.domain_breakdown as WorldVectorDomainValue[])
          : [],
      source_status:
        (row.source_status as SfiIndicatorSnapshotRow['source_status']) ??
        'thin',
    }
  } catch {
    return null
  }
}