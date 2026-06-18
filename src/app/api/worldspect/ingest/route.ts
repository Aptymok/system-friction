import { NextResponse } from 'next/server'
import type { SourceObservation } from '@/lib/worldspect/source-adapter-contract'
import { buildCulturalSourceObservation } from '@/lib/worldspect/cultural-vector'
import { persistWorldSpectObservations, runWorldSpectAdapters } from '@/lib/worldspect/runAdapters'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}

function manualCulturalObservation(body: Record<string, unknown>): SourceObservation[] {
  const observations: SourceObservation[] = []

  if (body.cultural && typeof body.cultural === 'object') {
    const cultural = record(body.cultural)
    observations.push(buildCulturalSourceObservation({
      sourceId: typeof cultural.sourceId === 'string' ? cultural.sourceId : 'manual_cultural_ingest',
      evidenceCount: Math.max(0, Math.floor(num(cultural.evidenceCount))),
      trust: num(cultural.trust),
      semanticDensity: num(cultural.semanticDensity),
      affect: num(cultural.affect),
      recurrence: num(cultural.recurrence),
      novelty: num(cultural.novelty),
    }))
  }

  return observations
}

export async function POST(request: Request) {
  const body = record(await request.json().catch(() => ({})))
  const observations = manualCulturalObservation(body)
  const includePublicAdapters = body.includePublicAdapters !== false

  if (observations.length === 0 && includePublicAdapters) {
    const result = await runWorldSpectAdapters('manual')
    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      snapshot: result.snapshot,
      sourceHealth: result.sourceHealth,
      persistence: result.persistence,
      degraded_sources: result.degraded_sources,
    })
  }

  const result = await persistWorldSpectObservations(observations, 'manual', {
    manual_ingest: true,
    includePublicAdapters,
  })

  return NextResponse.json({
    ok: result.ok,
    status: result.status,
    snapshot: result.snapshot,
    sourceHealth: result.sourceHealth,
    persistence: result.persistence,
    degraded_sources: result.degraded_sources,
  })
}