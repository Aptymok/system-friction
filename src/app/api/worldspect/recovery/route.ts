import { NextResponse, type NextRequest } from 'next/server'
import { createServiceSupabaseClient } from '@/runtime/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RecoveryState = 'found' | 'missing' | 'failed'

function dateParam(request: NextRequest) {
  const value = request.nextUrl.searchParams.get('date')?.trim()
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return value
}

function dayRange(date: string) {
  return {
    start: `${date}T00:00:00+00:00`,
    end: `${date}T23:59:59.999+00:00`,
  }
}

function normalizeDate(value: string | null) {
  if (value) return value
  return new Date().toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  const generatedAt = new Date().toISOString()
  const requestedDate = normalizeDate(dateParam(request))
  const limitParam = Number(request.nextUrl.searchParams.get('limit') ?? 20)
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(100, Math.trunc(limitParam))) : 20
  const latest = request.nextUrl.searchParams.get('latest') === 'true'

  try {
    const service = createServiceSupabaseClient()

    if (latest) {
      const { data, error } = await service
        .from('worldspect_snapshots')
        .select('*')
        .order('observed_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return NextResponse.json({
        ok: true,
        state: Array.isArray(data) && data.length > 0 ? 'found' as RecoveryState : 'missing' as RecoveryState,
        mode: 'latest',
        generated_at: generatedAt,
        count: Array.isArray(data) ? data.length : 0,
        snapshots: Array.isArray(data) ? data : [],
      })
    }

    const { start, end } = dayRange(requestedDate)
    const { data, error } = await service
      .from('worldspect_snapshots')
      .select('*')
      .gte('observed_at', start)
      .lte('observed_at', end)
      .order('observed_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({
      ok: true,
      state: Array.isArray(data) && data.length > 0 ? 'found' as RecoveryState : 'missing' as RecoveryState,
      mode: 'date',
      date: requestedDate,
      range: { start, end },
      generated_at: generatedAt,
      count: Array.isArray(data) ? data.length : 0,
      snapshots: Array.isArray(data) ? data : [],
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      state: 'failed' as RecoveryState,
      mode: latest ? 'latest' : 'date',
      date: latest ? null : requestedDate,
      generated_at: generatedAt,
      error: error instanceof Error ? error.message : 'worldspect_recovery_failed',
      snapshots: [],
    }, { status: 200 })
  }
}
