import { NextResponse } from 'next/server'
import type { SourceObservation } from '@/lib/worldspect/source-adapter-contract'
import { aggregateWorldSpect } from '@/lib/worldspect/vector-aggregator'
import { buildCulturalSourceObservation } from '@/lib/worldspect/cultural-vector'

export const dynamic = 'force-dynamic'

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function POST(request: Request) {
  const body = record(await request.json().catch(() => ({})))
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

  const snapshot = aggregateWorldSpect(observations)
  return NextResponse.json({ ok: true, status: snapshot.status, snapshot })
}
