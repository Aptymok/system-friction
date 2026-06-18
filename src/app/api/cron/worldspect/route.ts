import { NextResponse } from 'next/server'
import { runWorldSpectAdapters } from '@/lib/worldspect/runAdapters'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await runWorldSpectAdapters('daily_cron')

  return NextResponse.json({
    ok: result.ok,
    mode: 'adapter_measurement',
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

export async function POST() {
  return GET()
}