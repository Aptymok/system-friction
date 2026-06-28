import { NextRequest, NextResponse } from 'next/server'
import { runWorldSpectAdapters } from '@/lib/worldspect/runAdapters'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CronIngestMode = 'daily_cron' | 'manual' | 'diagnostic' | 'fallback_runtime'

function cronSecret() {
  return process.env.WORLDSPECT_CRON_SECRET
    || process.env.WORLDSPECT_INGEST_SECRET
    || process.env.CRON_SECRET
    || ''
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? ''
}

function authorizeCron(request: NextRequest) {
  const secret = cronSecret()
  const token = bearerToken(request)
  const production = process.env.NODE_ENV === 'production'

  if (!secret && production) {
    return {
      ok: false as const,
      response: NextResponse.json({
        ok: false,
        error: 'worldspect_cron_secret_missing',
        message: 'WORLDSPECT_CRON_SECRET, WORLDSPECT_INGEST_SECRET or CRON_SECRET must be configured in production.',
      }, { status: 503 }),
    }
  }

  if (!secret && !production) {
    return {
      ok: true as const,
      warnings: ['worldspect_cron_secret_missing_local_dev_allowed'],
    }
  }

  if (!token || token !== secret) {
    return {
      ok: false as const,
      response: NextResponse.json({
        ok: false,
        error: 'unauthorized_worldspect_cron',
      }, { status: 401 }),
    }
  }

  return { ok: true as const, warnings: [] }
}

function ingestModeFromRequest(request: NextRequest): CronIngestMode {
  const header = request.headers.get('X-SFI-Ingest-Mode')?.trim()
  if (header === 'daily_cron' || header === 'manual' || header === 'diagnostic' || header === 'fallback_runtime') return header

  const url = new URL(request.url)
  const query = url.searchParams.get('ingest_mode')?.trim()
  if (query === 'daily_cron' || query === 'manual' || query === 'diagnostic' || query === 'fallback_runtime') return query

  return 'daily_cron'
}

export async function GET(request: NextRequest) {
  const auth = authorizeCron(request)
  if (!auth.ok) return auth.response

  const ingestMode = ingestModeFromRequest(request)
  const result = await runWorldSpectAdapters(ingestMode)

  return NextResponse.json({
    ok: result.ok,
    mode: 'adapter_measurement',
    ingestMode,
    message: result.ok
      ? 'WorldSpect global snapshot medido y persistido.'
      : 'WorldSpect global snapshot medido con persistencia degradada.',
    snapshot: result.snapshot,
    sourceHealth: result.sourceHealth,
    degraded_sources: result.degraded_sources,
    writesPerformed: result.persistence.ok,
    persistence: result.persistence,
    warnings: auth.warnings,
  })
}

export async function POST(request: NextRequest) {
  return GET(request)
}
