import { NextRequest, NextResponse } from 'next/server'
import { runWorldSpectAdapters } from '@/lib/worldspect/runAdapters'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CronIngestMode = 'daily_cron' | 'manual' | 'diagnostic' | 'fallback_runtime'

function ingestModeFromRequest(request: NextRequest): CronIngestMode {
  const header = request.headers.get('X-SFI-Ingest-Mode')?.trim()
  if (header === 'daily_cron' || header === 'manual' || header === 'diagnostic' || header === 'fallback_runtime') return header

  const url = new URL(request.url)
  const query = url.searchParams.get('ingest_mode')?.trim()
  if (query === 'daily_cron' || query === 'manual' || query === 'diagnostic' || query === 'fallback_runtime') return query

  return 'daily_cron'
}

export async function GET(request: NextRequest) {
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
  })
}

export async function POST(request: NextRequest) {
  return GET(request)
}
