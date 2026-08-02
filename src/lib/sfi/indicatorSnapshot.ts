import 'server-only'

import { createServiceSupabaseClient } from '@/runtime/supabase/server'
import { appendEvent } from '@/lib/db/events'
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

function toNumber(value: unknown) {
  const parsed =
    typeof value === 'number'
      ? value
      : Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : 0
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

    await appendEvent({
      event_type:
        'telemetry.signal_ingested',
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
      source:
        'indicator-snapshot',
    })

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

    return {
      captured_at:
        String(row.captured_at),
      ihg:
        toNumber(row.ihg),
      nti:
        toNumber(row.nti),
      ldi:
        toNumber(row.ldi),
      wsv:
        toNumber(row.wsv),
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