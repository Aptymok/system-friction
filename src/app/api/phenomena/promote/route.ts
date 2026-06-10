import { NextResponse } from 'next/server'
import { promotePhenomenonCandidate, type PhenomenonCandidateInput } from '@/lib/phenomena/phenomenon-engine'

export const dynamic = 'force-dynamic'

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

export async function POST(request: Request) {
  const body = record(await request.json().catch(() => ({})))
  const now = new Date().toISOString()
  const candidate: PhenomenonCandidateInput = {
    module: str(body.module, 'sfi'),
    label: str(body.label, 'unnamed phenomenon'),
    evidenceIds: stringArray(body.evidenceIds),
    attractorKeys: stringArray(body.attractorKeys),
    ejectorKeys: stringArray(body.ejectorKeys),
    firstSeen: str(body.firstSeen, now),
    lastSeen: str(body.lastSeen, now),
    density: num(body.density),
    trust: num(body.trust),
    persistence: num(body.persistence),
    velocity: num(body.velocity),
  }
  const result = await promotePhenomenonCandidate(candidate)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
